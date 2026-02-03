import { ApiProperty } from "@nestjs/swagger";
import { Project } from "generated/prisma/client";
import { ColumnEntity } from "src/column/entities/column.entity";

export class ProjectEntity implements Project {
    @ApiProperty({ example: 'Project Name', description: 'Name of the project' })
    name: string;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'UUID of the project' })
    id: string;
    @ApiProperty({ example: 'project-key', description: 'Unique key for the project' })
    key: string;
    @ApiProperty({ example: 'This is a sample project description', description: 'Description of the project', nullable: true })
    description: string | null;
    @ApiProperty({example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the workspace'})
    workspaceId: string;
    @ApiProperty()
    createdAt: Date;
    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ 
    type: [ColumnEntity],
    description: 'Columns associated with the project',
    required: false 
    })
    columns?: ColumnEntity[];
}
