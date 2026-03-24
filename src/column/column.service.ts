import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/_prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { Prisma } from 'generated/prisma/client';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnService {
    constructor(private readonly prisma: PrismaService) { }
    async update(dto: UpdateColumnDto, columnId: string) {
        try {
            return await this.prisma.column.update({
                data: dto,
                where: {
                    id: columnId,
                }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Order already exists in this project');
                } else {
                    throw new InternalServerErrorException('An error occurred');
                }
            }

            throw new InternalServerErrorException('An error occurred');
        }
    }
    async findAll(projectId: string) {
        return this.prisma.column.findMany({
            where: {
                projectId,
            },
            orderBy: {
                order: 'asc',
            },
        });
    }
    async create(projectId: string, dto: CreateColumnDto) {
        try {
            return await this.prisma.column.create({
                data: {
                    name: dto.name,
                    order: dto.order,
                    projectId
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException('Order already exists in this project');
                } else {
                    throw new InternalServerErrorException('An error occurred');
                }
            }

            throw new InternalServerErrorException('An error occurred');
        }
    }
}
