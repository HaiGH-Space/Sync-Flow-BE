import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  hasSeenWelcome: boolean;
}

export interface DecodedSessionToken {
  sub: string;
  sid: string;
  user: SessionUser;
}

@Injectable()
export class SessionTokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(userId: string, sessionId: string, user: SessionUser): string {
    const payload: DecodedSessionToken = {
      sub: userId,
      sid: sessionId,
      user,
    };
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): DecodedSessionToken | null {
    try {
      const payload = this.jwtService.verify<DecodedSessionToken>(token);
      if (payload && payload.sid && payload.user) {
        return payload;
      }
      return null;
    } catch {
      return null;
    }
  }

  decodeToken(token: string): DecodedSessionToken | null {
    try {
      const decoded: unknown = this.jwtService.decode(token);
      if (decoded && typeof decoded === "object") {
        const payload = decoded as Record<string, unknown>;
        if (payload && typeof payload.sid === "string") {
          return payload as unknown as DecodedSessionToken;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  extractToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string | undefined>;
    if (cookies && cookies["session_token"]) {
      return cookies["session_token"];
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}
