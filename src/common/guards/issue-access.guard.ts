import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ErrorCode } from '../constants/error-codes';

@Injectable()
export class IssueAccessGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const issueId = request.params.issueId as string;
        const user = request.user;

        if (!issueId) return true;

        if (!user || !user.id) return false;

        const issue = await this.prisma.issue.findUnique({
            where: { id: issueId },
            select: {
                id: true,
                project: {
                    select: {
                        workspace: {
                            select: {
                                members: {
                                    where: { userId: user.id },
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!issue) {
            throw new NotFoundException(ErrorCode.ISSUE_NOT_FOUND);
        }
        const isMember = issue.project.workspace.members.length > 0;

        if (!isMember) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN);
        }
        
        request.issueId = issue.id;
        return true;
    }
}