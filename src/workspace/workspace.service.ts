import { ConflictException, Injectable } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { PrismaService } from 'src/_prisma/prisma.service'

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllByUserId(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
  
  async create(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({
      where: { urlSlug: dto.urlSlug },
    });

    if (existing) {
      throw new ConflictException('Workspace with this URL slug already exists');
    }

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        urlSlug: dto.urlSlug,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'ADMIN'
          }
        }
      },
      include: { members: true }
    })
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    if (dto.urlSlug) {
      const existing = await this.prisma.workspace.findUnique({
        where: { urlSlug: dto.urlSlug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('URL Slug is already taken by another workspace');
      }
    }

    return this.prisma.workspace.update({
      where: { id },
      data: {
        ...dto
      }
    });
  }

  delete(id: string) {
    return `This action removes a #${id} workspace`;
  }
}
