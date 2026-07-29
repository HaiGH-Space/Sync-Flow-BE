import { ApiProperty } from "@nestjs/swagger";

export class LiveKitTokenResponseDto {
  @ApiProperty({ description: "Signed LiveKit JWT Access Token" })
  token!: string;

  @ApiProperty({
    description: "Standard room name formatted as channel:channelId",
  })
  roomName!: string;

  @ApiProperty({ description: "LiveKit WebSocket Connection URL" })
  wsUrl!: string;
}
