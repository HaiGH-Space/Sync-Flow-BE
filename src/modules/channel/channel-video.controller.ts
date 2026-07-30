import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { WorkspaceRolesGuard } from "src/common/guards/workspace-roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { Role } from "generated/prisma/client";
import { CurrentUser } from "src/common/decorators/user.decorator";
import type { User } from "generated/prisma/client";
import {
  ApiCommonErrors,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { ChannelService } from "./channel.service";
import { MuteParticipantDto } from "./dto/mute-participant.dto";
import { LiveKitTokenResponseDto } from "./dto/livekit-token-response.dto";

@ApiTags("Channel Video")
@Controller("workspaces/:workspaceId/channels")
@UseGuards(SessionAuthGuard, WorkspaceRolesGuard)
@ApiCommonErrors()
export class ChannelVideoController {
  constructor(private readonly channelService: ChannelService) {}

  @Post(":channelId/video/token")
  @ApiOkResponseGeneric(LiveKitTokenResponseDto)
  async getChannelVideoToken(
    @CurrentUser() user: User,
    @Param("channelId") channelId: string,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.channelService.generateChannelToken(
      user.id,
      channelId,
      workspaceId,
    );
  }

  @Get(":channelId/video/participants")
  @ApiOkResponseGeneric(Object, true)
  async getChannelParticipants(
    @CurrentUser() user: User,
    @Param("channelId") channelId: string,
  ) {
    return this.channelService.getChannelParticipants(user.id, channelId);
  }

  @Post(":channelId/video/mute-participant")
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(Object)
  async muteParticipant(
    @Param("workspaceId") workspaceId: string,
    @Param("channelId") channelId: string,
    @Body() dto: MuteParticipantDto,
  ) {
    return this.channelService.muteChannelParticipant(
      workspaceId,
      channelId,
      dto,
    );
  }

  @Delete(":channelId/video/participants/:participantIdentity")
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(Object)
  async removeParticipant(
    @Param("workspaceId") workspaceId: string,
    @Param("channelId") channelId: string,
    @Param("participantIdentity") participantIdentity: string,
  ) {
    return this.channelService.removeChannelParticipant(
      workspaceId,
      channelId,
      participantIdentity,
    );
  }
}
