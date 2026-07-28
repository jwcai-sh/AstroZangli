declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera, EventDispatcher, MOUSE, Vector3 } from 'three';

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement);

    object: Camera;
    domElement: HTMLElement;

    // API
    enabled: boolean;
    target: Vector3;

    minDistance: number;
    maxDistance: number;

    minZoom: number;
    maxZoom: number;

    minPolarAngle: number;
    maxPolarAngle: number;

    minAzimuthAngle: number;
    maxAzimuthAngle: number;

    enableDamping: boolean;
    dampingFactor: number;

    enableZoom: boolean;
    zoomSpeed: number;

    enableRotate: boolean;
    rotateSpeed: number;

    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;
    keyPanSpeed: number;

    autoRotate: boolean;
    autoRotateSpeed: number;

    enableKeys: boolean;
    keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };

    mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };

    target0: Vector3;
    position0: Vector3;
    zoom0: number;

    getPolarAngle(): number;
    getAzimuthalAngle(): number;

    saveState(): void;
    reset(): void;
    update(): boolean;

    dispose(): void;
  }
}

declare module 'three/examples/jsm/renderers/CSS2DRenderer' {
  import { Object3D, Scene, Camera } from 'three';

  export class CSS2DObject extends Object3D {
    constructor(element: HTMLElement);
    element: HTMLElement;
  }

  export class CSS2DRenderer {
    constructor();
    domElement: HTMLElement;
    getSize(): { width: number; height: number };
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
  }
}
