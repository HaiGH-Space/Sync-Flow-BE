import { ForbiddenException, Injectable } from "@nestjs/common";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LiveKitService } from "src/providers/livekit/livekit.service";
import { AppConfigService } from "src/config/config.service";
import { ErrorCode } from "src/common/constants/error-codes";
import { MuteParticipantDto } from "./dto/mute-participant.dto";
import { Role } from "generated/prisma/client";

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livekitService: LiveKitService,
    private readonly configService: AppConfigService,
  ) {}

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

  async generateChannelToken(
    userId: string,
    channelId: string,
    workspaceId: string,
  ) {
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId },
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    const isAdmin = wsMember?.role === Role.ADMIN;
    const roomName = `channel:${channelId}`;

    const token = await this.livekitService.generateToken({
      roomName,
      identity: userId,
      name: member.user.name ?? member.user.email,
      metadata: { avatar: member.user.image },
      isAdmin,
    });

    return {
      token,
      roomName,
      wsUrl: this.configService.livekitWsUrl,
    };
  }

  async getChannelParticipants(userId: string, channelId: string) {
    const isMember = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!isMember) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    const roomName = `channel:${channelId}`;
    return this.livekitService.listParticipants(roomName);
  }

  async muteChannelParticipant(channelId: string, dto: MuteParticipantDto) {
    const roomName = `channel:${channelId}`;
    return this.livekitService.muteParticipant(
      roomName,
      dto.participantIdentity,
      dto.trackSid,
      dto.muted,
    );
  }

  async removeChannelParticipant(
    channelId: string,
    participantIdentity: string,
  ) {
    const roomName = `channel:${channelId}`;
    return this.livekitService.removeParticipant(
      roomName,
      participantIdentity,
    );
  }
}

