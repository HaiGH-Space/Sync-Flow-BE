import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class SprintService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createSprintDto: CreateSprintDto, projectId: string) {
    return this.prisma.sprint.create({
      data: {
        ...createSprintDto,
        projectId: projectId
      }
    })
  }
  async findAll(projectId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { projectId };

    const [items, total] = await Promise.all([
      this.prisma.sprint.findMany({
        where,
        skip,
        take: limit,
      }),
      this.prisma.sprint.count({ where }),
    ]);

    return { items, total, page, limit };
  }
  async delete(projectId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId }
    });
    if (!sprint || sprint.projectId !== projectId) {
      throw new NotFoundException('Sprint not found');
    }
    return this.prisma.sprint.delete({
      where: {
        id: sprintId
      }
    })
  }
  async update(projectId: string, sprintId: string, data: UpdateSprintDto) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId }
    });
    if (!sprint || sprint.projectId !== projectId) {
      throw new NotFoundException('Sprint not found');
    }
    return this.prisma.sprint.update({
      where: {
        id: sprintId
      },
      data: data
    })
  }
}
