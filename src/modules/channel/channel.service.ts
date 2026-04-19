import { Injectable } from "@nestjs/common";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { PrismaService } from "src/database/prisma/prisma.service";

@Injectable()
export class ChannelService {
  constructor(private readonly prisma: PrismaService) {}
  async create(creatorId: string, dto: CreateChannelDto, projectId: string) {
    const { name, type, memberIds = [] } = dto;
    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));

    return this.prisma.channel.create({
      data: {
        name,
        type,
        projectId,
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
  async findAllMyChannels(userId: string, projectId: string) {
    return this.prisma.channel.findMany({
      where: {
        projectId,
        members: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
