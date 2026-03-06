export type AnalyticsPrimitive = string | number | boolean | null;
export type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

export type AnalyticsEventPayload = {
  name: string;
  path: string | null;
  properties: AnalyticsProperties;
};

export type StoredAnalyticsEvent = AnalyticsEventPayload & {
  id: string;
  userId: string | null;
  ip: string;
  userAgent: string | null;
  createdAt: string;
};

const EVENT_NAME_RE = /^[a-z0-9:_-]{2,64}$/;

function sanitizeKey(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized ? normalized.slice(0, 48) : null;
}

export function sanitizeAnalyticsName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  return EVENT_NAME_RE.test(normalized) ? normalized : null;
}

export function sanitizeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return path.slice(0, 240);
}

export function sanitizeAnalyticsProperties(value: unknown): AnalyticsProperties {
  if (!value || typeof value !== 'object') return {};

  const properties: AnalyticsProperties = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const key = sanitizeKey(rawKey);
    if (!key) continue;

    if (rawValue == null) {
      properties[key] = null;
      continue;
    }
    if (typeof rawValue === 'string') {
      properties[key] = rawValue.trim().slice(0, 160);
      continue;
    }
    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) properties[key] = Math.round(rawValue * 100) / 100;
      continue;
    }
    if (typeof rawValue === 'boolean') {
      properties[key] = rawValue;
    }
  }

  return properties;
}
