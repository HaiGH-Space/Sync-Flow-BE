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

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = getAuthToken(client);
      if (!token) throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);

      const session = await this.prisma.session.findUnique({
        where: { token },
        select: { id: true, userId: true, expiresAt: true },
      });

      if (!session) {
        throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
      }

      if (new Date() > session.expiresAt) {
        await this.prisma.session
          .delete({ where: { id: session.id } })
          .catch(() => {});
        throw new UnauthorizedException("Session đã hết hạn");
      }

      client.data.user = { id: session.userId };
      await client.join(session.userId);
      this.logger.log(
        `Client connected: ${client.id} - UserId: ${session.userId}`,
      );
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


