import { ApiProperty } from "@nestjs/swagger";
import { Message } from "generated/prisma/client";

export class ChatEntity implements Message {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;
  @ApiProperty({ example: "Hello, world!" })
  content: string;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  channelId: string;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  senderId: string;
  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt: Date;
  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  updatedAt: Date;
}
class SenderEntity {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
}

class ChatMessageWithSender extends ChatEntity {
  @ApiProperty({ type: SenderEntity })
  sender: SenderEntity;
}

export class ChatHistory {
  @ApiProperty({ type: [ChatMessageWithSender] })
  data: ChatMessageWithSender[];

  @ApiProperty({ nullable: true })
  nextCursor: string | null;
}
