import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findOne(id: string) {
    return await this.prismaService.user.findUnique({
      where: { id },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (user?.image) {
      await this.cloudinaryService.deleteFileByUrl(user.image);
    }

    const result = await this.cloudinaryService.uploadFile(file);
    return await this.prismaService.user.update({
      where: { id: userId },
      data: {
        image: result.secure_url,
      },
    });
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    return await this.prismaService.user.update({
      where: { id: userId },
      data: updateUserDto,
    });
  }

  async deleteAvatar(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (user?.image) {
      await this.cloudinaryService.deleteFileByUrl(user.image);
    }

    return await this.prismaService.user.update({
      where: { id: userId },
      data: { image: null },
    });
  }
}
