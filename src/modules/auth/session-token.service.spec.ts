import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { SessionTokenService } from "./session-token.service";

describe("SessionTokenService", () => {
  let service: SessionTokenService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionTokenService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<SessionTokenService>(SessionTokenService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  describe("generateToken", () => {
    it("should sign a JWT token with the proper structure", () => {
      const user = {
        id: "u123",
        name: "Test",
        email: "test@example.com",
        image: null,
        emailVerified: true,
        hasSeenWelcome: false,
      };
      mockJwtService.sign.mockReturnValue("signed-jwt");

      const result = service.generateToken("u123", "s123", user);

      expect(result).toBe("signed-jwt");
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "u123",
        sid: "s123",
        user,
      });
    });
  });

  describe("verifyToken", () => {
    it("should return decoded payload if validation is successful", () => {
      const payload = { sub: "u123", sid: "s123", user: {} };
      mockJwtService.verify.mockReturnValue(payload);

      const result = service.verifyToken("valid-jwt");

      expect(result).toEqual(payload);
    });

    it("should return null if verification fails", () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const result = service.verifyToken("invalid-jwt");

      expect(result).toBeNull();
    });
  });

  describe("decodeToken", () => {
    it("should decode token without verification", () => {
      const payload = { sub: "u123", sid: "s123" };
      mockJwtService.decode.mockReturnValue(payload);

      const result = service.decodeToken("any-jwt");

      expect(result).toEqual(payload);
    });

    it("should return null if decoding fails", () => {
      mockJwtService.decode.mockImplementation(() => {
        throw new Error("Malformed JWT");
      });

      const result = service.decodeToken("bad-jwt");

      expect(result).toBeNull();
    });
  });

  describe("extractToken", () => {
    it("should extract token from cookies if present", () => {
      const req = {
        cookies: { session_token: "cookie-val" },
        headers: {},
      } as unknown as Request;

      expect(service.extractToken(req)).toBe("cookie-val");
    });

    it("should extract token from Bearer Auth header if cookie is missing", () => {
      const req = {
        cookies: {},
        headers: { authorization: "Bearer bearer-val" },
      } as unknown as Request;

      expect(service.extractToken(req)).toBe("bearer-val");
    });

    it("should return undefined if token is not found anywhere", () => {
      const req = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      expect(service.extractToken(req)).toBeUndefined();
    });
  });
});
