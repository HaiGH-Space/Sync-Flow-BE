import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import type { User } from 'generated/prisma/client';

@ApiTags('Meetings')
@UseGuards(SessionAuthGuard)
@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  create(@CurrentUser() user: User,@Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingService.create(user.id, createMeetingDto);
  }
}
