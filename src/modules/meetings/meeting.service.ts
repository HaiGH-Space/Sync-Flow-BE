import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMeetingDto } from './dto/create-meeting.dto';
// import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ErrorCode } from 'src/common/constants/error-codes';

@Injectable()
export class MeetingService {
  constructor(private readonly prisma: PrismaService) { }

  async create(userId: string, createMeetingDto: CreateMeetingDto) {
    if (createMeetingDto.issueId) {
      const issue = await this.prisma.issue.findUnique({
        where: { id: createMeetingDto.issueId },
        select: {
          id: true,
          project: {
            select: {
              workspace: {
                select: {
                  members: {
                    where: { userId: userId },
                    select: { id: true }
                  }
                }
              }
            }
          }
        }
      });
      if (!issue) throw new NotFoundException(ErrorCode.ISSUE_NOT_FOUND);
      const isMember = issue.project.workspace.members.length > 0;
      if (!isMember) throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    return this.prisma.meeting.create({
      data: {
        title: createMeetingDto.title,
        issueId: createMeetingDto.issueId,
        participants: {
          create: {
            userId,
          }
        }
      }
    })
  }

}
