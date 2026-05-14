import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/user.decorator";
import {
  ApiCommonErrors,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { NotificationEntity } from "./entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { type User } from "generated/prisma/client";
import { NotificationCountDto } from "./dto/notification-count.dto";

const parseOptionalPositiveInt = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new BadRequestException("page and limit must be positive integers");
  }

  return parsedValue;
};

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(SessionAuthGuard)
@ApiCommonErrors()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("me")
  @ApiOkResponseGeneric(NotificationEntity, true)
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  findMyNotifications(
    @CurrentUser() user: User,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedPage = parseOptionalPositiveInt(page);
    const parsedLimit = parseOptionalPositiveInt(limit);

    if (parsedPage === undefined && parsedLimit === undefined) {
      return this.notificationsService.findAllByUserId(user.id);
    }

    return this.notificationsService.findAllByUserId(
      user.id,
      parsedPage ?? 1,
      parsedLimit ?? 20,
    );
  }

  @Get("me/unread-count")
  @ApiOkResponseGeneric(NotificationCountDto)
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.countUnreadByUserId(user.id);
  }

  @Patch("me/read-all")
  @ApiOkResponseGeneric(NotificationEntity, true)
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(":notificationId/read")
  @ApiOkResponseGeneric(NotificationEntity)
  markAsRead(
    @Param("notificationId") notificationId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }
}
