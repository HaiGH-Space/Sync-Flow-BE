import { ApiProperty } from "@nestjs/swagger";
import { CloudinaryResource } from "./cloudinary-resource.dto";

export class CloudinaryResourcesResponse {
  @ApiProperty()
  resources: CloudinaryResource[];
}
