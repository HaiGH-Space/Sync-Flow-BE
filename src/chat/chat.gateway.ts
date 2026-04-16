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

const getCorsOrigin = () => {
  const origin = process.env.CORS_ORIGIN;
  if (!origin) return "*";
  return origin.includes(",") ? origin.split(",") : origin;
};

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
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
      if (!token) throw new UnauthorizedException("Thiếu token kết nối");

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
    const userId = client.data.user?.id;
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
      // Bắn ngược lại 1 event báo lỗi cho FE biết
      client.emit("error", { message: "Bạn không có quyền vào kênh này" });
      return;
    }

    // Đưa user vào phòng
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

    // 3.1. Gọi Service để lưu tin nhắn xuống Database (Prisma)
    const savedMessage = await this.chatService.saveMessage({
      senderId: userId,
      channelId: payload.channelId,
      content: payload.content,
    });

    // 3.2. BROADCAST: Bắn tin nhắn vừa lưu cho TẤT CẢ mọi người đang ở trong channel này
    this.server.to(payload.channelId).emit("new_message", savedMessage);
  }
}

type SocketData = { user?: { id: string } };
type AuthenticatedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

const getAuthToken = (client: AuthenticatedSocket): string | undefined => {
  const cookieString = client.handshake.headers.cookie;
  if (cookieString) {
    const cookies = parseCookies(cookieString);
    if (cookies["session_token"]) {
      return cookies["session_token"];
    }
  }
  const authPayload = client.handshake.auth;
  if (typeof authPayload?.session_token === "string")
    return authPayload.session_token;
  if (typeof authPayload?.token === "string") return authPayload.token;
  return undefined;
};

const parseCookies = (cookieString?: string): Record<string, string> => {
  if (!cookieString) return {};
  return cookieString.split(";").reduce((res, item) => {
    const data = item.trim().split("=");
    return { ...res, [data[0]]: decodeURIComponent(data[1] || "") };
  }, {});
};
