import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
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
