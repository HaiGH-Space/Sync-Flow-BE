import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";
import { AppConfigService } from "src/config/config.service";
import { Logger } from "@nestjs/common";

jest.mock("generated/prisma/client", () => {
  return {
    PrismaClient: class {
      constructor() {}
    },
  };
});

jest.mock("@prisma/adapter-pg", () => {
  return {
    PrismaPg: class {
      constructor() {}
    },
  };
});

describe("PrismaService", () => {
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should log connection message on instantiation", async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: AppConfigService,
          useValue: { databaseUrl: "postgresql://localhost:5432" },
        },
      ],
    }).compile();

    module.get<PrismaService>(PrismaService);
    expect(loggerLogSpy).toHaveBeenCalledWith("[🐛] Connected to the database");
  });
});
