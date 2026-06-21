
/**
 * Helper to parse cookie string into an object of key-value pairs.
 */
export const parseCookies = (cookieString?: string): Record<string, string> => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((res, item) => {
    const data = item.trim().split('=');
    return { ...res, [data[0]]: decodeURIComponent(data[1] || '') };
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
  const cookieString = client.handshake.headers.cookie;
  if (cookieString) {
    const cookies = parseCookies(cookieString);
    if (cookies['session_token']) {
      return cookies['session_token'];
    }
  }

  const authPayload = client.handshake.auth;
  if (authPayload) {
    const sessionToken = authPayload['session_token'];
    if (typeof sessionToken === 'string') {
      return sessionToken;
    }
    const token = authPayload['token'];
    if (typeof token === 'string') {
      return token;
    }
  }

  return undefined;
};
