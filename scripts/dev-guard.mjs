#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const pidFile = path.join(projectRoot, '.dev.pid');
const nextDevArgs = process.argv.slice(2);

function readPidFromFile() {
  if (!fs.existsSync(pidFile)) {
    return null;
  }

  const raw = fs.readFileSync(pidFile, 'utf8').trim();
  if (!raw) {
    return null;
  }

  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function removePidFileIfOwnedByCurrentProcess() {
  const pid = readPidFromFile();
  if (pid === process.pid) {
    fs.rmSync(pidFile, { force: true });
  }
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function looksLikeNextDevProcess(pid) {
  try {
    const output = execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
    }).trim();

    return output.includes('next dev') || output.includes('next-server') || output.includes('next/dist/bin/next dev');
  } catch {
    return false;
  }
}

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

function findExistingNextDevPidInProject() {
  try {
    const output = execFileSync('ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' });
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const firstSpace = trimmed.indexOf(' ');
      if (firstSpace <= 0) continue;

      const pidPart = trimmed.slice(0, firstSpace).trim();
      const commandPart = trimmed.slice(firstSpace + 1).trim();
      const pid = Number(pidPart);

      if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
        continue;
      }

      if (!commandPart.includes('next/dist/bin/next dev')) {
        continue;
      }

      const cwd = readProcessCwd(pid);
      if (cwd === projectRoot) {
        return pid;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function guardAgainstDuplicateDevServer() {
  const discoveredPid = findExistingNextDevPidInProject();
  if (discoveredPid) {
    console.error(`[dev-guard] A dev server is already running in this repo (PID ${discoveredPid}).`);
    console.error('[dev-guard] Stop it before starting another one to avoid .next chunk corruption.');
    process.exit(1);
  }

  const pid = readPidFromFile();
  if (!pid || pid === process.pid) {
    return;
  }

  if (!processExists(pid)) {
    fs.rmSync(pidFile, { force: true });
    return;
  }

  if (looksLikeNextDevProcess(pid)) {
    console.error(`[dev-guard] A dev server is already running in this repo (PID ${pid}).`);
    console.error('[dev-guard] Stop it before starting another one to avoid .next chunk corruption.');
    process.exit(1);
  }

  // PID reused by an unrelated process: clear stale state and continue.
  fs.rmSync(pidFile, { force: true });
}

function collectJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function hasBrokenServerChunkState() {
  const serverDir = path.join(projectRoot, '.next', 'server');
  if (!fs.existsSync(serverDir)) {
    return false;
  }

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

function cleanNextCacheIfBroken() {
  if (!hasBrokenServerChunkState()) {
    return;
  }

  const nextDir = path.join(projectRoot, '.next');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('[dev-guard] Found stale .next server chunk references. Cleared .next cache.');
}

function writePidFile() {
  fs.writeFileSync(pidFile, `${process.pid}\n`, 'utf8');
}

function run() {
  if (!fs.existsSync(nextBin)) {
    console.error('[dev-guard] Could not find Next.js binary. Run `npm install` first.');
    process.exit(1);
  }

  guardAgainstDuplicateDevServer();
  cleanNextCacheIfBroken();
  writePidFile();

  const child = spawn(process.execPath, [nextBin, 'dev', ...nextDevArgs], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  const shutdown = (signal) => {
    removePidFileIfOwnedByCurrentProcess();
    if (child.pid && !child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  child.on('exit', (code) => {
    removePidFileIfOwnedByCurrentProcess();
    process.exit(code ?? 0);
  });
}

run();
