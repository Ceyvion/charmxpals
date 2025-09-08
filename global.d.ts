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
