import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { hashPassword, verifyPassword } from "../../common/password";
import { DatabaseService, UserRow } from "../database/database.service";
import { SignupDto } from "./dto/signup.dto";

interface TokenPayload {
  sub: string;
  userId?: string;
  workspaceId?: string;
  role: string;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly username?: string;
  private readonly password?: string;
  private readonly secret?: string;

  private bootstrapPromise?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {
    this.username = config.get<string>("ADMIN_USERNAME");
    this.password = config.get<string>("ADMIN_PASSWORD");
    this.secret = config.get<string>("AUTH_SECRET");
  }

  async login(username: string, password: string) {
    if (!this.username || !this.password || !this.secret) {
      throw new ServiceUnavailableException(
        "ADMIN_USERNAME, ADMIN_PASSWORD, and AUTH_SECRET must be configured",
      );
    }

    if (this.database.enabled) {
      await this.ensureBootstrapUser();
      const normalized = username.trim().toLowerCase();
      const user = await this.database.findUserByLogin(normalized);

      if (!user || user.status !== "active" || !user.password_hash || !verifyPassword(password, user.password_hash)) {
        throw new UnauthorizedException("Invalid username or password");
      }

      return this.createSession(user);
    }

    if (!this.safeEqual(username, this.username) || !this.safeEqual(password, this.password)) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
    return {
      token: this.sign({ sub: username, role: "superadmin", exp: expiresAt }),
      expiresAt,
      user: {
        username,
        role: "superadmin",
      },
    };
  }

  async signup(input: SignupDto) {
    if (!this.secret) {
      throw new ServiceUnavailableException("AUTH_SECRET must be configured");
    }

    if (!this.database.enabled) {
      throw new ServiceUnavailableException("MONGODB_URI must be configured for signup");
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.database.findUserByEmail(email);
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const workspace = await this.database.createWorkspace(input.workspaceName.trim(), "pending");
    const user = await this.database.createUser({
      workspaceId: workspace.id,
      username: email.split("@")[0],
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: "admin",
    });

    return this.createSession(user);
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
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      role: payload.role,
    };
  }

  private createSession(user: UserRow) {
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
    return {
      token: this.sign({
        sub: user.email,
        userId: user.id,
        workspaceId: user.workspace_id,
        role: user.role,
        exp: expiresAt,
      }),
      expiresAt,
      user: {
        id: user.id,
        username: user.username ?? user.email,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspace_id,
      },
    };
  }

  private ensureBootstrapUser() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapUser();
    }

    return this.bootstrapPromise;
  }

  private async bootstrapUser() {
    if (!this.database.enabled || !this.username || !this.password) return;

    const mailDomain = this.configDomain();
    const username = this.username.trim().toLowerCase();
    const email = username.includes("@") ? username : `${username}@${mailDomain}`;
    const workspaceName = this.config.get<string>("BOOTSTRAP_WORKSPACE_NAME", "Yetrix Mails");
    const bootstrapRole = this.config.get<string>("BOOTSTRAP_ADMIN_ROLE", "superadmin");
    const existing = await this.database.findUserByLogin(email) ?? await this.database.findUserByLogin(username);
    const workspace = existing?.workspace_id
      ? null
      : await this.database.createWorkspace(workspaceName, "active");
    const workspaceId = existing?.workspace_id ?? workspace?.id;

    if (existing) {
      await this.database.updateUser(existing.id, { role: bootstrapRole, status: "active" });
      return;
    }

    if (!workspaceId) return;

    await this.database.createUser({
      workspaceId,
      username,
      email,
      name: "Admin",
      passwordHash: hashPassword(this.password),
      role: bootstrapRole,
    });

    await this.database.recordDomain(workspaceId, mailDomain, "pending_dns");
  }

  private configDomain() {
    return this.config.get<string>("MAIL_DOMAIN", "yetrixtechnologies.com");
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
