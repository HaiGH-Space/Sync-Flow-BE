import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/_prisma/prisma.service";
import { ErrorCode } from "../constants/error-codes";
import { Request } from "express";

@Injectable()
export class ProjectAccessGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const { projectId } = request.params as { projectId?: string, workspaceId?: string };
        const userId = request.user?.id;
        if (!projectId || !userId) return true;
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                workspace: {
                    members: {
                        some: {
                            userId: userId
                        }
                    }
                }
            }
        });
        if (!project) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }
        request.currentProject = project;
        return true;
    }
}