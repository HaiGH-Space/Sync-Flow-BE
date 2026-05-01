import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import * as streamifier from "streamifier";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { ErrorCode } from "src/common/constants/error-codes";
import { CloudinaryResourcesResponse } from "./dto/cloudinary-response.dto";
import { CloudinaryResource } from "./dto/cloudinary-resource.dto";

const isCloudinaryResourcesResponse = (
  value: unknown,
): value is CloudinaryResourcesResponse => {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { resources?: unknown }).resources);
};

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

  async findAllFiles(maxResults: number = 10): Promise<CloudinaryResource[]> {
    try {
      const raw = await (cloudinary.api.resources({
        type: "upload",
        max_results: maxResults,
      }) as Promise<unknown>);

      if (!isCloudinaryResourcesResponse(raw)) {
        throw new Error("Unexpected Cloudinary resources response");
      }
      return raw.resources;
    } catch {
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const response = (await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
      })) as unknown as { result?: string };

      const result = response?.result ?? "unknown";
      if (result === "not found") {
        throw new NotFoundException("FILE_NOT_FOUND");
      }

      return true;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }
}
