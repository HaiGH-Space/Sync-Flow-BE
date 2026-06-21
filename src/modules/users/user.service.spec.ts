import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";
import { NotFoundException } from "@nestjs/common";
import { ErrorCode } from "src/common/constants/error-codes";

describe("UserService", () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn(),
    deleteFileByUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findOne", () => {
    it("should return the user if found", async () => {
      const mockUser = { id: "user-1", name: "John Doe", email: "john@example.com" };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne("user-1");

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("should throw NotFoundException if user is not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        new NotFoundException(ErrorCode.USER_NOT_FOUND)
      );
    });
  });
});
