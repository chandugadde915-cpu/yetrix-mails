import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";

interface TokenPayload {
  sub: string;
  role: string;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly username?: string;
  private readonly password?: string;
  private readonly secret?: string;

  constructor(config: ConfigService) {
    this.username = config.get<string>("ADMIN_USERNAME");
    this.password = config.get<string>("ADMIN_PASSWORD");
    this.secret = config.get<string>("AUTH_SECRET");
  }

  login(username: string, password: string) {
    if (!this.username || !this.password || !this.secret) {
      throw new ServiceUnavailableException(
        "ADMIN_USERNAME, ADMIN_PASSWORD, and AUTH_SECRET must be configured",
      );
    }

    if (!this.safeEqual(username, this.username) || !this.safeEqual(password, this.password)) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
    return {
      token: this.sign({ sub: username, role: "admin", exp: expiresAt }),
      expiresAt,
      user: {
        username,
        role: "admin",
      },
    };
  }

  verifyToken(token: string) {
    if (!this.secret) {
      throw new ServiceUnavailableException("AUTH_SECRET must be configured");
    }

    const [payloadPart, signature] = token.split(".");
    if (!payloadPart || !signature) {
      throw new UnauthorizedException("Invalid token");
    }

    const expected = this.signature(payloadPart);
    if (!this.safeEqual(signature, expected)) {
      throw new UnauthorizedException("Invalid token signature");
    }

    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as TokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Token expired");
    }

    return {
      sub: payload.sub,
      role: payload.role,
    };
  }

  private sign(payload: TokenPayload) {
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${payloadPart}.${this.signature(payloadPart)}`;
  }

  private signature(payloadPart: string) {
    return createHmac("sha256", this.secret!).update(payloadPart).digest("base64url");
  }

  private safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
