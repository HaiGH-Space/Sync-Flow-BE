import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { MailerService } from "@nestjs-modules/mailer/dist/mailer.service";
import { AppConfigService } from "src/config/config.service";
import { Logger } from "@nestjs/common";

describe("AuthService Logging", () => {
  let service: AuthService;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    verification: {
      create: jest.fn(),
    },
    account: {
      create: jest.fn(),
    },
    session: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockConfigService = {
    frontendUrl: "http://localhost:3000",
  };

  beforeEach(async () => {
    loggerDebugSpy = jest.spyOn(Logger.prototype, "debug").mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("should log the verification link as debug log on registration success", async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        return await callback(mockPrismaService);
      },
    );
    mockPrismaService.user.create = jest.fn().mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });

    await service.register({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    expect(loggerDebugSpy).toHaveBeenCalledWith(
      expect.stringContaining("Verification Link: http://localhost:3000/verify-email?token=")
    );

    expect(mockMailerService.sendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Welcome to SyncFlow! Verify your Email",
      template: "welcome-email",
      context: {
        name: "Test User",
        verificationLink: expect.stringContaining("http://localhost:3000/verify-email?token=") as unknown as string,
      },
    });
  });

  it("should log errors when registration fails", async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        return await callback(mockPrismaService);
      },
    );
    mockPrismaService.user.create = jest.fn().mockRejectedValue(new Error("DB error"));

    await expect(
      service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
    ).rejects.toThrow();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Register Error:",
      expect.stringContaining("DB error")
    );
  });

  it("should log errors when session deletion on logout fails", async () => {
    mockPrismaService.session.deleteMany.mockRejectedValue(new Error("Delete session error"));

    await expect(service.logoutByToken("token-123")).rejects.toThrow("Delete session error");

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Error deleting session on logout:",
      expect.stringContaining("Delete session error")
    );
  });
});
