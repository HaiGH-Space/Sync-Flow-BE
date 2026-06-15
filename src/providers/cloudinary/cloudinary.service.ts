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
import { AppConfigService } from "src/config/config.service";

export const ALLOWED_IMAGE_MIME_TYPES = /^(image\/(jpeg|jpg|png|webp|gif))$/i;

const isCloudinaryResourcesResponse = (
  value: unknown,
): value is CloudinaryResourcesResponse => {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { resources?: unknown }).resources);
};

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: AppConfigService) {}

  /**
   * Extract Cloudinary public_id from a Cloudinary delivery URL.
   * Example: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg -> folder/name
   */
  getPublicIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Only attempt to parse Cloudinary delivery URLs.
    // Typical host: res.cloudinary.com
    if (!/\/\/res\.cloudinary\.com\//i.test(url)) return null;

    // Find the segment after "/upload/" (skip optional transformations and version).
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    let afterUpload = url.slice(uploadIndex + "/upload/".length);
    // Remove query/hash
    afterUpload = afterUpload.split("?")[0].split("#")[0];

    // Drop transformation segment(s) if present, which appear before version and public id.
    // We keep trimming segments until we hit a version segment (v123) or the actual public id path.
    const segments = afterUpload.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    let start = 0;
    for (let i = 0; i < segments.length; i++) {
      if (/^v\d+$/.test(segments[i])) {
        start = i + 1;
        break;
      }
    }

    const publicIdWithExt = segments.slice(start).join("/");
    if (!publicIdWithExt) return null;

    // Remove file extension
    return publicIdWithExt.replace(/\.[a-z0-9]+$/i, "");
  }

  uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!ALLOWED_IMAGE_MIME_TYPES.test(file?.mimetype ?? "")) {
      throw new BadRequestException(ErrorCode.BAD_REQUEST);
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.configService.cloudinaryFolder,
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

  /**
   * Deletes a Cloudinary asset based on a stored delivery URL.
   * Returns false if the URL can't be parsed as Cloudinary.
   */
  async deleteFileByUrl(url: string): Promise<boolean> {
    const publicId = this.getPublicIdFromUrl(url);
    if (!publicId) return false;

    try {
      await this.deleteFile(publicId);
      return true;
    } catch (error) {
      // If already missing on Cloudinary, treat as non-fatal for replace flows.
      if (error instanceof NotFoundException) return false;
      throw error;
    }
  }
}
