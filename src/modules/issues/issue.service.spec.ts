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
      findMany: jest.fn(),
      count: jest.fn(),
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

  describe("findAll", () => {
    it("should return paginated issues for a project", async () => {
      const mockIssues = [{ id: "issue-1", title: "Test Issue", assignee: null }];
      mockPrismaService.issue.findMany.mockResolvedValue(mockIssues);
      mockPrismaService.issue.count.mockResolvedValue(1);

      const result = await service.findAll("project-1", { page: 1, limit: 20 });

      expect(result).toEqual({
        items: mockIssues,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockPrismaService.issue.findMany).toHaveBeenCalledWith({
        where: { projectId: "project-1" },
        include: { assignee: true },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(mockPrismaService.issue.count).toHaveBeenCalledWith({
        where: { projectId: "project-1" },
      });
    });

    it("should skip count query when includeTotal is false", async () => {
      const mockIssues = [{ id: "issue-1", title: "Test Issue", assignee: null }];
      mockPrismaService.issue.findMany.mockResolvedValue(mockIssues);

      const result = await service.findAll("project-1", { page: 1, limit: 20, includeTotal: false });

      expect(result).toEqual({
        items: mockIssues,
        total: undefined,
        page: 1,
        limit: 20,
      });
      expect(mockPrismaService.issue.count).not.toHaveBeenCalled();
    });
  });
});
