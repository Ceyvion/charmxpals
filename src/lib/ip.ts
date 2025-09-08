export function getClientIp(reqUrl: string, headers: Headers) {
  // Try standard proxy headers first
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real;

  try {
    const url = new URL(reqUrl);
    return url.hostname || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

