import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/_prisma/prisma.service';

@Injectable()
export class WorkspaceMemberService {
  constructor(private readonly prisma: PrismaService) { }
  async findAllUsersInWorkspace(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
          }
        }
      }
    });
    return members.map(m => m.user);
  }
}
