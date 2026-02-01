import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceRolesGuard } from 'src/common/guards/workspace-roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { Role, type User } from 'generated/prisma/client';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { WorkspaceEntity } from './entities/workspace.entity';

@ApiTags('Workspace')
@Controller('workspace')
@UseGuards(SessionAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) { }

  @Get('me')
  @ApiOkResponse({ 
    description: 'Get all workspaces for the current user', 
    type: WorkspaceEntity 
  })
  findAllByUserId(@CurrentUser() user: User) {
    return this.workspaceService.findAllByUserId(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateWorkspaceDto: UpdateWorkspaceDto) {
    return this.workspaceService.update(id, updateWorkspaceDto);
  }

  @Delete(':id')
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.workspaceService.delete(id);
  }
}
