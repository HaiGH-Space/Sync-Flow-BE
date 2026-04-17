import { Controller, Post, Body, UseGuards, Param, Get, Patch, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import type { User } from 'generated/prisma/client';
import { IssueAccessGuard } from 'src/common/guards/issue-access.guard';
import { CommentEntity } from './entities/comment.entity';
import { UpdateCommentDto } from './dto/update-comment.dto';


@ApiTags('Comments')
@ApiCommonErrors()
@Controller('issues/:issueId/comments')
@UseGuards(SessionAuthGuard, IssueAccessGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  @Get()
  @ApiOkResponseGeneric(CommentEntity, true)
  findAll(@Param('issueId') issueId: string) {
    return this.commentService.findAllByIssue(issueId);
  }

  @Post()
  @ApiCreatedResponseGeneric(CommentEntity)
  create(@Param('issueId') issueId: string, @CurrentUser() user: User, @Body() createCommentDto: CreateCommentDto) {
    return this.commentService.create(issueId, user.id, createCommentDto);
  }

  @Patch(':commentId')
  @ApiOkResponseGeneric(CommentEntity)
  update(@CurrentUser() user: User, @Param('commentId') commentId: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentService.update(user.id, commentId, updateCommentDto);
  }

  @Delete(':commentId')
  @ApiOkResponseGeneric(CommentEntity)
  remove(@CurrentUser() user: User, @Param('commentId') commentId: string) {
    return this.commentService.remove(user.id, commentId);
  }

}
