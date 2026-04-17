import { Controller } from '@nestjs/common';
import { ChannelMembersService } from './channel-members.service';

@Controller('channel-members')
export class ChannelMembersController {
  constructor(private readonly channelMembersService: ChannelMembersService) {}
}
