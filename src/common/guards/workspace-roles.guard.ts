import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "generated/prisma/enums";
import { PrismaService } from "src/_prisma/prisma.service";
import { ROLES_KEY } from "src/common/decorators/roles.decorator";
import { Request } from 'express';
import { ErrorCode } from "../constants/error-codes";


@Injectable()
export class WorkspaceRolesGuard implements CanActivate {

    constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;
        const workspaceId = request.params.workspaceId as string;
        if (!user || !workspaceId) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
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
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }
         const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        
        if (!requiredRoles) {
            return true;
        }

        if (!requiredRoles.includes(member.role)) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }
        return true;
    }
}