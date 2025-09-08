export type Theme = 'opal' | 'arctic' | 'velvet';

export function getTheme(): Theme {
  const t = process.env.NEXT_PUBLIC_THEME?.toLowerCase();
  if (t === 'arctic' || t === 'velvet') return t;
  return 'opal';
}

