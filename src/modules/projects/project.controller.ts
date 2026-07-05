import { Controller, Post, Body, Patch, Param, Delete, UseGuards, Get, Query } from '@nestjs/common';
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
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ApiOkResponsePaginated } from 'src/common/decorators/api-common-responses.decorator';

@ApiTags('Projects')
@Controller('workspaces/:workspaceId/projects')
@ApiCommonErrors()
@UseGuards(SessionAuthGuard, WorkspaceRolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOkResponsePaginated(ProjectEntity)
  findAll(@Param('workspaceId') workspaceId: string, @Query() query: PaginationQueryDto) {
    return this.projectService.findAllByWorkspace(workspaceId, query);
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
  update(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string,@Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(workspaceId, projectId, updateProjectDto);
  }

  @Delete(':projectId')
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(ProjectEntity)
  remove(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string) {
    return this.projectService.remove(workspaceId, projectId);
  }
}
