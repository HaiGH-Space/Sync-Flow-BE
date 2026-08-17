import { Test, TestingModule } from '@nestjs/testing';
import { MeetingService } from './meeting.service';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from 'src/common/constants/error-codes';

describe('MeetingService', () => {
  let service: MeetingService;

  const mockPrismaService = {
    issue: {
      findUnique: jest.fn(),
    },
    meeting: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MeetingService>(MeetingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create standalone meeting when issueId is not provided', async () => {
      const dto = { title: 'Sync Call' };
      const createdMeeting = { id: 'meet-1', title: 'Sync Call' };
      mockPrismaService.meeting.create.mockResolvedValue(createdMeeting);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(createdMeeting);
      expect(mockPrismaService.meeting.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          issueId: undefined,
          participants: {
            create: { userId: 'user-1' },
          },
        },
      });
    });

    it('should throw NotFoundException if issueId provided but issue missing', async () => {
      const dto = { title: 'Issue Call', issueId: 'iss-99' };
      mockPrismaService.issue.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        new NotFoundException(ErrorCode.ISSUE_NOT_FOUND)
      );
    });

    it('should throw ForbiddenException if user is not in workspace of issue', async () => {
      const dto = { title: 'Issue Call', issueId: 'iss-1' };
      mockPrismaService.issue.findUnique.mockResolvedValue({
        id: 'iss-1',
        project: {
          workspace: {
            members: [],
          },
        },
      });

      await expect(service.create('user-1', dto)).rejects.toThrow(
        new ForbiddenException(ErrorCode.FORBIDDEN)
      );
    });

    it('should create meeting linked to issue when user is member of workspace', async () => {
      const dto = { title: 'Issue Call', issueId: 'iss-1' };
      mockPrismaService.issue.findUnique.mockResolvedValue({
        id: 'iss-1',
        project: {
          workspace: {
            members: [{ id: 'mem-1' }],
          },
        },
      });
      const createdMeeting = { id: 'meet-2', title: dto.title, issueId: dto.issueId };
      mockPrismaService.meeting.create.mockResolvedValue(createdMeeting);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(createdMeeting);
    });
  });
});
