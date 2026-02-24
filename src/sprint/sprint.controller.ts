import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SprintService } from './sprint.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ProjectAccessGuard } from 'src/common/guards/project-access.guard';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { CurrentProject } from 'src/common/decorators/project.decorator';
import { Role, type Project } from 'generated/prisma/client';
import { SprintEntity } from './entities/sprint.entity';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@Controller('projects/:projectId/sprints')
@ApiTags('Sprints')
@ApiCommonErrors()
@UseGuards(SessionAuthGuard, ProjectAccessGuard)
export class SprintController {
  constructor(private readonly sprintService: SprintService) { }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCreatedResponseGeneric(SprintEntity)
  create(@Body() dto: CreateSprintDto, @CurrentProject() project: Project) {
    return this.sprintService.create(dto, project.id);
  }
  @Get()
  @ApiOkResponseGeneric(SprintEntity, true)
  findAll(@Param('projectId') projectId: string) {
    return this.sprintService.findAll(projectId);
  }

  @Delete(':sprintId')
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(SprintEntity)
  delete(@Param('sprintId') sprintId: string) {
    return this.sprintService.delete(sprintId);
  }

  @Patch(':sprintId')
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(SprintEntity)
  update(@Param('sprintId') sprintId: string, @Body() dto: UpdateSprintDto) {
    return this.sprintService.update(sprintId, dto);
  }
}