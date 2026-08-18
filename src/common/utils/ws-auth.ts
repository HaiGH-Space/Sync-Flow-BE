/**
 * Helper to parse cookie string into an object of key-value pairs safely.
 */
export const parseCookies = (cookieString?: string): Record<string, string> => {
  if (!cookieString || typeof cookieString !== 'string') return {};

  try {
    const cookies: Record<string, string> = {};
    const pairs = cookieString.split(';');

    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;

      const key = pair.slice(0, eqIdx).trim();
      if (!key) continue;

      let val = pair.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }

      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }

    return cookies;
  } catch {
    return {};
  }
};

interface SocketLike {
  handshake: {
    headers: {
      cookie?: string;
      [key: string]: unknown;
    };
    auth?: Record<string, unknown>;
  };
}

/**
 * Extracts session/auth token from Socket handshake cookies or auth payload.
 */
export const getAuthToken = (client: SocketLike): string | undefined => {
  let token: string | undefined;

  const cookieString = client.handshake.headers.cookie;
  if (cookieString) {
    const cookies = parseCookies(cookieString);
    if (cookies['session_token']) {
      token = cookies['session_token'];
    }
  }

  if (!token) {
    const authPayload = client.handshake.auth;
    if (authPayload) {
      const sessionToken = authPayload['session_token'];
      if (typeof sessionToken === 'string') {
        token = sessionToken;
      } else {
        const tokenProp = authPayload['token'];
        if (typeof tokenProp === 'string') {
          token = tokenProp;
        }
      }
    }
  }

  // Strip surrounding quotes if present
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  return token;
};
