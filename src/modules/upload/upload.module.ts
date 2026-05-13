import { Module } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { CloudinaryModule } from "src/providers/cloudinary/cloudinary.module";
import { UploadService } from "./upload.service";

@Module({
  imports: [CloudinaryModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
