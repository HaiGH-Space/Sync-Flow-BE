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
    return parseCorsOrigins(this.configService.get<string>("CORS_ORIGIN"));
  }

  get isProduction() {
    return this.configService.get<string>("NODE_ENV") === "production";
  }

  get defaultInviteExpiresInDays() {
    return this.getNumber("DEFAULT_INVITE_EXPIRES_IN_DAYS", 7);
  }

  get mail() {
    return {
      host: this.configService.get<string>("MAIL_HOST") ?? "",
      port: this.getNumber("MAIL_PORT", 587),
      user: this.configService.get<string>("MAIL_USER") ?? "",
      pass: this.configService.get<string>("MAIL_PASS") ?? "",
    };
  }

  private getNumber(key: string, fallback: number) {
    return parseNumber(this.configService.get<unknown>(key), fallback);
  }
}
