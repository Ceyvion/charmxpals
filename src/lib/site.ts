const LOCAL_SITE_URL = 'http://localhost:3000';

function normalizeSiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  const explicit =
    normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeSiteUrl(process.env.NEXTAUTH_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL);

  return explicit ?? LOCAL_SITE_URL;
}

export function absoluteUrl(pathname = '/'): string {
  return new URL(pathname, getSiteUrl()).toString();
}
