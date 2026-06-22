import { Test, TestingModule } from "@nestjs/testing";
import { IssueService } from "./issue.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";
import { ErrorCode } from "src/common/constants/error-codes";

describe("IssueService", () => {
  let service: IssueService;

  const mockPrismaService = {
    issue: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<IssueService>(IssueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findOne", () => {
    it("should return the issue if found", async () => {
      const mockIssue = { id: "issue-1", title: "Test Issue", assignee: null };
      mockPrismaService.issue.findUnique.mockResolvedValue(mockIssue);

      const result = await service.findOne("issue-1");

      expect(result).toEqual(mockIssue);
      expect(mockPrismaService.issue.findUnique).toHaveBeenCalledWith({
        where: { id: "issue-1" },
        include: { assignee: true },
      });
    });

    it("should throw NotFoundException if issue is not found", async () => {
      mockPrismaService.issue.findUnique.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        new NotFoundException(ErrorCode.ISSUE_NOT_FOUND)
      );
    });
  });
});
