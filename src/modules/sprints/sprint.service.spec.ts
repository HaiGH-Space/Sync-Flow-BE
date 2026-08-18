import { Test, TestingModule } from '@nestjs/testing';
import { SprintService } from './sprint.service';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SprintService', () => {
  let service: SprintService;

  const mockPrismaService = {
    sprint: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SprintService>(SprintService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a sprint with projectId', async () => {
      const dto = { name: 'Sprint 1', goal: 'Initial sprint' };
      const createdSprint = { id: 'sprint-1', projectId: 'proj-1', ...dto };
      mockPrismaService.sprint.create.mockResolvedValue(createdSprint);

      const result = await service.create(dto, 'proj-1');

      expect(result).toEqual(createdSprint);
      expect(mockPrismaService.sprint.create).toHaveBeenCalledWith({
        data: { ...dto, projectId: 'proj-1' },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated sprints', async () => {
      const mockSprints = [{ id: 'sprint-1', name: 'Sprint 1' }];
      mockPrismaService.sprint.findMany.mockResolvedValue(mockSprints);
      mockPrismaService.sprint.count.mockResolvedValue(1);

      const result = await service.findAll('proj-1', { page: 1, limit: 20 });

      expect(result).toEqual({ items: mockSprints, total: 1, page: 1, limit: 20 });
      expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        skip: 0,
        take: 20,
      });
    });

    it('should skip count if includeTotal is false', async () => {
      mockPrismaService.sprint.findMany.mockResolvedValue([]);

      const result = await service.findAll('proj-1', { includeTotal: false });

      expect(result.total).toBeUndefined();
      expect(mockPrismaService.sprint.count).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if sprint not found or project mismatch', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(null);

      await expect(service.update('proj-1', 'sprint-99', { name: 'Updated' })).rejects.toThrow(
        new NotFoundException('Sprint not found')
      );
    });

    it('should update sprint if valid', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue({ id: 'sprint-1', projectId: 'proj-1' });
      const updated = { id: 'sprint-1', projectId: 'proj-1', name: 'Updated' };
      mockPrismaService.sprint.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', 'sprint-1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockPrismaService.sprint.update).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        data: { name: 'Updated' },
      });
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if sprint not found', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(null);

      await expect(service.delete('proj-1', 'sprint-99')).rejects.toThrow(
        new NotFoundException('Sprint not found')
      );
    });

    it('should delete sprint if valid', async () => {
      const existing = { id: 'sprint-1', projectId: 'proj-1' };
      mockPrismaService.sprint.findUnique.mockResolvedValue(existing);
      mockPrismaService.sprint.delete.mockResolvedValue(existing);

      const result = await service.delete('proj-1', 'sprint-1');

      expect(result).toEqual(existing);
      expect(mockPrismaService.sprint.delete).toHaveBeenCalledWith({ where: { id: 'sprint-1' } });
    });
  });
});
