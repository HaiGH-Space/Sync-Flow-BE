/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health.js';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthCheckService;
  let prismaIndicator: PrismaHealthIndicator;

  const mockHealthCheckService = {
    check: jest.fn((checks) => {
      return Promise.all(checks.map((c) => c())).then((results) => {
        return {
          status: 'ok',
          info: Object.assign({}, ...results),
          error: {},
          details: Object.assign({}, ...results),
        };
      });
    }),
  };

  const mockPrismaHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({
      database: { status: 'up' },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
    prismaIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  it('should call health check with prisma health check indicator', async () => {
    const result = await controller.check();
    expect(healthService.check).toHaveBeenCalled();
    expect(prismaIndicator.isHealthy).toHaveBeenCalledWith('database');
    expect(result).toEqual({
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    });
  });
});
