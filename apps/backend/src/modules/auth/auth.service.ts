import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { hashPassword, verifyPassword } from "../../common/password";
import { DatabaseService } from "../database/database.service";
import { SignupDto } from "./dto/signup.dto";

interface TokenPayload {
  sub: string;
  userId?: string;
  workspaceId?: string;
  role: string;
  exp: number;
}

interface UserRow {
  id: string;
  workspace_id: string;
  username: string | null;
  email: string;
  name: string | null;
  password_hash: string;
  role: string;
  status: string;
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
      const result = await this.database.query<UserRow>(
        `
          SELECT id, workspace_id, username, email, name, password_hash, role, status
          FROM users
          WHERE lower(email) = $1 OR lower(username) = $1
          LIMIT 1
        `,
        [normalized],
      );
      const user = result.rows[0];

      if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
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
      throw new ServiceUnavailableException("DATABASE_URL must be configured for signup");
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.database.query("SELECT id FROM users WHERE lower(email) = $1", [
      email,
    ]);
    if (existing.rowCount) {
      throw new ConflictException("A user with this email already exists");
    }

    const workspace = await this.database.query<{ id: string }>(
      "INSERT INTO workspaces(name, status) VALUES ($1, 'pending') RETURNING id",
      [input.workspaceName.trim()],
    );
    const user = await this.database.query<UserRow>(
      `
        INSERT INTO users(workspace_id, username, email, name, password_hash, role)
        VALUES ($1, $2, $3, $4, $5, 'owner')
        RETURNING id, workspace_id, username, email, name, password_hash, role, status
      `,
      [
        workspace.rows[0].id,
        email.split("@")[0],
        email,
        input.name.trim(),
        hashPassword(input.password),
      ],
    );

    return this.createSession(user.rows[0]);
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
    const workspace = await this.database.query<{ id: string }>(
      `
        INSERT INTO workspaces(name)
        SELECT $1
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = $2 OR lower(username) = $3)
        RETURNING id
      `,
      [workspaceName, email, username],
    );
    const existing = await this.database.query<{ workspace_id: string }>(
      "SELECT workspace_id FROM users WHERE lower(email) = $1 OR lower(username) = $2 LIMIT 1",
      [email, username],
    );
    const workspaceId = existing.rows[0]?.workspace_id ?? workspace.rows[0]?.id;

    if (existing.rowCount) {
      await this.database.query(
        `
          UPDATE users
          SET role = $3, status = 'active', updated_at = now()
          WHERE lower(email) = $1 OR lower(username) = $2
        `,
        [email, username, bootstrapRole],
      );
      return;
    }

    if (!workspaceId) return;

    await this.database.query(
      `
        INSERT INTO users(workspace_id, username, email, name, password_hash, role)
        VALUES ($1, $2, $3, 'Admin', $4, $5)
      `,
      [workspaceId, username, email, hashPassword(this.password), bootstrapRole],
    );

    await this.database.query(
      `
        INSERT INTO domains(workspace_id, domain, status)
        VALUES ($1, $2, 'pending_dns')
        ON CONFLICT (domain) DO NOTHING
      `,
      [workspaceId, mailDomain],
    );
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
