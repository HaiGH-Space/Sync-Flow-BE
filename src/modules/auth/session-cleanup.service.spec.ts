import { Test, TestingModule } from "@nestjs/testing";
import { SessionCleanupService } from "src/modules/auth/session-cleanup.service";
import { PrismaService } from "src/database/prisma/prisma.service";

describe("SessionCleanupService", () => {
  let service: SessionCleanupService;
  let prisma: PrismaService;

  const mockPrismaService = {
    session: {
      deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SessionCleanupService>(SessionCleanupService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should delete expired sessions and log success", async () => {
    await service.cleanExpiredSessions();
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: {
          lt: expect.any(Date),
        },
      },
    });
  });

  it("should handle errors gracefully without throwing", async () => {
    mockPrismaService.session.deleteMany.mockRejectedValueOnce(
      new Error("DB error"),
    );
    await expect(service.cleanExpiredSessions()).resolves.not.toThrow();
  });
});
