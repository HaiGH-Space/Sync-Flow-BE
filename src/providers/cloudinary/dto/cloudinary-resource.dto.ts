import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CloudinaryResource {
  @ApiProperty({ description: "ID định danh trên Cloudinary" })
  public_id: string;

  @ApiPropertyOptional({ description: "Đường dẫn URL an toàn (https)" })
  url: string;

  @ApiPropertyOptional({ description: "Định dạng file (jpg, png, v.v.)" })
  format: string;

  @ApiPropertyOptional({ description: "Ngày tạo" })
  created_at: string;

  @ApiPropertyOptional({ description: "Dung lượng file tính bằng bytes" })
  bytes: number;

  @ApiPropertyOptional({ description: "Chiều rộng ảnh" })
  width?: number;

  @ApiPropertyOptional({ description: "Chiều cao ảnh" })
  height?: number;
}
