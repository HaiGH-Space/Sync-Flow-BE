import { ApiProperty } from '@nestjs/swagger';
import { Column } from 'generated/prisma/client';

export class ColumnEntity implements Column {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  id: string;

  @ApiProperty({ example: 'To Do' })
  name: string;

  @ApiProperty({ example: 1, description: 'Order of the column' })
  order: number;

  @ApiProperty({ example: 'project-uuid-123' })
  projectId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}