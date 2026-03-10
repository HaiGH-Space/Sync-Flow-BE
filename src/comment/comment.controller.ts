import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrors } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import type { User } from 'generated/prisma/client';
import { IssueAccessGuard } from 'src/common/guards/issue-access.guard';


@ApiTags('Comments')
@ApiCommonErrors()
@Controller('issues/:issueId/comments')
@UseGuards(SessionAuthGuard, IssueAccessGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  @Post()
  create(@Param('issueId') issueId: string, @CurrentUser() user: User, @Body() createCommentDto: CreateCommentDto) {
    return this.commentService.create(issueId, user.id, createCommentDto);
  }
}
