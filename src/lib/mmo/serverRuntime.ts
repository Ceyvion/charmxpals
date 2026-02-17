import { createServer as createNetServer } from 'net';

import type { PlazaServer, PlazaServerOptions } from '../../../server/mmo/plazaServer';
import { startPlazaServer } from '../../../server/mmo/plazaServer';

type GlobalMmoRuntime = typeof globalThis & {
  __plazaServerPromise?: Promise<PlazaServer | null>;
};

const globalRuntime = globalThis as GlobalMmoRuntime;

function resolvePort(options: PlazaServerOptions) {
  if (typeof options.port === 'number' && Number.isFinite(options.port)) {
    return options.port;
  }
  const envPort = Number(process.env.MMO_WS_PORT || 8787);
  return Number.isFinite(envPort) ? envPort : 8787;
}

function resolveHost(options: PlazaServerOptions) {
  if (typeof options.host === 'string' && options.host.trim()) {
    return options.host;
  }
  return '0.0.0.0';
}

function canBind(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const probe = createNetServer();
    probe.once('error', () => {
      resolve(false);
    });
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen({ host, port });
  });
}

function createLogger() {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }
  return (message: string) => {
    console.log(message);
  };
}

function isAddrInUseError(err: unknown) {
  if (!err || typeof err !== 'object' || !('code' in err)) {
    return false;
  }
  return (err as NodeJS.ErrnoException).code === 'EADDRINUSE';
}

export async function ensurePlazaServer(options: PlazaServerOptions = {}) {
  if (!globalRuntime.__plazaServerPromise) {
    const logger = options.logger || createLogger();
    const port = resolvePort(options);
    const host = resolveHost(options);

    globalRuntime.__plazaServerPromise = (async () => {
      const available = await canBind(host, port);
      if (!available) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[mmo] plaza server port already in use, assuming external server is running');
        }
        return null;
      }
      return startPlazaServer({ ...options, host, port, logger });
    })().catch((err) => {
      if (isAddrInUseError(err)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[mmo] plaza server port already in use, assuming external server is running');
        }
        return null;
      }
      delete globalRuntime.__plazaServerPromise;
      throw err;
    });
  }
  return globalRuntime.__plazaServerPromise;
}

export function getPlazaServerPromise() {
  return globalRuntime.__plazaServerPromise;
}
