import { Injectable } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { PrismaService } from 'src/_prisma/prisma.service';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Issue, Prisma } from 'generated/prisma/client';

export type IssueWithAssignee = Prisma.IssueGetPayload<{
  include: { assignee: true };
}>;
@Injectable()
export class IssueService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(projectId: string): Promise<IssueWithAssignee[]> {
    return this.prisma.issue.findMany({
      where: {
        projectId: projectId,
      },
      include: { assignee: true },
    });
  }
  async create(projectId: string, dto: CreateIssueDto): Promise<Issue> {
    return this.prisma.$transaction(async (tx) => {
      const lastIssue = await tx.issue.findFirst({
        where: { projectId },
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
          projectId: projectId,
          assigneeId: dto.assigneeId ?? null,
        },
      });
    });
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
