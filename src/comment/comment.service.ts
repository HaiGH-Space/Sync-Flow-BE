import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from 'src/_prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

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

  // async update(id: string, updateCommentDto: UpdateCommentDto) {
  //   return this.prisma.comment.update({
  //     where: { id },
  //     data: {
  //       content: updateCommentDto.content,
  //     },
  //   });
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} comment`;
  // }
}
