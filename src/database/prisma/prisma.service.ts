import { Injectable } from "@nestjs/common";
import { PrismaClient } from "generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AppConfigService } from "src/config/config.service";
@Injectable()
export class PrismaService extends PrismaClient {
  constructor(configService: AppConfigService) {
    const databaseUrl = configService.databaseUrl;
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    console.log("[🐛] Connected to the database");
    super({ adapter });
  }
}
