import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { User } from "generated/prisma/client";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { ChatService } from "./chat.service";
import {
  ApiCommonErrors,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { ChatHistory } from "./entities/chat.entity";

@ApiTags("Chat Messages")
@Controller("channels/:channelId/messages")
@UseGuards(SessionAuthGuard)
@ApiCommonErrors()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}
  @ApiOkResponseGeneric(ChatHistory)
  @Get()
  async getHistory(
    @CurrentUser() user: User,
    @Param("channelId") channelId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const isMember = await this.chatService.checkUserInChannel(
      user.id,
      channelId,
    );
    if (!isMember) {
      throw new ForbiddenException();
    }
    const take = limit ? parseInt(limit, 10) : 20;
    return this.chatService.getMessages(channelId, take, cursor);
  }
}
