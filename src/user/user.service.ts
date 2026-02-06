import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/_prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    console.log(createUserDto);
    await this.prismaService.user.create({
      data: createUserDto
    })
    return 'This action adds a new user';
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
