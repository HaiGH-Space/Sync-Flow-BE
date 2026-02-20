import { Injectable } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { PrismaService } from 'src/_prisma/prisma.service';

@Injectable()
export class IssueService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateIssueDto) {
    return this.prisma.$transaction(async (tx) => {
      const lastIssue = await tx.issue.findFirst({
        where: { projectId: dto.projectId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });

      const nextNumber = (lastIssue?.number ?? 0) + 1;

      return tx.issue.create({
        data: {
          number: nextNumber,
          title: dto.title,
          description: dto.description ?? null,
          priority: dto.priority,
          order: dto.order,
          columnId: dto.columnId,
          projectId: dto.projectId,
          assigneeId: dto.assigneeId ?? null,
        },
      });
    });
  }
}
