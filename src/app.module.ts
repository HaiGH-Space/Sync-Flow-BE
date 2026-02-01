import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './_prisma/prisma.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { mailerConfig } from './config/mailer.config';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
  MailerModule.forRoot(mailerConfig), AuthModule, UserModule, PrismaModule, MailModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
