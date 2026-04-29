import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOkResponseGeneric } from "src/common/decorators/api-common-responses.decorator";
import { CloudinaryService } from "src/providers/cloudinary/cloudinary.service";
import { UploadResponseDto } from "./dto/upload-response.dto";

@Controller("upload")
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post("file")
  @ApiOkResponseGeneric(UploadResponseDto)
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
}
