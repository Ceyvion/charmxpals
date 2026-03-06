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
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return '127.0.0.1';
    }
  } catch {
    // no-op
  }
  return '127.0.0.1';
}
