import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getUserFromSessionToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { token: token },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!session) {
      throw new UnauthorizedException(
        "Session không tồn tại hoặc không hợp lệ",
      );
    }

    if (new Date() > session.expiresAt) {
      await this.prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => {});
      throw new UnauthorizedException("Session đã hết hạn");
    }

    return session.userId;
  }

  async checkUserInChannel(userId: string, channelId: string) {
    try {
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
