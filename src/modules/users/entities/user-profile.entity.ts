import { PickType } from "@nestjs/swagger";
import { UserEntity } from "./user.entity";
export class UserProfileEntity extends PickType(UserEntity, [
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  "hasSeenWelcome",
] as const) {}
