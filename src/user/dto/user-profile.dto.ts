import { PickType } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';
export class UserProfileDto extends PickType(UserEntity, [
    'id',
    'name',
    'email',
    'image'
] as const) { }