type EnvLike = Record<string, string | undefined>;

function trimOrNull(value: string | undefined | null) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeWsBase(value: string | undefined | null) {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function parseHostname(value: string | undefined | null) {
  const host = trimOrNull(value);
  if (!host) return null;
  try {
    const parsed = new URL(host.includes('://') ? host : `http://${host}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return host.split(':')[0]?.toLowerCase() || null;
  }
}

export function isLocalHostname(hostname: string | undefined | null) {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower.endsWith('.local');
}

export function resolveConfiguredWsBase(env: EnvLike = process.env) {
  return normalizeWsBase(env.MMO_WS_URL || env.NEXT_PUBLIC_MMO_WS_URL || null);
}

export function resolveClientConfiguredWsBase(env: EnvLike = process.env) {
  return normalizeWsBase(env.NEXT_PUBLIC_MMO_WS_URL || null);
}

export function resolveLocalServerWsBase(
  requestHost: string | undefined | null,
  env: EnvLike = process.env,
) {
  const hostname = parseHostname(requestHost);
  if (!hostname || !isLocalHostname(hostname)) return null;
  const port = trimOrNull(env.NEXT_PUBLIC_MMO_WS_PORT || env.MMO_WS_PORT || '8787');
  return normalizeWsBase(`ws://${hostname}:${port}`);
}

export function resolveLocalClientWsBase(
  locationHostname: string | undefined | null,
  env: EnvLike = process.env,
) {
  const hostname = parseHostname(locationHostname);
  if (!hostname || !isLocalHostname(hostname)) return null;
  const port = trimOrNull(env.NEXT_PUBLIC_MMO_WS_PORT || '8787');
  return normalizeWsBase(`ws://${hostname}:${port}`);
}

export function resolveServerWsBase({
  requestHost,
  isHosted,
  env,
}: {
  requestHost: string | undefined | null;
  isHosted: boolean;
  env?: EnvLike;
}) {
  const runtimeEnv = env || process.env;
  const configured = resolveConfiguredWsBase(runtimeEnv);
  if (configured) return configured;
  if (isHosted) return null;
  return resolveLocalServerWsBase(requestHost, runtimeEnv);
}

export function resolveClientWsBase({
  serverBase,
  locationHostname,
  env,
}: {
  serverBase: string | undefined | null;
  locationHostname: string | undefined | null;
  env?: EnvLike;
}) {
  const runtimeEnv = env || process.env;
  const fromServer = normalizeWsBase(serverBase);
  if (fromServer) return fromServer;
  const configured = resolveClientConfiguredWsBase(runtimeEnv);
  if (configured) return configured;
  return resolveLocalClientWsBase(locationHostname, runtimeEnv);
}
