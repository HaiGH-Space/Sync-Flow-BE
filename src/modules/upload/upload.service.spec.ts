import { Test, TestingModule } from "@nestjs/testing";
import { UploadService } from "./upload.service";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";

describe("UploadService", () => {
  let service: UploadService;
  let mockCloudinaryService: {
    uploadFile: jest.Mock;
    findAllFiles: jest.Mock;
    deleteFile: jest.Mock;
  };

  beforeEach(async () => {
    mockCloudinaryService = {
      uploadFile: jest.fn(),
      findAllFiles: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("uploadFile", () => {
    it("should call cloudinaryService.uploadFile", async () => {
      const mockFile = { buffer: Buffer.from("test") } as Express.Multer.File;
      mockCloudinaryService.uploadFile.mockResolvedValue({ secure_url: "url", public_id: "id" });
      const result = await service.uploadFile(mockFile);
      expect(result).toEqual({ secure_url: "url", public_id: "id" });
      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("findAllFiles", () => {
    it("should call cloudinaryService.findAllFiles with limit or fallback to 10", async () => {
      mockCloudinaryService.findAllFiles.mockResolvedValue([]);
      await service.findAllFiles();
      expect(mockCloudinaryService.findAllFiles).toHaveBeenCalledWith(10);

      await service.findAllFiles(5);
      expect(mockCloudinaryService.findAllFiles).toHaveBeenCalledWith(5);
    });
  });

  describe("deleteFile", () => {
    it("should call cloudinaryService.deleteFile", async () => {
      mockCloudinaryService.deleteFile.mockResolvedValue(true);
      const result = await service.deleteFile("id");
      expect(result).toBe(true);
      expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith("id");
    });
  });
});
