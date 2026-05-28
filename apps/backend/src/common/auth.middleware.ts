import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { AuthService } from "../modules/auth/auth.service";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    userId?: string;
    workspaceId?: string;
    role: "superadmin" | "owner" | "admin" | "support" | "viewer" | string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    req.user = this.authService.verifyToken(token);
    next();
  }
}
