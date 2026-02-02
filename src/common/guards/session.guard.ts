import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from 'express';
import { PrismaService } from "src/_prisma/prisma.service";
import { ErrorCode } from "../constants/error-codes";

@Injectable()
export class SessionAuthGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization

        if(!authHeader) {
            throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        const session = await this.prisma.session.findUnique({
            where: { token: token },
            include: { user: true },
        })

        if (!session) {
            throw new UnauthorizedException(ErrorCode.SESSION_INVALID_OR_EXPIRED);
        }

        request.user = session.user;
        return true;
    }

}