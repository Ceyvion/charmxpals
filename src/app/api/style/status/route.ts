import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STYLE_STATUS !== '1') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const status: any = { ok: true };
  try {
    // Check presence of the Tailwind v4 PostCSS plugin by probing package.json directly
    const pluginPkgPath = path.join(process.cwd(), 'node_modules', '@tailwindcss', 'postcss', 'package.json');
    status.postcssPluginPresent = fs.existsSync(pluginPkgPath);
    if (status.postcssPluginPresent) {
      try {
        const raw = fs.readFileSync(pluginPkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        status.postcssPluginVersion = pkg.version;
      } catch {}
    }
    try {
      const twPkgPath = path.join(process.cwd(), 'node_modules', 'tailwindcss', 'package.json');
      const twPkg = JSON.parse(fs.readFileSync(twPkgPath, 'utf8'));
      status.tailwindVersion = twPkg.version;
    } catch (e: any) {
      status.tailwindVersionError = String(e?.message || e);
    }
    try {
      const nextPkgPath = path.join(process.cwd(), 'node_modules', 'next', 'package.json');
      const nextPkg = JSON.parse(fs.readFileSync(nextPkgPath, 'utf8'));
      status.nextVersion = nextPkg.version;
    } catch {}
    try {
      // Globals CSS sanity
      const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
      const css = fs.readFileSync(cssPath, 'utf8');
      status.globalsCssHasTailwindDirectives = ['@tailwind base', '@tailwind components', '@tailwind utilities'].every((k) => css.includes(k));
    } catch (e: any) {
      status.globalsCssReadError = String(e?.message || e);
    }
    status.env = {
      node: process.version,
      TAILWIND_MODE: process.env.TAILWIND_MODE || null,
    };
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
  return NextResponse.json(status);
}
