/**
 * Helper to parse cookie string into an object of key-value pairs.
 */
export const parseCookies = (cookieString?: string): Record<string, string> => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((res, item) => {
    const parts = item.trim().split('=');
    const key = parts[0];
    let val = parts.slice(1).join('=');
    // Strip surrounding double quotes if present
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    return { ...res, [key]: decodeURIComponent(val || '') };
  }, {});
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
