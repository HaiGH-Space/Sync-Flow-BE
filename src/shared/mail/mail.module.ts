import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { AppConfigService } from 'src/config/config.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: AppConfigService) => ({
        transport: {
          host: configService.mail.host,
          port: configService.mail.port,
          secure: false,
          auth: {
            user: configService.mail.user,
            pass: configService.mail.pass,
          },
        },
        defaults: {
          from: '"SyncFlow No Reply" <noreply@sync-flow.com>',
        },
        template: {
          dir: join(__dirname, '..', '..', 'templates'), 
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}