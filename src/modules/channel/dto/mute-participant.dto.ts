import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class MuteParticipantDto {
  @ApiProperty({ description: "Identity of the participant to mute" })
  @IsString()
  @IsNotEmpty()
  participantIdentity!: string;

  @ApiProperty({ description: "SID of the track to mute/unmute" })
  @IsString()
  @IsNotEmpty()
  trackSid!: string;

  @ApiProperty({ description: "Mute state boolean" })
  @IsBoolean()
  muted!: boolean;
}
