import { PickType } from "@nestjs/swagger";
import { UserEntity } from "src/modules/users/entities/user.entity";

export class WorkspaceMemberProfileDto extends PickType(UserEntity, [
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
] as const) {}
