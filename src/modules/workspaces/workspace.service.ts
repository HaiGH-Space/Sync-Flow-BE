import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { PrismaService } from "src/database/prisma/prisma.service";
import { ErrorCode } from "src/common/constants/error-codes";
import { Role } from "generated/prisma/enums";
import * as crypto from "crypto";
import { BooleanResponseDto } from "src/common/dto/boolean-response.dto";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { AppConfigService } from "src/config/config.service";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: AppConfigService,
  ) {}

  async inviteMember(
    inviterId: string,
    workspaceId: string,
    email: string,
    role: Role = "MEMBER",
    expiresInDays?: number,
  ): Promise<BooleanResponseDto> {
    const isMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: email,
        },
      },
    });

    if (isMember) {
      throw new ConflictException(ErrorCode.USER_ALREADY_MEMBER);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const days = expiresInDays ?? this.configService.defaultInviteExpiresInDays;
    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    );

    const invite = await this.prisma.workspaceInvite.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email,
        },
      },
      update: {
        token,
        expiresAt,
        role,
        inviterId,
      },
      create: {
        workspaceId,
        email,
        token,
        expiresAt,
        role,
        inviterId,
      },
    });

    const [workspace, inviter, recipient] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
      this.prisma.user.findUnique({ where: { id: inviterId } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);

    if (workspace && inviter && recipient) {
      await this.notificationsService.createWorkspaceInviteNotification(
        recipient.id,
        invite.id,
        workspace.name,
        inviter.name,
        invite.role,
      );
    }

    return { status: true };
  }

  async acceptInvite(
    userId: string,
    token: string,
  ): Promise<BooleanResponseDto> {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: {
        token,
      },
    });

    if (!invite) throw new NotFoundException(ErrorCode.INVALID_INVITE);
    if (invite.expiresAt < new Date())
      throw new NotFoundException(ErrorCode.EXPIRED_INVITE);

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      });
      // Delete invite after accepting
      await tx.workspaceInvite.delete({
        where: {
          token,
        },
      });
    });

    await this.notificationsService.markWorkspaceInviteNotificationsAsRead(
      invite.id,
    );

    return { status: true };
  }

  async findAllByUserId(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const includeTotal = query.includeTotal ?? true;

    const where = {
      members: {
        some: {
          userId: userId,
        },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      includeTotal ? this.prisma.workspace.count({ where }) : Promise.resolve(undefined),
    ]);

    return { items, total, page, limit };
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({
      where: { urlSlug: dto.urlSlug },
    });

    if (existing) {
      throw new ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS);
    }
    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        urlSlug: dto.urlSlug,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: Role.ADMIN,
          },
        },
      },
      include: { members: true },
    });
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    if (dto.urlSlug) {
      const existing = await this.prisma.workspace.findUnique({
        where: { urlSlug: dto.urlSlug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS);
      }
    }

    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  delete(id: string) {
    return this.prisma.workspace.delete({
      where: { id },
    });
  }
}
