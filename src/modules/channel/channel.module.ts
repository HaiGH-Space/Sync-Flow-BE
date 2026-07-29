import { Module } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import { ChannelController } from "./channel.controller";
import { ChannelVideoController } from "./channel-video.controller";

@Module({
  controllers: [ChannelController, ChannelVideoController],
  providers: [ChannelService],
})
export class ChannelModule {}

