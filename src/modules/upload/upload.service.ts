import { Injectable } from "@nestjs/common";
import { CloudinaryResource } from "src/providers/cloudinary/dto/cloudinary-resource.dto";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";

@Injectable()
export class UploadService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  uploadFile(file: Express.Multer.File) {
    return this.cloudinaryService.uploadFile(file);
  }

  findAllFiles(limit?: number): Promise<CloudinaryResource[]> {
    return this.cloudinaryService.findAllFiles(limit ?? 10);
  }

  deleteFile(publicId: string): Promise<boolean> {
    return this.cloudinaryService.deleteFile(publicId);
  }
}
