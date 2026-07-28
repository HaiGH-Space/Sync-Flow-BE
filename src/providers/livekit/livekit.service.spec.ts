import { Test, TestingModule } from "@nestjs/testing";
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

  it("should handle missing participant exception by throwing NotFoundException", async () => {
    jest.spyOn(service["roomService"], "mutePublishedTrack").mockRejectedValue(new Error("participant not found"));

    await expect(
      service.muteParticipant("channel:test-channel-id", "non-existent-user", "track-1", true)
    ).rejects.toThrow();
  });
});
