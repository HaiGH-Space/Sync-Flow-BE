import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';

@Injectable()
export class ColumnService {
    constructor(private readonly prisma: PrismaService) { }
    findAll(projectId: string) {
        return this.prisma.column.findMany({
            where: {
                projectId,
            },
            orderBy: {
                order: 'asc',
            },
        });
    }
    create(projectId: string, dto: CreateColumnDto) {
        return this.prisma.column.create({
            data: {
                name: dto.name,
                order: dto.order,
                projectId
            },
        });
    }
}
