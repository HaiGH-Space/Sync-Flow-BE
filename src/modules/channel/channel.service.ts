import { Injectable } from "@nestjs/common";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { PrismaService } from "src/database/prisma/prisma.service";

@Injectable()
export class ChannelService {
  constructor(private readonly prisma: PrismaService) {}
  async create(creatorId: string, dto: CreateChannelDto) {
    const { name, type, workspaceId, memberIds = [] } = dto;
    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));

    return this.prisma.channel.create({
      data: {
        name,
        type,
        workspaceId,
        members: {
          create: allMemberIds.map((userId) => ({
            userId: userId,
          })),
        },
      },
      include: {
        members: true,
      },
    });
  }
  async findAllMyChannels(userId: string, workspaceId: string) {
    return this.prisma.channel.findMany({
      where: {
        workspaceId,
        members: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
