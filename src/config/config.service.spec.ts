import { ConfigService } from "@nestjs/config";
import { AppConfigService } from "./config.service";

describe("AppConfigService CORS Validation", () => {
  const createConfigService = (env: Record<string, string>) => {
    return new AppConfigService(
      {
        get: (key: string) => env[key] ?? null,
      } as unknown as ConfigService
    );
  };

  describe("corsOrigins in non-production mode", () => {
    it("should allow '*' and return '*' when CORS_ORIGIN is not set", () => {
      const service = createConfigService({ NODE_ENV: "development" });
      expect(service.corsOrigins).toBe("*");
    });

    it("should allow '*' and return '*' when CORS_ORIGIN is set to '*'", () => {
      const service = createConfigService({ NODE_ENV: "development", CORS_ORIGIN: "*" });
      expect(service.corsOrigins).toBe("*");
    });

    it("should allow a single valid origin", () => {
      const service = createConfigService({ NODE_ENV: "development", CORS_ORIGIN: "https://example.com" });
      expect(service.corsOrigins).toBe("https://example.com");
    });
  });

  describe("corsOrigins in production mode", () => {
    it("should throw an error when CORS_ORIGIN is not set", () => {
      const service = createConfigService({ NODE_ENV: "production" });
      expect(() => service.corsOrigins).toThrow(
        "CORS_ORIGIN environment variable is required and cannot be '*' in production when credentials are enabled"
      );
    });

    it("should throw an error when CORS_ORIGIN is set to '*'", () => {
      const service = createConfigService({ NODE_ENV: "production", CORS_ORIGIN: "*" });
      expect(() => service.corsOrigins).toThrow(
        "CORS_ORIGIN environment variable is required and cannot be '*' in production when credentials are enabled"
      );
    });

    it("should throw an error when CORS_ORIGIN contains '*'", () => {
      const service = createConfigService({ NODE_ENV: "production", CORS_ORIGIN: "https://example.com,*" });
      expect(() => service.corsOrigins).toThrow(
        "CORS_ORIGIN environment variable cannot contain '*' in production when credentials are enabled"
      );
    });

    it("should succeed and return parsed origin when configured with a valid origin", () => {
      const service = createConfigService({ NODE_ENV: "production", CORS_ORIGIN: "https://example.com" });
      expect(service.corsOrigins).toBe("https://example.com");
    });

    it("should succeed and return parsed list when configured with multiple valid origins", () => {
      const service = createConfigService({ NODE_ENV: "production", CORS_ORIGIN: "https://example.com,https://api.example.com" });
      expect(service.corsOrigins).toEqual(["https://example.com", "https://api.example.com"]);
    });
  });
});
