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
          description: dto.description ?? null,
          priority: dto.priority,
          order: dto.order,
          columnId: dto.columnId,
          projectId: projectId,
          assigneeId: dto.assigneeId ?? null,
          reporterId: userId,
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
