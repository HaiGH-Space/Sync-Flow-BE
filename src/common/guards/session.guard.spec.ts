import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { SessionAuthGuard } from "./session.guard";
import { PrismaService } from "src/database/prisma/prisma.service";
import { RedisService } from "src/common/redis/redis.service";
import { SessionTokenService } from "src/modules/auth/session-token.service";
import { ErrorCode } from "../constants/error-codes";

describe("SessionAuthGuard", () => {
  let guard: SessionAuthGuard;
  let prisma: PrismaService;
  let sessionTokenService: SessionTokenService;
  let redisService: RedisService;

  const mockUser = {
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
    image: null,
    emailVerified: true,
    hasSeenWelcome: true,
  };

  const mockSession = {
    id: "session-123",
    token: "session-token-abc",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    userId: "user-123",
    user: mockUser,
  };

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockSessionTokenService = {
    extractToken: jest.fn(),
    verifyToken: jest.fn(),
  };

  const mockRedisService = {
    exists: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionAuthGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SessionTokenService, useValue: mockSessionTokenService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<SessionAuthGuard>(SessionAuthGuard);
    prisma = module.get<PrismaService>(PrismaService);
    sessionTokenService = module.get<SessionTokenService>(SessionTokenService);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  function createMockContext(cookies: Record<string, string | undefined>, headers: Record<string, string | undefined> = {}): ExecutionContext {
    const request = {
      cookies,
      headers,
      user: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it("should throw UnauthorizedException if no token is found in cookies or headers", async () => {
    const context = createMockContext({});
    jest.spyOn(sessionTokenService, "extractToken").mockReturnValue(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED),
    );
  });

  it("should successfully authenticate and skip DB lookup when JWT is valid and cached in Redis", async () => {
    const context = createMockContext({ session_token: "jwt-token-xyz" });
    const jwtPayload = {
      sub: "user-123",
      sid: "session-token-abc",
      user: mockUser,
    };

    jest.spyOn(sessionTokenService, "extractToken").mockReturnValue("jwt-token-xyz");
    jest.spyOn(sessionTokenService, "verifyToken").mockReturnValue(jwtPayload);
    jest.spyOn(redisService, "exists").mockResolvedValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(sessionTokenService.extractToken).toHaveBeenCalled();
    expect(sessionTokenService.verifyToken).toHaveBeenCalledWith("jwt-token-xyz");
    expect(redisService.exists).toHaveBeenCalledWith("session:session-token-abc");
    expect(mockPrismaService.session.findUnique).not.toHaveBeenCalled();
    expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
  });

  it("should fall back to DB lookup and populate Redis when JWT is valid but not cached in Redis (cache-aside)", async () => {
    const context = createMockContext({ session_token: "jwt-token-xyz" });
    const jwtPayload = {
      sub: "user-123",
      sid: "session-token-abc",
      user: mockUser,
    };

    jest.spyOn(sessionTokenService, "extractToken").mockReturnValue("jwt-token-xyz");
    jest.spyOn(sessionTokenService, "verifyToken").mockReturnValue(jwtPayload);
    jest.spyOn(redisService, "exists").mockResolvedValue(false);
    mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
    jest.spyOn(redisService, "set").mockResolvedValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(redisService.exists).toHaveBeenCalledWith("session:session-token-abc");
    expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
      where: { token: "session-token-abc" },
      include: { user: true },
    });
    expect(redisService.set).toHaveBeenCalled();
    expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
  });

  it("should fall back to DB lookup for legacy (non-JWT) tokens when verifyToken returns null", async () => {
    const context = createMockContext({ session_token: "legacy-session-token" });

    jest.spyOn(sessionTokenService, "extractToken").mockReturnValue("legacy-session-token");
    jest.spyOn(sessionTokenService, "verifyToken").mockReturnValue(null);
    mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
      where: { token: "legacy-session-token" },
      include: { user: true },
    });
    expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
  });

  it("should throw UnauthorizedException if session is not found in DB fallback", async () => {
    const context = createMockContext({ session_token: "jwt-token-xyz" });
    const jwtPayload = {
      sub: "user-123",
      sid: "session-token-abc",
      user: mockUser,
    };

    jest.spyOn(sessionTokenService, "extractToken").mockReturnValue("jwt-token-xyz");
    jest.spyOn(sessionTokenService, "verifyToken").mockReturnValue(jwtPayload);
    jest.spyOn(redisService, "exists").mockResolvedValue(false);
    mockPrismaService.session.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(ErrorCode.SESSION_INVALID_OR_EXPIRED),
    );
  });

  it("should delete session and throw if session has expired during DB fallback", async () => {
    const context = createMockContext({ session_token: "jwt-token-xyz" });
    const jwtPayload = {
      sub: "user-123",
      sid: "session-token-abc",
      user: mockUser,
    };

    const expiredSession = {
      ...mockSession,
      expiresAt: new Date(Date.now() - 1000 * 60), // expired 1 min ago
    };

    jest.spyOn(sessionTokenService, "extractToken").mockReturnValue("jwt-token-xyz");
    jest.spyOn(sessionTokenService, "verifyToken").mockReturnValue(jwtPayload);
    jest.spyOn(redisService, "exists").mockResolvedValue(false);
    mockPrismaService.session.findUnique.mockResolvedValue(expiredSession);
    mockPrismaService.session.delete.mockResolvedValue(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(ErrorCode.AUTH_SESSION_EXPIRED),
    );
    expect(mockPrismaService.session.delete).toHaveBeenCalledWith({
      where: { id: expiredSession.id },
    });
  });
});
