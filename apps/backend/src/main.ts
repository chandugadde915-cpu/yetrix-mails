import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { json, type NextFunction, type Request, type Response, urlencoded } from "express";
import { ApiResponseInterceptor } from "./common/api-response.interceptor";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigin =
    config.get<string>("CORS_ORIGIN") ??
    config.get<string>("APP_BASE_URL") ??
    "http://localhost:3000";

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.use(json({ limit: "25mb" }));
  app.use(urlencoded({ extended: true, limit: "25mb" }));
  app.use(createRateLimiter(config));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
}

void bootstrap();

function createRateLimiter(config: ConfigService) {
  const windowMs = config.get<number>("RATE_LIMIT_WINDOW_MS", 60_000);
  const maxRequests = config.get<number>("RATE_LIMIT_PER_WINDOW", 240);
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health") {
      next();
      return;
    }

    const now = Date.now();
    const forwarded = String(req.headers["x-forwarded-for"] ?? "");
    const ip = forwarded.split(",")[0]?.trim() || req.ip || "unknown";
    const key = `${ip}:${req.path.split("/").slice(0, 3).join("/")}`;
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: "Too many requests. Please wait a moment and try again.",
      });
      return;
    }

    if (buckets.size > 5000) {
      for (const [bucketKey, value] of buckets.entries()) {
        if (value.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
