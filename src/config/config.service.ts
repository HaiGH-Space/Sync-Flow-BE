import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseCorsOrigins, parseNumber } from "./env";

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port() {
    return this.getNumber("PORT", 8000);
  }

  get databaseUrl() {
    return this.configService.getOrThrow<string>("DATABASE_URL");
  }

  get frontendUrl() {
    return this.configService.get<string>("FRONTEND_URL") ?? "";
  }

  get corsOrigins() {
    const origins = parseCorsOrigins(this.configService.get<string>("CORS_ORIGIN"));
    if (this.isProduction) {
      if (origins === "*") {
        throw new Error(
          "CORS_ORIGIN environment variable is required and cannot be '*' in production when credentials are enabled"
        );
      }
      if (Array.isArray(origins) && origins.includes("*")) {
        throw new Error(
          "CORS_ORIGIN environment variable cannot contain '*' in production when credentials are enabled"
        );
      }
    }
    return origins;
  }

  get isProduction() {
    return this.configService.get<string>("NODE_ENV") === "production";
  }

  get defaultInviteExpiresInDays() {
    return this.getNumber("DEFAULT_INVITE_EXPIRES_IN_DAYS", 7);
  }

  get sessionTtlDays() {
    return this.getNumber("SESSION_TTL_DAYS", 7);
  }

  get jwtSecret() {
    const secret = this.configService.get<string>("JWT_SECRET");
    if (this.isProduction && !secret) {
      throw new Error("JWT_SECRET is required in production mode");
    }
    return secret ?? "dev-secret-key-change-me-in-prod-very-long-and-secure";
  }

  get redisUrl() {
    return this.configService.get<string>("REDIS_URL") ?? "redis://127.0.0.1:6379";
  }

  get mail() {
    return {
      host: this.configService.get<string>("MAIL_HOST") ?? "",
      port: this.getNumber("MAIL_PORT", 587),
      user: this.configService.get<string>("MAIL_USER") ?? "",
      pass: this.configService.get<string>("MAIL_PASS") ?? "",
    };
  }

  get sessionCleanupCron() {
    return this.configService.get<string>("SESSION_CLEANUP_CRON") ?? "0 */2 * * *";
  }

  get cloudinaryFolder() {
    return this.configService.get<string>("CLOUDINARY_FOLDER") ?? "nestjs_uploads";
  }

  get livekitApiKey() {
    const key = this.configService.get<string>("LIVEKIT_API_KEY");
    if (this.isProduction && !key) {
      throw new Error("LIVEKIT_API_KEY is required in production mode");
    }
    return key ?? "devkey";
  }

  get livekitApiSecret() {
    const secret = this.configService.get<string>("LIVEKIT_API_SECRET");
    if (this.isProduction && !secret) {
      throw new Error("LIVEKIT_API_SECRET is required in production mode");
    }
    return secret ?? "secret";
  }

  get livekitUrl() {
    return this.configService.get<string>("LIVEKIT_URL") ?? "http://localhost:7880";
  }

  get livekitWsUrl() {
    return this.configService.get<string>("LIVEKIT_WS_URL") ?? "ws://localhost:7880";
  }

  get livekitTokenTtl() {
    return this.configService.get<string>("LIVEKIT_TOKEN_TTL") ?? "2h";
  }

  private getNumber(key: string, fallback: number) {
    return parseNumber(this.configService.get<unknown>(key), fallback);
  }
}
