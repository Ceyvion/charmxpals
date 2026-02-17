#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const startArgs = process.argv.slice(2);

function readProcessCwd(pid) {
  try {
    const output = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
      encoding: 'utf8',
    });
    const cwdLine = output
      .split('\n')
      .find((line) => line.startsWith('n'));
    return cwdLine ? cwdLine.slice(1) : null;
  } catch {
    return null;
  }
}

function hasProjectDevServerRunning() {
  try {
    const output = execFileSync('ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' });
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const firstSpace = trimmed.indexOf(' ');
      if (firstSpace <= 0) continue;
      const pid = Number(trimmed.slice(0, firstSpace).trim());
      const command = trimmed.slice(firstSpace + 1).trim();
      if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
      if (!command.includes('next/dist/bin/next dev')) continue;
      const cwd = readProcessCwd(pid);
      if (cwd === projectRoot) return pid;
    }
    return null;
  } catch {
    return null;
  }
}

function collectJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
  return files;
}

function hasBrokenServerChunkState() {
  const serverDir = path.join(projectRoot, '.next', 'server');
  if (!fs.existsSync(serverDir)) return false;

  const jsFiles = collectJsFiles(serverDir);
  const chunkRequirePattern = /require\((['"`])((?:\.\/|\.\.\/chunks\/)\d+\.js)\1\)/g;

  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(jsFile, 'utf8');
    for (const match of content.matchAll(chunkRequirePattern)) {
      const relativeChunkPath = match[2];
      const resolvedChunkPath = path.resolve(path.dirname(jsFile), relativeChunkPath);
      if (!fs.existsSync(resolvedChunkPath)) {
        return true;
      }
    }
  }
  return false;
}

function runBuild() {
  console.log('[start-guard] Running `next build` to prepare a clean production bundle...');
  execFileSync(process.execPath, [nextBin, 'build'], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });
}

function ensureBuildReady() {
  const buildIdPath = path.join(projectRoot, '.next', 'BUILD_ID');
  const hasBuild = fs.existsSync(buildIdPath);
  const hasBrokenChunks = hasBrokenServerChunkState();

  if (!hasBuild || hasBrokenChunks) {
    fs.rmSync(path.join(projectRoot, '.next'), { recursive: true, force: true });
    runBuild();
  }
}

function run() {
  if (!fs.existsSync(nextBin)) {
    console.error('[start-guard] Could not find Next.js binary. Run `npm install` first.');
    process.exit(1);
  }

  const devPid = hasProjectDevServerRunning();
  if (devPid) {
    console.error(`[start-guard] A dev server is running in this repo (PID ${devPid}).`);
    console.error('[start-guard] Stop it before running `npm start` to avoid .next corruption.');
    process.exit(1);
  }

  ensureBuildReady();

  const child = spawn(process.execPath, [nextBin, 'start', ...startArgs], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

run();
