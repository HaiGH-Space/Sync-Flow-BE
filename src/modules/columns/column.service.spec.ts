import { Test, TestingModule } from '@nestjs/testing';
import { ColumnService } from './column.service';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

describe('ColumnService', () => {
  let service: ColumnService;

  const mockPrismaService = {
    column: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ColumnService>(ColumnService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return columns ordered by order asc', async () => {
      const mockColumns = [{ id: 'col-1', name: 'To Do', order: 1 }];
      mockPrismaService.column.findMany.mockResolvedValue(mockColumns);

      const result = await service.findAll('proj-1');

      expect(result).toEqual(mockColumns);
      expect(mockPrismaService.column.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a new column', async () => {
      const dto = { name: 'In Review', order: 2 };
      const expectedColumn = { id: 'col-2', projectId: 'proj-1', ...dto };
      mockPrismaService.column.create.mockResolvedValue(expectedColumn);

      const result = await service.create('proj-1', dto);

      expect(result).toEqual(expectedColumn);
      expect(mockPrismaService.column.create).toHaveBeenCalledWith({
        data: { name: dto.name, order: dto.order, projectId: 'proj-1' },
      });
    });

    it('should throw ConflictException on P2002 duplicate order error', async () => {
      const dto = { name: 'In Review', order: 2 };
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '7.3.0',
      });
      mockPrismaService.column.create.mockRejectedValue(p2002Error);

      await expect(service.create('proj-1', dto)).rejects.toThrow(
        new ConflictException('Order already exists in this project')
      );
    });

    it('should throw InternalServerErrorException on unknown Prisma error', async () => {
      const p2003Error = new Prisma.PrismaClientKnownRequestError('Foreign key failed', {
        code: 'P2003',
        clientVersion: '7.3.0',
      });
      mockPrismaService.column.create.mockRejectedValue(p2003Error);

      await expect(service.create('proj-1', { name: 'Col', order: 1 })).rejects.toThrow(
        new InternalServerErrorException('An error occurred')
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if column not found or project mismatch', async () => {
      mockPrismaService.column.findUnique.mockResolvedValue(null);

      await expect(service.update('proj-1', 'col-99', { name: 'Updated' })).rejects.toThrow(
        new NotFoundException('Column not found')
      );
    });

    it('should update column when valid', async () => {
      mockPrismaService.column.findUnique.mockResolvedValue({ id: 'col-1', projectId: 'proj-1' });
      const updatedColumn = { id: 'col-1', projectId: 'proj-1', name: 'Updated' };
      mockPrismaService.column.update.mockResolvedValue(updatedColumn);

      const result = await service.update('proj-1', 'col-1', { name: 'Updated' });

      expect(result).toEqual(updatedColumn);
      expect(mockPrismaService.column.update).toHaveBeenCalledWith({
        data: { name: 'Updated' },
        where: { id: 'col-1' },
      });
    });

    it('should throw ConflictException if update triggers P2002 error', async () => {
      mockPrismaService.column.findUnique.mockResolvedValue({ id: 'col-1', projectId: 'proj-1' });
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '7.3.0',
      });
      mockPrismaService.column.update.mockRejectedValue(p2002Error);

      await expect(service.update('proj-1', 'col-1', { order: 1 })).rejects.toThrow(
        new ConflictException('Order already exists in this project')
      );
    });
  });
});
