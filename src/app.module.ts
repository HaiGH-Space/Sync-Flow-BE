import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './_prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
   AuthModule, UserModule, PrismaModule, MailModule, WorkspaceModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
