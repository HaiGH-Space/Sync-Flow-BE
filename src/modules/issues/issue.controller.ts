import { Controller, Post, Body, UseGuards, Patch, Param, Get, Delete, Query } from '@nestjs/common';
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
import { IssueAccessGuard } from 'src/common/guards/issue-access.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ApiOkResponsePaginated } from 'src/common/decorators/api-common-responses.decorator';

@ApiTags('Issues')
@Controller('projects/:projectId/issues')
@UseGuards(SessionAuthGuard, ProjectAccessGuard)
@ApiCommonErrors()
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  @ApiOkResponsePaginated(IssueWithAssigneeEntity)
  findAll(@CurrentProject() project: Project, @Query() query: PaginationQueryDto) {
    return this.issueService.findAll(project.id, query);
  }

  @Get(':issueId')
  @UseGuards(IssueAccessGuard)
  @ApiOkResponseGeneric(IssueWithAssigneeEntity)
  findOne(@Param('issueId') id: string) {
    return this.issueService.findOne(id);
  }

  @Post()
  @ApiCreatedResponseGeneric(IssueEntity)
  create(@Body() createIssueDto: CreateIssueDto, @CurrentProject() project: Project, @CurrentUser() user: User) {
    return this.issueService.create(user.id, project.id, createIssueDto);
  }

  @Patch(':issueId')
  @UseGuards(IssueAccessGuard)
  @ApiOkResponseGeneric(IssueEntity)
  update(@Param('issueId') id: string,@Body() updateIssueDto: UpdateIssueDto) {
    return this.issueService.update(id, updateIssueDto);
  }

  @Delete(':issueId')
  @Roles(Role.ADMIN)
  @UseGuards(IssueAccessGuard)
  @ApiOkResponseGeneric(IssueEntity)
  delete(@Param('issueId') id: string) {
    return this.issueService.delete(id);
  }
}
