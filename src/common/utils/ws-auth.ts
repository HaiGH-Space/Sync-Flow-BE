import { Socket } from 'socket.io';

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

/**
 * Extracts session/auth token from Socket handshake cookies or auth payload.
 */
export const getAuthToken = (client: Socket | any): string | undefined => {
  const cookieString = client.handshake.headers.cookie;
  if (cookieString) {
    const cookies = parseCookies(cookieString);
    if (cookies['session_token']) {
      return cookies['session_token'];
    }
  }

  const authPayload = client.handshake.auth;
  if (typeof authPayload?.session_token === 'string') {
    return authPayload.session_token;
  }
  if (typeof authPayload?.token === 'string') {
    return authPayload.token;
  }

  return undefined;
};
