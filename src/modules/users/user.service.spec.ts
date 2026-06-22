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

  describe("updateAvatar", () => {
    it("should delete old avatar if it exists, upload new, and update database", async () => {
      const mockFile = { buffer: Buffer.from("new-avatar") } as Express.Multer.File;
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-1", image: "old-url" });
      mockCloudinaryService.uploadFile.mockResolvedValue({ secure_url: "new-url" });
      mockPrismaService.user.update.mockResolvedValue({ id: "user-1", image: "new-url" });

      const result = await service.updateAvatar("user-1", mockFile);

      expect(result).toEqual({ id: "user-1", image: "new-url" });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { image: true },
      });
      expect(mockCloudinaryService.deleteFileByUrl).toHaveBeenCalledWith("old-url");
      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { image: "new-url" },
      });
    });

    it("should skip deleting old avatar if none exists", async () => {
      const mockFile = { buffer: Buffer.from("new-avatar") } as Express.Multer.File;
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-1", image: null });
      mockCloudinaryService.uploadFile.mockResolvedValue({ secure_url: "new-url" });
      mockPrismaService.user.update.mockResolvedValue({ id: "user-1", image: "new-url" });

      const result = await service.updateAvatar("user-1", mockFile);

      expect(result).toEqual({ id: "user-1", image: "new-url" });
      expect(mockCloudinaryService.deleteFileByUrl).not.toHaveBeenCalled();
      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("update", () => {
    it("should update user data", async () => {
      const updateDto = { name: "Jane Doe" };
      mockPrismaService.user.update.mockResolvedValue({ id: "user-1", name: "Jane Doe" });

      const result = await service.update("user-1", updateDto);

      expect(result).toEqual({ id: "user-1", name: "Jane Doe" });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: updateDto,
      });
    });
  });

  describe("deleteAvatar", () => {
    it("should delete old avatar if it exists and set image to null", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-1", image: "old-url" });
      mockPrismaService.user.update.mockResolvedValue({ id: "user-1", image: null });

      const result = await service.deleteAvatar("user-1");

      expect(result).toEqual({ id: "user-1", image: null });
      expect(mockCloudinaryService.deleteFileByUrl).toHaveBeenCalledWith("old-url");
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { image: null },
      });
    });

    it("should skip deleting old avatar if none exists and set image to null", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-1", image: null });
      mockPrismaService.user.update.mockResolvedValue({ id: "user-1", image: null });

      const result = await service.deleteAvatar("user-1");

      expect(result).toEqual({ id: "user-1", image: null });
      expect(mockCloudinaryService.deleteFileByUrl).not.toHaveBeenCalled();
    });
  });
});
