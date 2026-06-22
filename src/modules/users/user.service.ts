import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ErrorCode } from "src/common/constants/error-codes";

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
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
