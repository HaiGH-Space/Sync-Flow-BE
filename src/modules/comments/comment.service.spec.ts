import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from 'src/common/constants/error-codes';

describe('CommentService', () => {
  let service: CommentService;

  const mockPrismaService = {
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a comment', async () => {
      const dto = { content: 'Nice issue' };
      const mockComment = { id: 'comm-1', content: dto.content, issueId: 'iss-1', userId: 'user-1' };
      mockPrismaService.comment.create.mockResolvedValue(mockComment);

      const result = await service.create('iss-1', 'user-1', dto);

      expect(result).toEqual(mockComment);
      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: { content: dto.content, issueId: 'iss-1', userId: 'user-1' },
      });
    });
  });

  describe('findAllByIssue', () => {
    it('should return comments for issue ordered by createdAt asc', async () => {
      const mockComments = [{ id: 'comm-1', content: 'Test', user: { id: 'u1', name: 'N', image: null } }];
      mockPrismaService.comment.findMany.mockResolvedValue(mockComments);

      const result = await service.findAllByIssue('iss-1');

      expect(result).toEqual(mockComments);
      expect(mockPrismaService.comment.findMany).toHaveBeenCalledWith({
        where: { issueId: 'iss-1' },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if comment missing', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', 'comm-99', { content: 'Updated' })).rejects.toThrow(
        new NotFoundException(ErrorCode.COMMENT_NOT_FOUND)
      );
    });

    it('should throw ForbiddenException if user is not author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({ userId: 'other-user' });

      await expect(service.update('user-1', 'comm-1', { content: 'Updated' })).rejects.toThrow(
        new ForbiddenException(ErrorCode.FORBIDDEN)
      );
    });

    it('should update comment if user is author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({ userId: 'user-1' });
      const updated = { id: 'comm-1', content: 'Updated' };
      mockPrismaService.comment.update.mockResolvedValue(updated);

      const result = await service.update('user-1', 'comm-1', { content: 'Updated' });

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if comment missing', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'comm-99')).rejects.toThrow(
        new NotFoundException(ErrorCode.COMMENT_NOT_FOUND)
      );
    });

    it('should throw ForbiddenException if user is not author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({ userId: 'other-user' });

      await expect(service.remove('user-1', 'comm-1')).rejects.toThrow(
        new ForbiddenException(ErrorCode.FORBIDDEN)
      );
    });

    it('should delete comment if user is author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({ userId: 'user-1' });
      const deleted = { id: 'comm-1' };
      mockPrismaService.comment.delete.mockResolvedValue(deleted);

      const result = await service.remove('user-1', 'comm-1');

      expect(result).toEqual(deleted);
    });
  });
});
