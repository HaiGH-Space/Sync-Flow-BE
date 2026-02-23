import { Body, Controller, Post, UseGuards} from '@nestjs/common';
import { SprintService } from './sprint.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrors } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ProjectAccessGuard } from 'src/common/guards/project-access.guard';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { CurrentProject } from 'src/common/decorators/project.decorator';
import type { Project } from 'generated/prisma/client';

@Controller('projects/:projectId/sprints')
@ApiTags('Sprints')
@ApiCommonErrors()
@UseGuards(SessionAuthGuard, ProjectAccessGuard)
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post()
  create(@Body() dto: CreateSprintDto, @CurrentProject() project: Project) {
    return this.sprintService.create(dto, project.id);
  }
}
