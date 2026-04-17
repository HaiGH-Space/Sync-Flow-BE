import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ErrorCode } from 'src/common/constants/error-codes';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) { }

  async create(issueId: string, userId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        content: dto.content,
        issueId: issueId,
        userId: userId,
      },
    });
  }

  async findAllByIssue(issueId: string) {
    return this.prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });
  }

  async update(userId: string, id: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!comment) {
      throw new NotFoundException(ErrorCode.COMMENT_NOT_FOUND);
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return this.prisma.comment.update({
      where: { id },
      data: updateCommentDto
    })
  }

  async remove(userId: string, id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!comment) {
      throw new NotFoundException(ErrorCode.COMMENT_NOT_FOUND);
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return this.prisma.comment.delete({
      where: { id }
    });
  }
}
