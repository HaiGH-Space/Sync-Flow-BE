import {
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiCreatedResponseGeneric,
  ApiOkResponseGeneric,
} from "src/common/decorators/api-common-responses.decorator";
import { BooleanResponseDto } from "src/common/dto/boolean-response.dto";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";
import { UploadResponseDto } from "./dto/upload-response.dto";
import { CloudinaryResource } from "src/providers/cloudinary/dto/cloudinary-resource.dto";

@Controller("upload")
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post("file")
  @ApiCreatedResponseGeneric(UploadResponseDto)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFileAndValidate(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: "image/jpeg" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.cloudinaryService.uploadFile(file);
    return {
      url: result.secure_url,
      public_id: result.public_id,
    } as UploadResponseDto;
  }
  @Get("files")
  @ApiOkResponseGeneric(CloudinaryResource)
  async getFiles(@Query("limit") limit?: number) {
    const files = await this.cloudinaryService.findAllFiles(limit || 10);
    return files.map((file) => ({
      public_id: file.public_id,
      url: file.url,
      format: file.format,
      created_at: file.created_at,
    }));
  }
  @Delete("file/:publicId")
  @ApiOkResponseGeneric(BooleanResponseDto)
  async deleteFile(@Param("publicId") publicId: string) {
    await this.cloudinaryService.deleteFile(publicId);
    return { status: true } as BooleanResponseDto;
  }
}
