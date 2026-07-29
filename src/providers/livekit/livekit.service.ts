import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
} from "livekit-server-sdk";
import { AppConfigService } from "src/config/config.service";
import { ErrorCode } from "src/common/constants/error-codes";

export interface GenerateTokenOptions {
  roomName: string;
  identity: string;
  name: string;
  metadata?: Record<string, unknown>;
  isAdmin?: boolean;
  ttl?: string | number;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.status === 404 || err.code === 5 || err.code === "NOT_FOUND") {
      return true;
    }
    if (typeof err.message === "string") {
      const msg = err.message.toLowerCase();
      if (msg.includes("not found") || msg.includes("does not exist")) {
        return true;
      }
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("not found") || msg.includes("does not exist");
  }
  return false;
}

@Injectable()
export class LiveKitService implements OnModuleInit {
  private roomService!: RoomServiceClient;
  private webhookReceiver!: WebhookReceiver;

  constructor(private readonly configService: AppConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.livekitApiKey;
    const apiSecret = this.configService.livekitApiSecret;
    const host = this.configService.livekitUrl;

    this.roomService = new RoomServiceClient(host, apiKey, apiSecret);
    this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret);
  }

  async generateToken(options: GenerateTokenOptions): Promise<string> {
    const {
      roomName,
      identity,
      name,
      metadata,
      isAdmin = false,
      ttl = this.configService.livekitTokenTtl,
    } = options;

    const apiKey = this.configService.livekitApiKey;
    const apiSecret = this.configService.livekitApiSecret;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      ttl,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: isAdmin,
    });

    return await at.toJwt();
  }

  async listParticipants(roomName: string) {
    try {
      return await this.roomService.listParticipants(roomName);
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ErrorCode.LIVEKIT_ROOM_NOT_FOUND);
      }
      throw new InternalServerErrorException(ErrorCode.LIVEKIT_ERROR);
    }
  }

  async muteParticipant(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ) {
    try {
      return await this.roomService.mutePublishedTrack(
        roomName,
        identity,
        trackSid,
        muted,
      );
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ErrorCode.LIVEKIT_PARTICIPANT_NOT_FOUND);
      }
      throw new InternalServerErrorException(ErrorCode.LIVEKIT_ERROR);
    }
  }

  async removeParticipant(roomName: string, identity: string) {
    try {
      return await this.roomService.removeParticipant(roomName, identity);
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        throw new NotFoundException(ErrorCode.LIVEKIT_PARTICIPANT_NOT_FOUND);
      }
      throw new InternalServerErrorException(ErrorCode.LIVEKIT_ERROR);
    }
  }

  async verifyWebhook(body: string | Buffer, authHeader: string) {
    try {
      const bodyString =
        typeof body === "string" ? body : body.toString("utf-8");
      return await this.webhookReceiver.receive(bodyString, authHeader);
    } catch {
      throw new UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED);
    }
  }
}
