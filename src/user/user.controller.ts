import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import type { User } from 'generated/prisma/client';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(SessionAuthGuard)
@ApiCommonErrors()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOkResponseGeneric(UserEntity)
  async getProfile(@CurrentUser() user: User) {
    return await this.userService.findOne(user.id);
  }

  @Post()
  @ApiCreatedResponseGeneric(UserEntity)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @ApiOkResponseGeneric(UserEntity, true)
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  @ApiOkResponseGeneric(UserEntity)
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }

  @Delete(':id')
  @ApiOkResponseGeneric(UserEntity)
  async remove(@Param('id') id: string) {
    return await this.userService.remove(id);
  }
}
