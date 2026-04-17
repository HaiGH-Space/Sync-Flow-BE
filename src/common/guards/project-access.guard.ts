import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { ErrorCode } from "../constants/error-codes";
import { Request } from "express";
import { Reflector } from "@nestjs/core";
import { Role } from "generated/prisma/enums";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class ProjectAccessGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) { }
    async canActivate(context: ExecutionContext,): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const { projectId } = request.params as { projectId?: string, workspaceId?: string };
        const userId = request.user?.id;
        if (!projectId || !userId) return true;
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
            },
            include: {
                workspace: {
                    select: {
                        members: {
                            where: {
                                userId,
                            },
                        }
                    }
                }
            }
        });

        if (!project) {
            throw new ForbiddenException(ErrorCode.PROJECT_NOT_FOUND);
        }

        if(project.workspace.members.length === 0) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }

        const userRole = project.workspace.members[0].role;

        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (requiredRoles && !requiredRoles.includes(userRole)) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { workspace, ...cleanProject } = project;
        request.currentProject = cleanProject;
        return true;
    }
}