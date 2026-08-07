import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LiveKitService } from "src/providers/livekit/livekit.service";
import { AppConfigService } from "src/config/config.service";
import { ErrorCode } from "src/common/constants/error-codes";
import { MuteParticipantDto } from "./dto/mute-participant.dto";
import { ChannelType, ChannelVisibility, Role } from "generated/prisma/client";

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livekitService: LiveKitService,
    private readonly configService: AppConfigService,
  ) {}

  async hasChannelAccess(userId: string, channelId: string): Promise<boolean> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        visibility: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!channel) return false;

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.project.workspaceId,
          userId,
        },
      },
    });

    if (!wsMember) return false;

    if (channel.visibility === ChannelVisibility.PUBLIC) {
      return true;
    }

    const channelMember = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId },
      },
    });

    return !!channelMember;
  }

  async create(creatorId: string, dto: CreateChannelDto, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) {
      throw new NotFoundException(ErrorCode.PROJECT_NOT_FOUND);
    }

    const { name, type, visibility, memberIds = [] } = dto;
    const channelVisibility =
      type === ChannelType.DIRECT
        ? ChannelVisibility.PRIVATE
        : (visibility ?? ChannelVisibility.PUBLIC);

    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));

    const wsMembers = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: project.workspaceId,
        userId: { in: allMemberIds },
      },
      select: { userId: true },
    });

    if (wsMembers.length !== allMemberIds.length) {
      throw new BadRequestException(ErrorCode.BAD_REQUEST);
    }

    return this.prisma.channel.create({
      data: {
        name,
        type,
        visibility: channelVisibility,
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
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) return [];

    const isWsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId,
        },
      },
    });
    if (!isWsMember) return [];

    return this.prisma.channel.findMany({
      where: {
        projectId,
        OR: [
          { visibility: ChannelVisibility.PUBLIC },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async generateChannelToken(
    userId: string,
    channelId: string,
    workspaceId: string,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        visibility: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!channel || channel.project.workspaceId !== workspaceId) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    const hasAccess = await this.hasChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    const [user, wsMember] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      }),
    ]);

    if (!user) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    const isAdmin = wsMember?.role === Role.ADMIN;
    const roomName = `channel:${channelId}`;

    const token = await this.livekitService.generateToken({
      roomName,
      identity: userId,
      name: user.name ?? user.email,
      metadata: { avatar: user.image },
      isAdmin,
    });

    return {
      token,
      roomName,
      wsUrl: this.configService.livekitWsUrl,
    };
  }

  async getChannelParticipants(userId: string, channelId: string) {
    const hasAccess = await this.hasChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    const roomName = `channel:${channelId}`;
    return this.livekitService.listParticipants(roomName);
  }

  async muteChannelParticipant(
    workspaceId: string,
    channelId: string,
    dto: MuteParticipantDto,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        project: { workspaceId },
      },
    });
    if (!channel) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    const roomName = `channel:${channelId}`;
    return this.livekitService.muteParticipant(
      roomName,
      dto.participantIdentity,
      dto.trackSid,
      dto.muted,
    );
  }

  async removeChannelParticipant(
    workspaceId: string,
    channelId: string,
    participantIdentity: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        project: { workspaceId },
      },
    });
    if (!channel) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    const roomName = `channel:${channelId}`;
    return this.livekitService.removeParticipant(
      roomName,
      participantIdentity,
    );
  }

  async updateLastReadAt(userId: string, channelId: string) {
    const hasAccess = await this.hasChannelAccess(userId, channelId);
    if (!hasAccess) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return this.prisma.channelMember.upsert({
      where: {
        channelId_userId: { channelId, userId },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        channelId,
        userId,
        lastReadAt: new Date(),
      },
    });
  }
}



