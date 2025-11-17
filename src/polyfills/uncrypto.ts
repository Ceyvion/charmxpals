import { webcrypto } from 'crypto';

const runtimeCrypto =
  typeof webcrypto !== 'undefined'
    ? webcrypto
    : (globalThis.crypto as Crypto | undefined);

if (!runtimeCrypto) {
  throw new Error('Web Crypto API is unavailable in this runtime.');
}

export const subtle = runtimeCrypto.subtle;
export default runtimeCrypto;
