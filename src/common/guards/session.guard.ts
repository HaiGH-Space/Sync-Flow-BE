import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "src/database/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "src/common/redis/redis.service";
import { User } from "generated/prisma/client";
import { ErrorCode } from "../constants/error-codes";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  hasSeenWelcome: boolean;
}

interface DecodedSessionToken {
  sub: string;
  sid: string;
  user: SessionUser;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, string | undefined>;
    const token = cookies["session_token"] || this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
    }

    try {
      // 1. Verify the JWT in-memory
      const payload = this.jwtService.verify(token) as unknown as DecodedSessionToken;
      
      if (!payload || !payload.sid || !payload.user) {
        throw new UnauthorizedException(ErrorCode.SESSION_INVALID_OR_EXPIRED);
      }

      // 2. Check if the session is cached in Redis
      const isCached = await this.redisService.exists(`session:${payload.sid}`);
      if (isCached) {
        request.user = payload.user as unknown as User;
        return true;
      }

      // 3. Fallback to DB lookup (Cache-Aside safety net if Redis is cold)
      const session = await this.prisma.session.findUnique({
        where: { token: payload.sid },
        include: { user: true },
      });

      if (!session) {
        throw new UnauthorizedException(ErrorCode.SESSION_INVALID_OR_EXPIRED);
      }

      if (new Date() > session.expiresAt) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        throw new UnauthorizedException(ErrorCode.AUTH_SESSION_EXPIRED);
      }

      // Re-populate Redis cache
      const ttlSeconds = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
      if (ttlSeconds > 0) {
        await this.redisService.set(
          `session:${payload.sid}`,
          JSON.stringify({ userId: session.userId, expiresAt: session.expiresAt.toISOString() }),
          ttlSeconds,
        );
      }

      request.user = session.user;
      return true;
    } catch {
      // 4. Fallback for legacy database tokens (not JWTs)
      const session = await this.prisma.session.findUnique({
        where: { token: token },
        include: { user: true },
      });

      if (!session) {
        throw new UnauthorizedException(ErrorCode.SESSION_INVALID_OR_EXPIRED);
      }

      if (new Date() > session.expiresAt) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        throw new UnauthorizedException(ErrorCode.AUTH_SESSION_EXPIRED);
      }

      request.user = session.user;
      return true;
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}