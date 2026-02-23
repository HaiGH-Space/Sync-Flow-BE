import { ApiProperty } from "@nestjs/swagger";
import { Issue, Priority } from "generated/prisma/client";
import { UserEntity } from "src/user/entities/user.entity";

export class IssueEntity implements Issue {
    @ApiProperty({ example: 1, description: 'Auto-incrementing issue number within the project' })
    number: number;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Unique identifier for the issue' })
    id: string;
    @ApiProperty({ example: 'Implement authentication', description: 'Title of the issue' })
    title: string;
    @ApiProperty({ nullable: true, example: 'Implement user authentication using JWT', description: 'Detailed description of the issue' })
    description: string | null;
    @ApiProperty({ example: 'HIGH', description: 'Priority level of the issue' })
    priority: Priority;
    @ApiProperty({ example: 1, description: 'Order of the issue in the project' })
    order: number;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Identifier of the column the issue belongs to' })
    columnId: string;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Identifier of the project the issue belongs to' })
    projectId: string;
    @ApiProperty({ nullable: true, example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Identifier of the user assigned to the issue' })
    assigneeId: string | null;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Identifier of the user who reported the issue' })
    reporterId: string;
    createdAt: Date;
    updatedAt: Date;
}

export class IssueWithAssigneeEntity extends IssueEntity {
    @ApiProperty({ nullable: true, description: 'User assigned to the issue', type: UserEntity })
    assignee: UserEntity | null;
}
