import { parseCookies, getAuthToken } from "./ws-auth";

describe("ws-auth utility", () => {
  describe("parseCookies", () => {
    it("should parse cookie strings correctly", () => {
      expect(parseCookies("session_token=123; foo=bar")).toEqual({
        session_token: "123",
        foo: "bar",
      });
    });

    it("should return empty object for empty/undefined cookie string", () => {
      expect(parseCookies(undefined)).toEqual({});
      expect(parseCookies("")).toEqual({});
    });

    it("should handle cookie values containing '='", () => {
      expect(parseCookies("session_token=abc=def; foo=bar")).toEqual({
        session_token: "abc=def",
        foo: "bar",
      });
    });

    it("should strip surrounding double quotes from parsed cookie values", () => {
      expect(parseCookies("session_token=\"123\"; foo=\"bar\"")).toEqual({
        session_token: "123",
        foo: "bar",
      });
    });
  });

  describe("getAuthToken", () => {
    it("should extract session token from cookies if present", () => {
      const mockClient = {
        handshake: {
          headers: {
            cookie: "session_token=test-cookie-token; other=val",
          },
          auth: {},
        },
      } as any;
      expect(getAuthToken(mockClient)).toBe("test-cookie-token");
    });

    it("should extract session token from auth payload if not in cookies", () => {
      const mockClient = {
        handshake: {
          headers: {},
          auth: {
            session_token: "test-auth-token",
          },
        },
      } as any;
      expect(getAuthToken(mockClient)).toBe("test-auth-token");
    });

    it("should extract token from auth payload token property if session_token is not present", () => {
      const mockClient = {
        handshake: {
          headers: {},
          auth: {
            token: "test-token-prop",
          },
        },
      } as any;
      expect(getAuthToken(mockClient)).toBe("test-token-prop");
    });

    it("should strip surrounding double quotes from extracted token from cookie", () => {
      const mockClient = {
        handshake: {
          headers: {
            cookie: "session_token=\"quoted-token\"; other=val",
          },
          auth: {},
        },
      } as any;
      expect(getAuthToken(mockClient)).toBe("quoted-token");
    });

    it("should strip surrounding double quotes from extracted token from auth payload", () => {
      const mockClient = {
        handshake: {
          headers: {},
          auth: {
            token: "\"quoted-auth-token\"",
          },
        },
      } as any;
      expect(getAuthToken(mockClient)).toBe("quoted-auth-token");
    });

    it("should return undefined if no token is found", () => {
      const mockClient = {
        handshake: {
          headers: {},
          auth: {},
        },
      } as any;
      expect(getAuthToken(mockClient)).toBeUndefined();
    });
  });
});
