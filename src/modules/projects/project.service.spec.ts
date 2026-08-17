import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from 'src/common/constants/error-codes';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project with default columns if key does not exist', async () => {
      const workspaceId = 'ws-1';
      const dto = { name: 'New Project', key: 'NEW', description: 'Desc' };
      const expectedResult = { id: 'proj-1', name: 'New Project', key: 'NEW', workspaceId, columns: [] };

      mockPrismaService.project.findUnique.mockResolvedValue(null);
      mockPrismaService.project.create.mockResolvedValue(expectedResult);

      const result = await service.create(workspaceId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { workspaceId_key: { workspaceId, key: 'NEW' } },
      });
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          key: dto.key,
          description: dto.description,
          workspaceId,
          columns: {
            createMany: {
              data: [
                { name: 'To Do', order: 1 },
                { name: 'In Progress', order: 2 },
                { name: 'Done', order: 3 },
              ],
            },
          },
        },
        include: { columns: true },
      });
    });

    it('should throw ConflictException if project key exists in workspace', async () => {
      const workspaceId = 'ws-1';
      const dto = { name: 'New Project', key: 'EXISTING' };
      mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj-existing' });

      await expect(service.create(workspaceId, dto)).rejects.toThrow(
        new ConflictException(ErrorCode.PROJECT_KEY_EXISTS)
      );
    });
  });

  describe('findAllByWorkspace', () => {
    it('should return paginated projects with total count', async () => {
      const workspaceId = 'ws-1';
      const mockProjects = [{ id: 'proj-1', name: 'P1' }];
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaService.project.count.mockResolvedValue(1);

      const result = await service.findAllByWorkspace(workspaceId, { page: 1, limit: 20 });

      expect(result).toEqual({ items: mockProjects, total: 1, page: 1, limit: 20 });
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        skip: 0,
        take: 20,
      });
    });

    it('should skip count query if includeTotal is false', async () => {
      const workspaceId = 'ws-1';
      mockPrismaService.project.findMany.mockResolvedValue([]);

      const result = await service.findAllByWorkspace(workspaceId, { includeTotal: false });

      expect(result.total).toBeUndefined();
      expect(mockPrismaService.project.count).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if project to update does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.update('ws-1', 'proj-99', { name: 'Updated' })).rejects.toThrow(
        new NotFoundException(ErrorCode.PROJECT_NOT_FOUND)
      );
    });

    it('should throw ConflictException if updated key conflicts with existing project', async () => {
      const existing = { id: 'proj-1', key: 'OLD' };
      mockPrismaService.project.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: 'proj-2', key: 'TAKEN' });

      await expect(service.update('ws-1', 'proj-1', { key: 'TAKEN' })).rejects.toThrow(
        new ConflictException(ErrorCode.PROJECT_KEY_EXISTS)
      );
    });

    it('should update project when valid', async () => {
      const existing = { id: 'proj-1', key: 'OLD' };
      const updated = { id: 'proj-1', key: 'OLD', name: 'New Name' };
      mockPrismaService.project.findUnique.mockResolvedValue(existing);
      mockPrismaService.project.update.mockResolvedValue(updated);

      const result = await service.update('ws-1', 'proj-1', { name: 'New Name' });

      expect(result).toEqual(updated);
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { name: 'New Name' },
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if project to delete does not exist', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.remove('ws-1', 'proj-99')).rejects.toThrow(
        new NotFoundException(ErrorCode.PROJECT_NOT_FOUND)
      );
    });

    it('should delete project if found', async () => {
      const existing = { id: 'proj-1', workspaceId: 'ws-1' };
      mockPrismaService.project.findFirst.mockResolvedValue(existing);
      mockPrismaService.project.delete.mockResolvedValue(existing);

      const result = await service.remove('ws-1', 'proj-1');

      expect(result).toEqual(existing);
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
    });
  });
});
