import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { LiveKitService } from "./livekit.service";
import { AppConfigService } from "src/config/config.service";

describe("LiveKitService", () => {
  let service: LiveKitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKitService,
        {
          provide: AppConfigService,
          useValue: {
            livekitApiKey: "test-key",
            livekitApiSecret: "test-secret",
            livekitUrl: "http://localhost:7880",
            livekitWsUrl: "ws://localhost:7880",
          },
        },
      ],
    }).compile();

    service = module.get<LiveKitService>(LiveKitService);
    service.onModuleInit();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should generate a valid JWT access token for a channel room", async () => {
    const token = await service.generateToken({
      roomName: "channel:test-channel-id",
      identity: "user-123",
      name: "John Doe",
      metadata: { avatar: "http://example.com/avatar.jpg" },
      isAdmin: false,
    });

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("should list participants for a room", async () => {
    const mockParticipants = [{ identity: "user-1", name: "User One" }];
    jest.spyOn(service["roomService"], "listParticipants").mockResolvedValue(mockParticipants as any);

    const result = await service.listParticipants("channel:test-channel-id");
    expect(result).toBe(mockParticipants);
  });

  it("should throw NotFoundException when listParticipants encounters room not found", async () => {
    jest.spyOn(service["roomService"], "listParticipants").mockRejectedValue({ code: 5, message: "room does not exist" });

    await expect(service.listParticipants("channel:test-channel-id")).rejects.toThrow(NotFoundException);
  });

  it("should handle missing participant exception by throwing NotFoundException in muteParticipant", async () => {
    jest.spyOn(service["roomService"], "mutePublishedTrack").mockRejectedValue(new Error("participant not found"));

    await expect(
      service.muteParticipant("channel:test-channel-id", "non-existent-user", "track-1", true)
    ).rejects.toThrow(NotFoundException);
  });

  it("should remove participant successfully", async () => {
    jest.spyOn(service["roomService"], "removeParticipant").mockResolvedValue(undefined as any);

    await expect(service.removeParticipant("channel:test-channel-id", "user-123")).resolves.toBeUndefined();
  });

  it("should throw NotFoundException when removing a non-existent participant", async () => {
    jest.spyOn(service["roomService"], "removeParticipant").mockRejectedValue({ status: 404 });

    await expect(service.removeParticipant("channel:test-channel-id", "user-123")).rejects.toThrow(NotFoundException);
  });

  it("should verify webhook successfully", async () => {
    const mockEvent = { event: "participant_joined" };
    jest.spyOn(service["webhookReceiver"], "receive").mockResolvedValue(mockEvent as any);

    const result = await service.verifyWebhook("body-content", "auth-header");
    expect(result).toBe(mockEvent);
  });

  it("should throw UnauthorizedException when verifyWebhook fails verification", async () => {
    jest.spyOn(service["webhookReceiver"], "receive").mockRejectedValue(new Error("invalid checksum"));

    await expect(service.verifyWebhook("body-content", "invalid-header")).rejects.toThrow(UnauthorizedException);
  });
});

