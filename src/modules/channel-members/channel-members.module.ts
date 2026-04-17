import { Module } from '@nestjs/common';
import { ChannelMembersService } from './channel-members.service';
import { ChannelMembersController } from './channel-members.controller';

@Module({
  controllers: [ChannelMembersController],
  providers: [ChannelMembersService],
})
export class ChannelMembersModule {}
