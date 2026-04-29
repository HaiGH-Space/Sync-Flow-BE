import { ApiProperty } from "@nestjs/swagger";

export class UploadResponseDto {
  @ApiProperty({
    description: "The URL of the uploaded file",
    example:
      "https://res.cloudinary.com/demo/image/upload/v1610000000/sample.jpg",
  })
  url: string;
  @ApiProperty({
    description: "The public ID of the uploaded file in Cloudinary",
    example: "nestjs_uploads/sample",
  })
  public_id: string;
}
