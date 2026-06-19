import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { MailerService } from "@nestjs-modules/mailer/dist/mailer.service";
import { AppConfigService } from "src/config/config.service";
import { Logger, ConflictException, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ErrorCode } from "src/common/constants/error-codes";
import * as bcrypt from "bcryptjs";

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));


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

  it("should throw ConflictException if the email is already in use", async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    await expect(
      service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
    ).rejects.toThrow(
      new ConflictException(ErrorCode.AUTH_EMAIL_IN_USE)
    );

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("should rollback and throw InternalServerErrorException if verification creation fails inside transaction", async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockPrismaService);
      }
    );
    mockPrismaService.user.create = jest.fn().mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });
    mockPrismaService.verification.create = jest.fn().mockRejectedValue(new Error("Verification failed"));

    await expect(
      service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
    ).rejects.toThrow(
      new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR)
    );

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Register Error:",
      expect.stringContaining("Verification failed")
    );
  });


  describe("login", () => {
    const mockSession = {
      id: "session-123",
      token: "session-token-abc",
      expiresAt: new Date(),
      userId: "user-123",
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        image: null,
        emailVerified: true,
        hasSeenWelcome: false,
      },
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique = jest.fn();
      mockPrismaService.account = {
        findFirst: jest.fn(),
        create: jest.fn(),
      };
      mockPrismaService.session = {
        create: jest.fn(),
        deleteMany: jest.fn(),
      };
    });

    it("should throw UnauthorizedException if user is not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "notfound@example.com", password: "password123" })
      ).rejects.toThrow(
        new UnauthorizedException(ErrorCode.AUTH_INVALID_CREDENTIALS)
      );
    });

    it("should throw UnauthorizedException if account is OAuth only (no password or account empty)", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-123", email: "oauth@example.com" });
      mockPrismaService.account.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: "oauth@example.com", password: "password123" })
      ).rejects.toThrow(
        new UnauthorizedException(ErrorCode.AUTH_OAUTH_ACCOUNT_ONLY)
      );
    });

    it("should throw UnauthorizedException if password comparison fails", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-123", email: "test@example.com" });
      mockPrismaService.account.findFirst.mockResolvedValue({ userId: "user-123", password: "hashed_password" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "test@example.com", password: "wrongpassword" })
      ).rejects.toThrow(
        new UnauthorizedException(ErrorCode.AUTH_INVALID_CREDENTIALS)
      );
    });

    it("should return session and user info on login success", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-123", email: "test@example.com" });
      mockPrismaService.account.findFirst.mockResolvedValue({ userId: "user-123", password: "hashed_password" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue(mockSession);

      const result = await service.login(
        { email: "test@example.com", password: "password123" },
        "Chrome",
        "127.0.0.1"
      );


      expect(result).toEqual(mockSession);
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          token: expect.any(String),
          expiresAt: expect.any(Date),
          userAgent: "Chrome",
          ipAddress: "127.0.0.1",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              emailVerified: true,
              hasSeenWelcome: true,
            },
          },
        },
      });
    });
  });

  describe("logoutByToken", () => {
    it("should return early and not call prisma if token is undefined or empty", async () => {
      mockPrismaService.session.deleteMany = jest.fn();
      await service.logoutByToken(undefined);
      expect(mockPrismaService.session.deleteMany).not.toHaveBeenCalled();
    });

    it("should log errors when session deletion on logout fails", async () => {
      mockPrismaService.session.deleteMany = jest.fn().mockRejectedValue(new Error("Delete session error"));

      await expect(service.logoutByToken("token-123")).rejects.toThrow("Delete session error");

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Error deleting session on logout:",
        expect.stringContaining("Delete session error")
      );
    });
  });
});
