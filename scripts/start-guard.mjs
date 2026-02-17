#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const startArgs = process.argv.slice(2);
const forceStart = startArgs.includes('--force');
const killDev = startArgs.includes('--kill-dev') || forceStart;
const nextStartArgs = startArgs.filter((arg) => arg !== '--force' && arg !== '--kill-dev');
const startPort = resolvePort(startArgs);

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // intentional sync wait for CLI control loop
  }
}

function resolvePort(args) {
  const defaultPort = 3000;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
      const next = args[i + 1];
      const parsed = Number(next);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
      return defaultPort;
    }
    if (arg.startsWith('--port=')) {
      const parsed = Number(arg.split('=')[1]);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
      return defaultPort;
    }
  }
  return defaultPort;
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

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findPortListenerPid(port) {
  try {
    const output = execFileSync('lsof', ['-nP', '-tiTCP:' + String(port), '-sTCP:LISTEN'], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .map((line) => Number(line.trim()))
      .find((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    return output ?? null;
  } catch {
    return null;
  }
}

function stopDevServer(pid) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return false;
  }

  for (let i = 0; i < 30; i += 1) {
    if (!processIsAlive(pid)) {
      return true;
    }
    sleepSync(100);
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    return !processIsAlive(pid);
  }

  sleepSync(100);
  return !processIsAlive(pid);
}

function ensureDevServerStopped() {
  const devPid = hasProjectDevServerRunning();
  if (!devPid) {
    return true;
  }

  if (!killDev) {
    return false;
  }

  console.log(`[start-guard] Attempting to stop dev server (PID ${devPid})...`);
  const stopped = stopDevServer(devPid);
  if (!stopped) {
    console.error(`[start-guard] Could not stop dev server (PID ${devPid}).`);
    return false;
  }

  console.log(`[start-guard] Stopped dev server (PID ${devPid}).`);
  return true;
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
  const chunkRequirePattern = /require\((['"`])(\.{1,2}\/[^'"`]+\.js)\1\)/g;

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

  // Next.js keeps chunk maps in webpack-runtime.js (e.g. "./9161.js", "./vendor-chunks/@swc.js").
  // If any mapped file is missing, production requests will 500 until we rebuild.
  const runtimeFile = path.join(serverDir, 'webpack-runtime.js');
  if (fs.existsSync(runtimeFile)) {
    const content = fs.readFileSync(runtimeFile, 'utf8');
    const chunkMapPathPattern = /(['"`])(\.\/[^'"`]+\.js)\1/g;
    for (const match of content.matchAll(chunkMapPathPattern)) {
      const relativePath = match[2];
      const resolvedPath = path.resolve(path.dirname(runtimeFile), relativePath);
      if (!fs.existsSync(resolvedPath)) {
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
    if (!killDev) {
      console.error('[start-guard] Stop it before running `npm start` to avoid .next corruption.');
      console.error('[start-guard] If this is safe, run with --kill-dev or --force.');
      process.exit(1);
    }
    if (!ensureDevServerStopped()) {
      process.exit(1);
    }
  }

  if (forceStart && devPid) {
    console.log('[start-guard] Continuing in force mode after cleanup.');
  }

  const portListenerPid = findPortListenerPid(startPort);
  if (portListenerPid) {
    if (!killDev) {
      console.error(`[start-guard] Port ${startPort} is already in use (PID ${portListenerPid}).`);
      console.error('[start-guard] Stop the process or rerun with --kill-dev/--force.');
      process.exit(1);
    }
    console.log(`[start-guard] Attempting to stop process on port ${startPort} (PID ${portListenerPid})...`);
    const stopped = stopDevServer(portListenerPid);
    if (!stopped) {
      console.error(`[start-guard] Could not free port ${startPort} (PID ${portListenerPid}).`);
      process.exit(1);
    }
    console.log(`[start-guard] Freed port ${startPort}.`);
  }

  ensureBuildReady();

  const child = spawn(process.execPath, [nextBin, 'start', ...nextStartArgs], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

run();
