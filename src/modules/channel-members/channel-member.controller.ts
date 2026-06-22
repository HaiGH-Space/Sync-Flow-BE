import { Controller } from "@nestjs/common";
import { ChannelMemberService } from "./channel-member.service";

@Controller("channel-members")
export class ChannelMemberController {
  constructor(private readonly channelMemberService: ChannelMemberService) {}
}