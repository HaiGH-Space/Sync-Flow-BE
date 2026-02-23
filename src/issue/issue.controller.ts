import { Controller, Post, Body, UseGuards, Patch, Param, Get, Delete } from '@nestjs/common';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ApiTags } from '@nestjs/swagger';
import { IssueEntity, IssueWithAssigneeEntity } from './entities/issue.entity';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { CurrentProject } from 'src/common/decorators/project.decorator';
import { Role, type User, type Project } from 'generated/prisma/client';
import { ProjectAccessGuard } from 'src/common/guards/project-access.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/user.decorator';

@ApiTags('Issues')
@Controller('projects/:projectId/issues')
@UseGuards(SessionAuthGuard, ProjectAccessGuard)
@ApiCommonErrors()
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  @ApiOkResponseGeneric(IssueWithAssigneeEntity, true)
  findAll(@CurrentProject() project: Project) {
    return this.issueService.findAll(project.id);
  }

  @Post()
  @ApiCreatedResponseGeneric(IssueEntity)
  create(@Body() createIssueDto: CreateIssueDto, @CurrentProject() project: Project, @CurrentUser() user: User) {
    return this.issueService.create(user.id, project.id, createIssueDto);
  }

  @Patch(':id')
  @ApiOkResponseGeneric(IssueEntity)
  update(@Param('id') id: string,@Body() updateIssueDto: UpdateIssueDto) {
    return this.issueService.update(id, updateIssueDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(IssueEntity)
  delete(@Param('id') id: string) {
    return this.issueService.delete(id);
  }
}
