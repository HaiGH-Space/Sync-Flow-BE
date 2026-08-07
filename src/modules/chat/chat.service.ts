import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "src/common/redis/redis.service";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async getMessages(channelId: string, limit: number = 20, cursor?: string) {
    const messages = await this.prisma.message.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        channelId: channelId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : null;
    return {
      data: messages.reverse(),
      nextCursor,
    };
  }

  async getUserFromSessionToken(token: string): Promise<string> {
    try {
      const payload = this.jwtService.verify(token) as unknown as { sub: string; sid: string; user: { id: string } };

      if (!payload || !payload.sid || !payload.user) {
        throw new UnauthorizedException("Session không tồn tại hoặc không hợp lệ");
      }

      const isCached = await this.redisService.exists(`session:${payload.sid}`);
      if (isCached) {
        return payload.user.id;
      }

      const session = await this.prisma.session.findUnique({
        where: { token: payload.sid },
        select: { id: true, userId: true, expiresAt: true },
      });

      if (!session) {
        throw new UnauthorizedException("Session không tồn tại hoặc không hợp lệ");
      }

      if (new Date() > session.expiresAt) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        throw new UnauthorizedException("Session đã hết hạn");
      }

      const ttlSeconds = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
      if (ttlSeconds > 0) {
        await this.redisService.set(
          `session:${payload.sid}`,
          JSON.stringify({ userId: session.userId, expiresAt: session.expiresAt.toISOString() }),
          ttlSeconds,
        );
      }

      return session.userId;
    } catch {
      // Legacy fallback
      const session = await this.prisma.session.findUnique({
        where: { token: token },
        select: { id: true, userId: true, expiresAt: true },
      });

      if (!session) {
        throw new UnauthorizedException("Session không tồn tại hoặc không hợp lệ");
      }

      if (new Date() > session.expiresAt) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        throw new UnauthorizedException("Session đã hết hạn");
      }

      return session.userId;
    }
  }

  async checkUserInChannel(userId: string, channelId: string) {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          visibility: true,
          project: { select: { workspaceId: true } },
        },
      });

      if (!channel) return false;

      if (channel.visibility === "PUBLIC") {
        const wsMember = await this.prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: channel.project.workspaceId,
              userId: userId,
            },
          },
        });
        return !!wsMember;
      }

      const member = await this.prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: channelId,
            userId: userId,
          },
        },
        select: { id: true },
      });

      return !!member;
    } catch (error) {
      this.logger.error(`Lỗi checkUserInChannel: ${error}`);
      return false;
    }
  }

  async saveMessage(data: {
    senderId: string;
    channelId: string;
    content: string;
  }) {
    try {
      const message = await this.prisma.message.create({
        data: {
          content: data.content,
          channelId: data.channelId,
          senderId: data.senderId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
      return message;
    } catch (error) {
      this.logger.error(`Lỗi saveMessage: ${error}`);
      throw new Error("Không thể lưu tin nhắn lúc này");
    }
  }
}
