import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import { ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import {
  ApiCommonErrors,
  ApiCreatedResponseGeneric,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { CurrentUser } from "src/common/decorators/user.decorator";
import type { User } from "generated/prisma/client";
import {
  ChannelEntity,
  ChannelWithMembersEntity,
} from "./entities/channel.entity";
import { WorkspaceRolesGuard } from "src/common/guards/workspace-roles.guard";

@ApiTags("Channels")
@UseGuards(SessionAuthGuard, WorkspaceRolesGuard)
@Controller("workspaces/:workspaceId/channels")
@ApiCommonErrors()
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post()
  @ApiCreatedResponseGeneric(ChannelWithMembersEntity)
  async create(@CurrentUser() user: User, @Body() dto: CreateChannelDto) {
    return this.channelService.create(user.id, dto);
  }

  @Get("")
  @ApiOkResponseGeneric(ChannelEntity, true)
  async findAll(
    @CurrentUser() user: User,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.channelService.findAllMyChannels(user.id, workspaceId);
  }
}
