import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from 'generated/prisma/client';

export class WorkspaceEntity implements Workspace {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Team Dev SyncFlow', description: 'Name of the workspace' })
  name: string;

  @ApiProperty({ example: 'team-dev-sf', description: 'Unique URL slug' })
  urlSlug: string;

  @ApiProperty({ example: 'user-uuid-123', description: 'Owner user ID' })
  ownerId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

}