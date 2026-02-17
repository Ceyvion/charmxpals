#!/usr/bin/env node

import { spawn } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();
let shuttingDown = false;

function runScript(name, env = process.env) {
  const child = spawn(npmCmd, ['run', name], {
    stdio: 'inherit',
    env,
  });
  children.add(child);
  child.on('exit', () => {
    children.delete(child);
  });
  return child;
}

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill(signal);
    } catch {
      // noop
    }
  }
}

const sharedEnv = { ...process.env, MMO_AUTO_START: '0' };
const mmo = runScript('mmo:server', sharedEnv);
const dev = runScript('dev', sharedEnv);

function handleExit(code) {
  stopAll('SIGTERM');
  setTimeout(() => stopAll('SIGKILL'), 500);
  process.exit(code);
}

mmo.on('exit', (code, signal) => {
  if (shuttingDown) return;
  console.error(`dev:plaza mmo server exited (${signal || code || 0})`);
  handleExit(typeof code === 'number' ? code : 1);
});

dev.on('exit', (code, signal) => {
  if (shuttingDown) return;
  console.error(`dev:plaza next dev exited (${signal || code || 0})`);
  handleExit(typeof code === 'number' ? code : 1);
});

process.on('SIGINT', () => handleExit(0));
process.on('SIGTERM', () => handleExit(0));
