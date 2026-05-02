import { Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
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
      where: { id },
    });
  }

  async remove(id: string) {
    return await this.prismaService.user.delete({
      where: { id },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file);
    return await this.prismaService.user.update({
      where: { id: userId },
      data: {
        image: result.secure_url,
      },
    });
  }
}
