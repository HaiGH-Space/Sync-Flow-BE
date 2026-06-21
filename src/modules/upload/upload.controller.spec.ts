import { Test, TestingModule } from "@nestjs/testing";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";

describe("UploadController", () => {
  let controller: UploadController;
  let mockUploadService: {
    uploadFile: jest.Mock;
    findAllFiles: jest.Mock;
    deleteFile: jest.Mock;
  };

  beforeEach(async () => {
    mockUploadService = {
      uploadFile: jest.fn(),
      findAllFiles: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("uploadFileAndValidate", () => {
    it("should return public_id and secure_url on successful upload", async () => {
      const mockFile = { buffer: Buffer.from("test") } as Express.Multer.File;
      mockUploadService.uploadFile.mockResolvedValue({ secure_url: "url", public_id: "id" });
      const result = await controller.uploadFileAndValidate(mockFile);
      expect(result).toEqual({ url: "url", public_id: "id" });
      expect(mockUploadService.uploadFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("getFiles", () => {
    it("should map list of files correctly", async () => {
      const mockFiles = [
        { public_id: "1", url: "url1", format: "png", created_at: new Date() }
      ];
      mockUploadService.findAllFiles.mockResolvedValue(mockFiles);
      const result = await controller.getFiles(5);
      expect(result).toEqual([
        { public_id: "1", url: "url1", format: "png", created_at: mockFiles[0].created_at }
      ]);
      expect(mockUploadService.findAllFiles).toHaveBeenCalledWith(5);
    });
  });

  describe("deleteFile", () => {
    it("should delete and return status true", async () => {
      mockUploadService.deleteFile.mockResolvedValue(true);
      const result = await controller.deleteFile("id");
      expect(result).toEqual({ status: true });
      expect(mockUploadService.deleteFile).toHaveBeenCalledWith("id");
    });
  });
});
