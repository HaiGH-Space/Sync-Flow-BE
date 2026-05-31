import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionAuthGuard } from 'src/common/guards/session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
