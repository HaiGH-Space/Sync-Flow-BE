export const parseCorsOrigins = (origin?: string): string | string[] => {
  if (!origin) return '*';

  const values = origin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 1 ? values : values[0] ?? '*';
};

export const getCorsOriginsFromEnv = () =>
  parseCorsOrigins(process.env.CORS_ORIGIN);