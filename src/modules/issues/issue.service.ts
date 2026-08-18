import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Issue, Prisma } from 'generated/prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ErrorCode } from 'src/common/constants/error-codes';

export type IssueWithAssignee = Prisma.IssueGetPayload<{
  include: { assignee: true };
}>;
@Injectable()
export class IssueService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(projectId: string, query: PaginationQueryDto): Promise<{ items: IssueWithAssignee[], total?: number, page: number, limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const includeTotal = query.includeTotal ?? true;

    const where = { projectId };

    const [items, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        include: { assignee: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      includeTotal ? this.prisma.issue.count({ where }) : Promise.resolve(undefined),
    ]);

    return { items, total, page, limit };
  }
  async create(userId: string, projectId: string, dto: CreateIssueDto): Promise<Issue> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: projectId },
        data: {
          lastIssueNumber: { increment: 1 },
        },
        select: { lastIssueNumber: true },
      })
      return tx.issue.create({
        data: {
          number: project.lastIssueNumber,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          order: dto.order,
          columnId: dto.columnId,
          projectId: projectId,
          assigneeId: dto.assigneeId,
          reporterId: userId,
          sprintId: dto.sprintId,
        },
      });
    });
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { assignee: true },
    });
    if (!issue) {
      throw new NotFoundException(ErrorCode.ISSUE_NOT_FOUND);
    }
    return issue;
  }

  async update(id: string, dto: UpdateIssueDto): Promise<Issue> {
    return this.prisma.issue.update({
      where: { id },
      data: dto
    });
  }
  async delete(id: string): Promise<Issue>{
    return this.prisma.issue.delete({
      where: { id },
    });
  }
}
