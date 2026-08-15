import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/users/user.module";
import { RedisModule } from "./common/redis/redis.module";
import { AppConfigModule } from "./config/config.module";
import { PrismaModule } from "./database/prisma/prisma.module";
import { MailModule } from "./shared/mail/mail.module";
import { WorkspaceModule } from "./modules/workspaces/workspace.module";
import { ProjectModule } from "./modules/projects/project.module";
import { ColumnModule } from "./modules/columns/column.module";
import { IssueModule } from "./modules/issues/issue.module";
import { SprintModule } from "./modules/sprints/sprint.module";
import { CommentModule } from "./modules/comments/comment.module";
import { MeetingModule } from "./modules/meetings/meeting.module";
import { WorkspaceMemberModule } from "./modules/workspace-members/workspace-member.module";
import { ChatModule } from "./modules/chat/chat.module";
import { ChannelModule } from "./modules/channel/channel.module";
import { ChannelMemberModule } from "./modules/channel-members/channel-member.module";
import { UploadModule } from "./modules/upload/upload.module";
import { ProvidersModule } from "./providers/providers.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    // 1. Core Infrastructure Modules
    AppConfigModule,
    PrismaModule,
    RedisModule,
    MailModule,
    ProvidersModule,

    // 2. System & Scheduling
    ScheduleModule.forRoot(),

    // 3. Domain Feature Modules
    AuthModule,
    UserModule,
    WorkspaceModule,
    WorkspaceMemberModule,
    ProjectModule,
    ColumnModule,
    IssueModule,
    SprintModule,
    CommentModule,
    MeetingModule,
    ChatModule,
    ChannelModule,
    ChannelMemberModule,
    UploadModule,
    NotificationsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
