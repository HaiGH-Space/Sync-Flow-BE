import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
// import { CreateSprintDto } from './dto/create-sprint.dto';

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
}
