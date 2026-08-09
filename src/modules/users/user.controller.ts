import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "./user.service";
import { CurrentUser } from "src/common/decorators/user.decorator";
import type { User } from "generated/prisma/client";
import {
  ApiCommonErrors,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { ApiTags } from "@nestjs/swagger";
import { UserEntity } from "./entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";
import { ALLOWED_IMAGE_MIME_TYPES } from "src/providers/cloudinary/cloudinary.service";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("Users")
@Controller("users")
@UseGuards(SessionAuthGuard)
@ApiCommonErrors()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOkResponseGeneric(UserEntity)
  async getProfile(@Req() req: Request, @CurrentUser() user: User) {
    const userProfile = await this.userService.findOne(user.id);
    const token = (req as unknown as { sessionToken?: string }).sessionToken;
    return {
      ...userProfile,
      token,
    };
  }

  @Patch("me")
  @ApiOkResponseGeneric(UserEntity)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(user.id, updateUserDto);
  }

  @Post("me/avatar")
  @ApiOkResponseGeneric(UserEntity)
  @UseInterceptors(FileInterceptor("file"))
  async updateMyAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_MIME_TYPES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(user.id, file);
  }

  @Delete("me/avatar")
  @ApiOkResponseGeneric(UserEntity)
  async deleteMyAvatar(@CurrentUser() user: User) {
    return this.userService.deleteAvatar(user.id);
  }
}
