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

export function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}