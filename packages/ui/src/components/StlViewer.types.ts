export type ViewerState = 'idle' | 'loading' | 'loaded' | 'error';

export type CameraControls = {
  rotate: boolean;
  zoom: boolean;
  pan: boolean;
};

export type StlViewerProps = {
  /** STL file URL to load */
  stlUrl?: string;
  /** STL file object (alternative to stlUrl) */
  stlFile?: File;
  /** CSS class name for the container */
  className?: string;
  /** Custom container style */
  style?: React.CSSProperties;
  /** Initial camera position */
  initialCameraPosition?: [number, number, number];
  /** Enable/disable camera controls */
  enableControls?: CameraControls;
  /** Auto-rotate the model */
  autoRotate?: boolean;
  /** Auto-rotate speed */
  autoRotateSpeed?: number;
  /** Background color */
  backgroundColor?: string;
  /** Show grid helper */
  showGrid?: boolean;
  /** Show axes helper */
  showAxes?: boolean;
  /** Model color */
  modelColor?: string;
  /** Model material type */
  materialType?: 'standard' | 'normal' | 'wireframe';
  /** Callback when model loads successfully */
  onLoad?: (geometry: unknown) => void;
  /** Callback when loading fails */
  onError?: (error: Error) => void;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: React.ReactNode;
  /** Show reset camera button */
  showResetButton?: boolean;
  /** Custom reset button component */
  resetButtonComponent?: React.ReactNode;
  /** Minimum zoom distance */
  minDistance?: number;
  /** Maximum zoom distance */
  maxDistance?: number;
};

export type StlViewerRef = {
  /** Reset camera to initial position */
  resetCamera: () => void;
  /** Get current viewer state */
  getState: () => ViewerState;
  /** Force re-render */
  refresh: () => void;
};
