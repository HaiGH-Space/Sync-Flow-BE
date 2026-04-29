import { Injectable } from "@nestjs/common";
import * as streamifier from "streamifier";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "nestjs_uploads",
        },
        (error, result) => {
          if (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : typeof error === "string"
                  ? error
                  : (error.message ?? "Cloudinary upload failed");
            return reject(new Error(errorMessage));
          }
          if (!result) {
            return reject(new Error("Cloudinary upload failed"));
          }
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
