declare module 'uuid';

// Ambient module shims for three.js example loaders (types may be missing)
declare module 'three/examples/jsm/loaders/GLTFLoader' {
  export class GLTFLoader {}
}
declare module 'three/examples/jsm/loaders/DRACOLoader' {
  export class DRACOLoader {}
}
declare module 'three/examples/jsm/loaders/KTX2Loader' {
  export class KTX2Loader {}
}

declare module 'ws' {
  export default class WebSocket {
    constructor(address: string, protocols?: string | string[]);
    readyState: number;
    send(data: any): void;
    close(code?: number, reason?: string): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export class WebSocketServer {
    constructor(options: any);
    on(event: string, listener: (...args: any[]) => void): this;
    close(callback?: () => void): void;
  }
}

declare module 'uncrypto' {
  export const subtle: SubtleCrypto;
  const crypto: Crypto;
  export default crypto;
}
