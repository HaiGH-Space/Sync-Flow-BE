import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ErrorCode } from 'src/common/constants/error-codes';
import { ProjectEntity } from './entities/project.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) { }
  async create(workspaceId: string, dto: CreateProjectDto): Promise<ProjectEntity> {
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
        description: dto.description,
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

  async findAllByWorkspace(workspaceId: string, query: PaginationQueryDto): Promise<{ items: ProjectEntity[], total: number, page: number, limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { workspaceId };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async update(workspaceId: string, id: string,dto: UpdateProjectDto): Promise<ProjectEntity> {
    const existing = await this.prisma.project.findUnique({
      where: {
        id,
        workspaceId
      }
    });
    if (!existing) {
      throw new NotFoundException(ErrorCode.PROJECT_NOT_FOUND);
    }
    
    if(dto.key && dto.key !== existing.key) {
      const keyExists = await this.prisma.project.findUnique({
        where: {
          workspaceId_key: {
            workspaceId,
            key: dto.key,
          }
        }
      })
      if (keyExists) {
        throw new ConflictException(ErrorCode.PROJECT_KEY_EXISTS);
      }
    }  

    return this.prisma.project.update({
      where: {
        id
      },
      data: dto
    })
  }
  async remove(workspaceId: string, id: string): Promise<ProjectEntity> {
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
