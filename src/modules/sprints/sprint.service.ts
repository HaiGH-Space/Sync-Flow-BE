import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

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
  async findAll(projectId: string) {
    return this.prisma.sprint.findMany({
      where: {
        projectId: projectId
      }
    })
  }
  async delete(sprintId: string) {
    return this.prisma.sprint.delete({
      where: {
        id: sprintId
      }
    })
  }
  async update(sprintId: string, data: UpdateSprintDto) {
    return this.prisma.sprint.update({
      where: {
        id: sprintId
      },
      data: data
    })
  }
}
