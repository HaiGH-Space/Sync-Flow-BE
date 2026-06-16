import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AppConfigService } from "src/config/config.service";

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: AppConfigService) {
    const databaseUrl = configService.databaseUrl;
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    super({ adapter });
    this.logger.log("[🐛] Connected to the database");
  }
}
