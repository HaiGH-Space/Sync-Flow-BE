import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { ChatService } from "./chat.service";
import { DefaultEventsMap, Server, Socket } from "socket.io";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { getCorsOriginsFromEnv } from "src/config/env";
import { ErrorCode } from "src/common/constants/error-codes";
import { getAuthToken } from "src/common/utils/ws-auth";

@WebSocketGateway({
  cors: {
    origin: getCorsOriginsFromEnv(),
    credentials: true,
  },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private logger = new Logger("ChatGateway");

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = getAuthToken(client);
      if (!token) throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);

      const userId = await this.chatService.getUserFromSessionToken(token);
      client.data.user = { id: userId };
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

  @SubscribeMessage("join_channel")
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    const userId = await this.ensureUser(client);
    if (!userId) {
      client.emit("error", { message: "Bạn chưa đăng nhập" });
      return;
    }
    const channelId = payload.channelId;

    const canJoin = await this.chatService.checkUserInChannel(
      userId,
      channelId,
    );
    if (!canJoin) {
      client.emit("error", { message: "Bạn không có quyền vào kênh này" });
      return;
    }
    await client.join(channelId);
    return { status: "success", message: `Đã join kênh ${channelId}` };
  }
  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string; content: string },
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      client.emit("error", { message: "Bạn chưa đăng nhập" });
      return;
    }

    const savedMessage = await this.chatService.saveMessage({
      senderId: userId,
      channelId: payload.channelId,
      content: payload.content,
    });

    this.server.to(payload.channelId).emit("new_message", savedMessage);
  }

  async ensureUser(client: AuthenticatedSocket) {
    if (client.data.user?.id) return client.data.user.id;

    const token = getAuthToken(client);
    if (!token) return undefined;

    const userId = await this.chatService.getUserFromSessionToken(token);
    client.data.user = { id: userId };
    return userId;
  }
}

type SocketData = { user?: { id: string } };
type AuthenticatedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;


