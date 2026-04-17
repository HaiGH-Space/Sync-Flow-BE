import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    return this.prismaService.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        image: createUserDto.image ?? null,
      },
    });
  }

  async findAll() {
    return await this.prismaService.user.findMany();
  }

  async findOne(id: string) {
    return await this.prismaService.user.findUnique({
      where: { id }
    });
  }

  async remove(id: string) {
    return await this.prismaService.user.delete({
      where: { id }
    });
  }
}
