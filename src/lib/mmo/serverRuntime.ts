import type { PlazaServer, PlazaServerOptions } from '../../../server/mmo/plazaServer';
import { startPlazaServer } from '../../../server/mmo/plazaServer';

type GlobalMmoRuntime = typeof globalThis & {
  __plazaServerPromise?: Promise<PlazaServer | null>;
};

const globalRuntime = globalThis as GlobalMmoRuntime;

function createLogger() {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }
  return (message: string) => {
    console.log(message);
  };
}

function isAddrInUseError(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as any).code === 'EADDRINUSE');
}

export async function ensurePlazaServer(options: PlazaServerOptions = {}) {
  if (!globalRuntime.__plazaServerPromise) {
    const logger = options.logger || createLogger();
    globalRuntime.__plazaServerPromise = startPlazaServer({ ...options, logger }).catch((err) => {
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

