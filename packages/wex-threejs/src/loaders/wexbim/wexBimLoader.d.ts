import * as THREE from 'three';

export interface WexBIMLoaderOptions {
  onProgress?: (event: ProgressEvent) => void;
  onError?: (error: Error) => void;
}

export class WexBIMLoader {
  constructor();
  
  load(
    url: string,
    onLoad: (scene: THREE.Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): void;
  
  parse(reader: unknown): Promise<THREE.Group>;
}
