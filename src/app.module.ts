import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/users/user.module";
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
import { ChannelMembersModule } from "./modules/channel-members/channel-members.module";
import { UploadModule } from "./modules/upload/upload.module";
import { ProvidersModule } from "./providers/providers.module";

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    UserModule,
    PrismaModule,
    MailModule,
    WorkspaceModule,
    ProjectModule,
    ColumnModule,
    IssueModule,
    SprintModule,
    CommentModule,
    MeetingModule,
    WorkspaceMemberModule,
    ChatModule,
    ChannelModule,
    ChannelMembersModule,
    UploadModule,
    ProvidersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
