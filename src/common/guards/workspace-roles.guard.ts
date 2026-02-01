import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "generated/prisma/enums";
import { PrismaService } from "src/_prisma/prisma.service";
import { ROLES_KEY } from "src/common/decorators/roles.decorator";
import { Request } from 'express';


@Injectable()
export class WorkspaceRolesGuard implements CanActivate {

    constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;
        const workspaceId = request.params.id as string;
        if (!user || !workspaceId) {
            throw new ForbiddenException('User or Workspace Context missing');
        }

        const member = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: workspaceId,
                    userId: user.id,
                }
            },
        });

        if (!member) {
            throw new ForbiddenException('You are not a member of this workspace');
        }
        if (!requiredRoles.includes(member.role)) {
            throw new ForbiddenException(`User requires roles: ${requiredRoles.join(', ')}`);
        }

        return true;
    }
}