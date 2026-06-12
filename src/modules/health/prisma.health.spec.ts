/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma.health.js';
import { PrismaService } from '../../database/prisma/prisma.service';
import { HealthCheckError } from '@nestjs/terminus';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should return healthy status when database ping succeeds', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '1': 1 }]);
    const result = await indicator.isHealthy('database');
    expect(result).toEqual({
      database: { status: 'up' },
    });
    expect(prismaService.$queryRaw).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('SELECT 1')]),
    );
  });

  it('should throw HealthCheckError when database ping fails', async () => {
    mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failure'));
    await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
  });
});
