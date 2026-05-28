import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class AuthPlaceholderMiddleware implements NestMiddleware {
  use(req: Request & { user?: { role: string } }, _res: Response, next: NextFunction) {
    req.user = { role: "admin-placeholder" };
    next();
  }
}
