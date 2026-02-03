import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from 'src/_prisma/prisma.service';
import { ErrorCode } from 'src/common/constants/error-codes';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) { }
  async create(workspaceId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: {
        workspaceId_key: {
          workspaceId: workspaceId,
          key: dto.key,
        }
      }
    })

    if (existing) {
      throw new ConflictException(ErrorCode.PROJECT_KEY_EXISTS);
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        key: dto.key,
        workspaceId: workspaceId,
        columns: {
          createMany: {
            data: [
              { name: 'To Do', order: 1 },
              { name: 'In Progress', order: 2 },
              { name: 'Done', order: 3 },
            ]
          }
        }
      },
      include: {
        columns: true,
      }
    })
  }

  async findAllByWorkspace(workspaceId: string) {
    return `This action returns all projects for workspace #${workspaceId}`;
  }

  findAll() {
    return `This action returns all project`;
  }

  findOne(id: number) {
    return `This action returns a #${id} project`;
  }

  update(id: number, updateProjectDto: UpdateProjectDto) {
    return `This action updates a #${id} project`;
  }
  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.project.findFirst({
      where: {
        id,
        workspaceId
      }
    });

    if (!existing) {
      throw new NotFoundException(ErrorCode.PROJECT_NOT_FOUND);
    }

    return this.prisma.project.delete({
      where: {
        id,
      },
    });
  }
}
