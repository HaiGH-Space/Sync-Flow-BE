import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { CurrentUser } from "src/common/decorators/user.decorator";
import type { User } from "generated/prisma/client";
import {
  ApiCommonErrors,
  ApiCreatedResponseGeneric,
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
  async getProfile(@CurrentUser() user: User) {
    return await this.userService.findOne(user.id);
  }

  @Patch("me")
  @ApiOkResponseGeneric(UserEntity)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(user.id, updateUserDto);
  }

  @Post()
  @ApiCreatedResponseGeneric(UserEntity)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
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

  @Get()
  @ApiOkResponseGeneric(UserEntity, true)
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(":id")
  @ApiOkResponseGeneric(UserEntity)
  async findOne(@Param("id") id: string) {
    return await this.userService.findOne(id);
  }

  @Delete(":id")
  @ApiOkResponseGeneric(UserEntity)
  async remove(@Param("id") id: string) {
    return await this.userService.remove(id);
  }
}
