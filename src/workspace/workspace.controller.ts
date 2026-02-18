import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceRolesGuard } from 'src/common/guards/workspace-roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { Role, type User } from 'generated/prisma/client';
import { SessionAuthGuard } from 'src/common/guards/session.guard';
import { WorkspaceEntity } from './entities/workspace.entity';
import { ApiCommonErrors, ApiCreatedResponseGeneric, ApiOkResponseGeneric } from 'src/common/decorators/api-common-responses.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { BooleanEntity } from 'src/common/entities/boolean.entity';

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(SessionAuthGuard)
@ApiCommonErrors()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) { }

  @Get('me')
  @ApiOkResponseGeneric(WorkspaceEntity, true)
  findAllByUserId(@CurrentUser() user: User) {
    return this.workspaceService.findAllByUserId(user.id);
  }
  
  @Post('invitations/accept')
  @ApiOkResponseGeneric(BooleanEntity)
  acceptInvite(@Body() dto: AcceptInviteDto, @CurrentUser() user: User) {
    return this.workspaceService.acceptInvite(user.id, dto.token);
  }

  @Post()
  @ApiCreatedResponseGeneric(WorkspaceEntity)
  create(@CurrentUser() user: User, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(user.id, dto);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(WorkspaceEntity)
  update(@Param('workspaceId') workspaceId: string, @Body() updateWorkspaceDto: UpdateWorkspaceDto) {
    return this.workspaceService.update(workspaceId, updateWorkspaceDto);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(WorkspaceEntity)
  delete(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.delete(workspaceId);
  }

  @Post(':workspaceId/invitations')
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponseGeneric(BooleanEntity)
  invite(@Param('workspaceId') workspaceId: string, @Body() dto: CreateInviteDto) {
    return this.workspaceService.inviteMember(workspaceId, dto.email, dto.role);
  }
}