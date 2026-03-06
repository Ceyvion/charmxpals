import { NextResponse } from 'next/server';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

type StyleStatusResponse = {
  ok: boolean;
  postcssPluginPresent?: boolean;
  postcssPluginVersion?: string | null;
  tailwindVersion?: string | null;
  tailwindVersionError?: string;
  nextVersion?: string | null;
  globalsCssHasTailwindDirectives?: boolean;
  globalsCssReadError?: string;
  env?: {
    node: string;
    TAILWIND_MODE: string | null;
  };
  error?: string;
};

const STATUS_CACHE_MS = 30_000;
let cachedStatus: StyleStatusResponse | null = null;
let cachedStatusAt = 0;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageVersion(pkgPath: string): Promise<string | null> {
  const raw = await readFile(pkgPath, 'utf8');
  const parsed = JSON.parse(raw) as { version?: unknown };
  return typeof parsed.version === 'string' ? parsed.version : null;
}

async function buildStatus(): Promise<StyleStatusResponse> {
  const cwd = process.cwd();
  const status: StyleStatusResponse = { ok: true };

  const pluginPkgPath = path.join(cwd, 'node_modules', '@tailwindcss', 'postcss', 'package.json');
  status.postcssPluginPresent = await fileExists(pluginPkgPath);
  if (status.postcssPluginPresent) {
    try {
      status.postcssPluginVersion = await readPackageVersion(pluginPkgPath);
    } catch {
      status.postcssPluginVersion = null;
    }
  }

  try {
    const twPkgPath = path.join(cwd, 'node_modules', 'tailwindcss', 'package.json');
    status.tailwindVersion = await readPackageVersion(twPkgPath);
  } catch (error) {
    status.tailwindVersionError = String((error as Error)?.message || error);
  }

  try {
    const nextPkgPath = path.join(cwd, 'node_modules', 'next', 'package.json');
    status.nextVersion = await readPackageVersion(nextPkgPath);
  } catch {
    status.nextVersion = null;
  }

  try {
    const cssPath = path.join(cwd, 'src', 'app', 'globals.css');
    const css = await readFile(cssPath, 'utf8');
    status.globalsCssHasTailwindDirectives = [
      '@tailwind base',
      '@tailwind components',
      '@tailwind utilities',
    ].every((directive) => css.includes(directive));
  } catch (error) {
    status.globalsCssReadError = String((error as Error)?.message || error);
  }

  status.env = {
    node: process.version,
    TAILWIND_MODE: process.env.TAILWIND_MODE || null,
  };

  return status;
}

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STYLE_STATUS !== '1') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const now = Date.now();
  if (cachedStatus && now - cachedStatusAt <= STATUS_CACHE_MS) {
    return NextResponse.json(cachedStatus);
  }

  try {
    const status = await buildStatus();
    cachedStatus = status;
    cachedStatusAt = now;
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
