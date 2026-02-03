import { Controller, Post, Body, Patch, Param, Delete, UseGuards, Get } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ApiTags } from '@nestjs/swagger';
import { Role } from 'generated/prisma/client';
import { WorkspaceRolesGuard } from 'src/common/guards/workspace-roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ProjectEntity } from './entities/project.entity';

@ApiTags('Projects')
@Controller('workspaces/:workspaceId/projects')
@ApiCommonErrors()
@UseGuards(SessionAuthGuard, WorkspaceRolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOkResponseGeneric(ProjectEntity, true)
  Get(@Param('workspaceId') workspaceId: string) {
    return this.projectService.findAllByWorkspace(workspaceId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCreatedResponseGeneric(ProjectEntity)
  create(@Param('workspaceId') workspaceId: string, @Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(workspaceId, createProjectDto);
  }

  @Patch(':projectId')
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(ProjectEntity)
  update(@Param('projectId') projectId: string, @Param('workspaceId') workspaceId: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(projectId, workspaceId, updateProjectDto);
  }

  @Delete(':projectId')
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(ProjectEntity)
  remove(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string) {
    return this.projectService.remove(workspaceId, projectId);
  }
}
