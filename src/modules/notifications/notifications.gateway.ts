import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { DefaultEventsMap, Server, Socket } from "socket.io";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { getCorsOriginsFromEnv } from "src/config/env";
import { ErrorCode } from "src/common/constants/error-codes";
import { PrismaService } from "src/database/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "src/common/redis/redis.service";
import { getAuthToken } from "src/common/utils/ws-auth";
import type { NotificationPayload } from "./types/notification.types";

@WebSocketGateway({
  cors: {
    origin: getCorsOriginsFromEnv(),
    credentials: true,
  },
  namespace: "/notifications",
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger("NotificationsGateway");

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = getAuthToken(client);
      if (!token) throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);

      let userId: string;
      try {
        const payload = this.jwtService.verify(token) as unknown as { sub: string; sid: string; user: { id: string } };

        if (!payload || !payload.sid || !payload.user) {
          throw new UnauthorizedException(ErrorCode.SESSION_INVALID_OR_EXPIRED);
        }

        const isCached = await this.redisService.exists(`session:${payload.sid}`);
        if (isCached) {
          userId = payload.user.id;
        } else {
          // Fallback to database lookup
          const session = await this.prisma.session.findUnique({
            where: { token: payload.sid },
            select: { id: true, userId: true, expiresAt: true },
          });

          if (!session) {
            throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
          }

          if (new Date() > session.expiresAt) {
            await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
            throw new UnauthorizedException("Session đã hết hạn");
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
          userId = session.userId;
        }
      } catch {
        // Fallback for legacy database tokens
        const session = await this.prisma.session.findUnique({
          where: { token },
          select: { id: true, userId: true, expiresAt: true },
        });

        if (!session) {
          throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        if (new Date() > session.expiresAt) {
          await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
          throw new UnauthorizedException("Session đã hết hạn");
        }

        userId = session.userId;
      }

      client.data.user = { id: userId };
      await client.join(userId);
      this.logger.log(`Client connected: ${client.id} - UserId: ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Connection failed: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitNotificationCreated(userId: string, notification: NotificationPayload) {
    this.server.to(userId).emit("notification_created", notification);
  }

  emitNotificationUpdated(userId: string, notification: NotificationPayload) {
    this.server.to(userId).emit("notification_updated", notification);
  }
}

type SocketData = { user?: { id: string } };
type AuthenticatedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;


