import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ColumnService } from './column.service';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ProjectAccessGuard } from 'src/common/guards/project-access.guard';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { ApiTags } from '@nestjs/swagger';
import { CurrentProject } from 'src/common/decorators/project.decorator';
import { ColumnEntity } from './entities/column.entity';
import type { Project } from 'generated/prisma/client';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@ApiTags('Columns')
@Controller('projects/:projectId/columns')
@UseGuards(SessionAuthGuard, ProjectAccessGuard)
@ApiCommonErrors()
export class ColumnController {
  constructor(private readonly columnService: ColumnService) { }
  @Get()
  @ApiOkResponseGeneric(ColumnEntity, true)
  findAll(@CurrentProject() project: Project) {
    return this.columnService.findAll(project.id);
  }

  @Post()
  @ApiCreatedResponseGeneric(ColumnEntity)
  create(@CurrentProject() project: Project,@Body() dto: CreateColumnDto) {
    return this.columnService.create(project.id, dto);
  }

  @Patch(':columnId')
  update(@Param('projectId') projectId: string, @Param('columnId') columnId: string, @Body() dto: UpdateColumnDto) {
    return this.columnService.update(projectId, columnId, dto);
  }
}
