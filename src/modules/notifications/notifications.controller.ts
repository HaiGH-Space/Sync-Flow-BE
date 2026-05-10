import { Controller, Get, Param, Patch } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { ApiOkResponseGeneric } from "src/common/decorators/api-common-responses.decorator";
import { NotificationEntity } from "./entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { type User } from "generated/prisma/client";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("me")
  @ApiOkResponseGeneric(NotificationEntity, true)
  findMyNotifications(@CurrentUser() user: User) {
    return this.notificationsService.findAllByUserId(user.id);
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
