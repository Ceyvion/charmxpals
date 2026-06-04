const IP_RE = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-fA-F0-9:]+)$/;

function isTrustedProxyHeadersEnabled() {
  return process.env.TRUST_PROXY_HEADERS === '1';
}

function cleanIp(value: string | null) {
  const candidate = value?.split(',')[0]?.trim();
  if (!candidate || !IP_RE.test(candidate)) return null;
  return candidate;
}

export function getClientIp(reqUrl: string, headers: Headers) {
  if (isTrustedProxyHeadersEnabled()) {
    const forwarded = cleanIp(headers.get('x-forwarded-for'));
    if (forwarded) return forwarded;

    const real = cleanIp(headers.get('x-real-ip'));
    if (real) return real;
  }

  try {
    const url = new URL(reqUrl);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return '127.0.0.1';
    }
  } catch {
    // no-op
  }
  return '127.0.0.1';
}
