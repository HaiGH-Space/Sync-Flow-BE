import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { WorkspaceMemberService } from "./workspace-member.service";
import { ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { WorkspaceRolesGuard } from "src/common/guards/workspace-roles.guard";
import {
  ApiCommonErrors,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { WorkspaceMemberProfileDto } from "./dto/workspace-member-profile.dto";

@ApiTags("Workspace member")
@UseGuards(SessionAuthGuard, WorkspaceRolesGuard)
@ApiCommonErrors()
@Controller("workspaces/:workspaceId/members")
export class WorkspaceMemberController {
  constructor(
    private readonly workspaceMemberService: WorkspaceMemberService,
  ) {}

  @Get("profile")
  @ApiOkResponseGeneric(WorkspaceMemberProfileDto, true)
  findAll(@Param("workspaceId") workspaceId: string) {
    return this.workspaceMemberService.findAllUsersInWorkspace(workspaceId);
  }
}
