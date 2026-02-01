import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class CreateWorkspaceDto {
    @ApiProperty({ example: 'My Workspace', description: 'The name of the workspace' })
    @IsNotEmpty({ message: 'Workspace name must not be empty' })
    @IsString()
    @MinLength(3, { message: 'Workspace name must be at least 3 characters long' })
    name: string;

    @ApiProperty({ example: 'my-workspace-01', description: 'The URL slug for the workspace' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, {
        message: 'URL Slug must strictly contain lowercase letters, numbers and hyphens',
    })
    urlSlug: string;
}
