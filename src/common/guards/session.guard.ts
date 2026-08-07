import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "src/database/prisma/prisma.service";
import { RedisService } from "src/common/redis/redis.service";
import { User } from "generated/prisma/client";
import { ErrorCode } from "../constants/error-codes";
import { SessionTokenService } from "src/modules/auth/session-token.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionTokenService: SessionTokenService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.sessionTokenService.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
    }

    const payload = this.sessionTokenService.verifyToken(token);

    if (payload) {
      // 1. Check if the session is cached in Redis
      const isCached = await this.redisService.exists(`session:${payload.sid}`);
      if (isCached) {
        request.user = payload.user as unknown as User;
        (request as unknown as { sessionToken?: string }).sessionToken = token;
        return true;
      }

      // 2. Fallback to DB lookup (Cache-Aside safety net if Redis is cold)
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
      (request as unknown as { sessionToken?: string }).sessionToken = token;
      return true;
    } else {
      // 3. Fallback for legacy database tokens (not JWTs or JWT verification failed)
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
      (request as unknown as { sessionToken?: string }).sessionToken = token;
      return true;
    }
  }
}