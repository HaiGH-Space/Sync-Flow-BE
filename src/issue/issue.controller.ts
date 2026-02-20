import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { ApiCommonErrors, ApiCreatedResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { ApiTags } from '@nestjs/swagger';
import { IssueEntity } from './entities/issue.entity';

@ApiTags('Issue')
@Controller('issues')
@UseGuards(SessionAuthGuard)
@ApiCommonErrors()
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Post()
  @ApiCreatedResponseGeneric(IssueEntity)
  create(@Body() createIssueDto: CreateIssueDto) {
    return this.issueService.create(createIssueDto);
  }
}
