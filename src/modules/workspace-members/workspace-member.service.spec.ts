import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMemberService } from './workspace-member.service';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('WorkspaceMemberService', () => {
  let service: WorkspaceMemberService;

  const mockPrismaService = {
    workspaceMember: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceMemberService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WorkspaceMemberService>(WorkspaceMemberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllUsersInWorkspace', () => {
    it('should return list of users in workspace', async () => {
      const mockMembers = [
        {
          user: {
            id: 'user-1',
            name: 'User One',
            email: 'one@example.com',
            image: null,
            emailVerified: true,
          },
        },
        {
          user: {
            id: 'user-2',
            name: 'User Two',
            email: 'two@example.com',
            image: 'http://img.jpg',
            emailVerified: false,
          },
        },
      ];
      mockPrismaService.workspaceMember.findMany.mockResolvedValue(mockMembers);

      const result = await service.findAllUsersInWorkspace('ws-1');

      expect(result).toEqual([mockMembers[0].user, mockMembers[1].user]);
      expect(mockPrismaService.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              emailVerified: true,
            },
          },
        },
      });
    });
  });
});
