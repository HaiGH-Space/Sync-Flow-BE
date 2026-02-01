import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { mailerConfig } from 'src/config/mailer.config';

@Global()
@Module({
  imports: [
    MailerModule.forRoot(mailerConfig),
  ],
  exports: [MailerModule],
})
export class MailModule {}