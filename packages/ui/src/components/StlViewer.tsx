import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

import type { StlViewerProps, StlViewerRef, ViewerState } from './StlViewer.types';

// Internal component for STL mesh
function StlMesh({
  stlUrl,
  stlFile,
  modelColor = '#6366f1',
  materialType = 'standard',
  onLoad,
  onError,
}: {
  stlUrl?: string;
  stlFile?: File;
  modelColor?: string;
  materialType?: 'standard' | 'normal' | 'wireframe';
  onLoad?: (geometry: any) => void;
  onError?: (error: Error) => void;
}) {
  const meshRef = useRef<any>(null);
  const [geometry, setGeometry] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loader = new STLLoader();

    const loadStl = async () => {
      try {
        let data: ArrayBuffer;

        if (stlFile) {
          data = await stlFile.arrayBuffer();
        } else if (stlUrl) {
          const response = await fetch(stlUrl);
          if (!response.ok) {
            throw new Error(`Failed to load STL: ${response.statusText}`);
          }
          data = await response.arrayBuffer();
        } else {
          throw new Error('No STL URL or file provided');
        }

        const loadedGeometry = loader.parse(data);
        setGeometry(loadedGeometry);
        onLoad?.(loadedGeometry);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load STL');
        setError(error);
        onError?.(error);
      }
    };

    loadStl();
  }, [stlUrl, stlFile, onLoad, onError]);

  if (error) {
    return null;
  }

  if (!geometry) {
    return null;
  }

  const material = (() => {
    switch (materialType) {
      case 'normal':
        return <meshNormalMaterial />;
      case 'wireframe':
        return <meshBasicMaterial color={modelColor} wireframe />;
      default:
        return <meshStandardMaterial color={modelColor} metalness={0.1} roughness={0.5} />;
    }
  })();

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry}>
        {material}
      </mesh>
    </Center>
  );
}

// Scene setup component
function Scene({
  backgroundColor = '#1a1a2e',
  showGrid = true,
  showAxes = false,
  enableControls = { rotate: true, zoom: true, pan: true },
  autoRotate = false,
  autoRotateSpeed = 1,
  minDistance = 0.1,
  maxDistance = 1000,
  children,
}: {
  backgroundColor?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  enableControls?: { rotate: boolean; zoom: boolean; pan: boolean };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <OrbitControls
        enableRotate={enableControls.rotate}
        enableZoom={enableControls.zoom}
        enablePan={enableControls.pan}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        minDistance={minDistance}
        maxDistance={maxDistance}
        enableDamping
        dampingFactor={0.05}
      />
      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6366f1"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#818cf8"
          fadeDistance={30}
          fadeStrength={1}
          position={[0, -0.01, 0]}
        />
      )}
      {children}
    </>
  );
}

// Default loading component
function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-900/50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4" />
        <p className="text-white text-sm font-medium">Loading 3D model...</p>
      </div>
    </div>
  );
}

// Default error component
function DefaultErrorComponent({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-900/50">
      <div className="text-center max-w-md p-6">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">Failed to load model</h3>
        <p className="text-gray-400 text-sm mb-4">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// Default reset button component
function DefaultResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="absolute top-4 right-4 px-3 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700/80 transition-colors backdrop-blur-sm text-sm font-medium z-10"
      aria-label="Reset camera"
    >
      Reset View
    </button>
  );
}

// Main StlViewer component
export const StlViewer = forwardRef<StlViewerRef, StlViewerProps>(
  (
    {
      stlUrl,
      stlFile,
      className = '',
      style,
      initialCameraPosition = [5, 5, 5],
      enableControls = { rotate: true, zoom: true, pan: true },
      autoRotate = false,
      autoRotateSpeed = 1,
      backgroundColor = '#1a1a2e',
      showGrid = true,
      showAxes = false,
      modelColor = '#6366f1',
      materialType = 'standard',
      onLoad,
      onError,
      loadingComponent,
      errorComponent,
      showResetButton = true,
      resetButtonComponent,
      minDistance = 0.1,
      maxDistance = 1000,
    },
    ref,
  ) => {
    const [state, setState] = useState<ViewerState>('idle');
    const [loadError, setLoadError] = useState<Error | null>(null);
    const [key, setKey] = useState(0);

    const handleLoad = useCallback(
      (geometry: THREE.BufferGeometry) => {
        setState('loaded');
        setLoadError(null);
        onLoad?.(geometry);
      },
      [onLoad],
    );

    const handleError = useCallback(
      (error: Error) => {
        setState('error');
        setLoadError(error);
        onError?.(error);
      },
      [onError],
    );

    const handleRetry = useCallback(() => {
      setState('loading');
      setLoadError(null);
      setKey((prev) => prev + 1);
    }, []);

    const resetCamera = useCallback(() => {
      // This will be handled by the OrbitControls reset
      setState((prev) => prev);
    }, []);

    const getState = useCallback(() => state, [state]);

    const refresh = useCallback(() => {
      setKey((prev) => prev + 1);
      setState('loading');
    }, []);

    useImperativeHandle(ref, () => ({
      resetCamera,
      getState,
      refresh,
    }));

    useEffect(() => {
      if (stlUrl || stlFile) {
        setState('loading');
      }
    }, [stlUrl, stlFile]);

    return (
      <div className={`relative w-full h-full ${className}`} style={style}>
        {state === 'loading' && (loadingComponent || <DefaultLoadingComponent />)}

        {state === 'error' &&
          loadError &&
          (errorComponent || <DefaultErrorComponent error={loadError} onRetry={handleRetry} />)}

        {(state === 'idle' || state === 'loaded') && (
          <>
            {showResetButton &&
              (resetButtonComponent || <DefaultResetButton onReset={resetCamera} />)}
            <Canvas
              key={key}
              camera={{ position: initialCameraPosition, fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
            >
              <Scene
                backgroundColor={backgroundColor}
                showGrid={showGrid}
                showAxes={showAxes}
                enableControls={enableControls}
                autoRotate={autoRotate}
                autoRotateSpeed={autoRotateSpeed}
                minDistance={minDistance}
                maxDistance={maxDistance}
              >
                <StlMesh
                  stlUrl={stlUrl}
                  stlFile={stlFile}
                  modelColor={modelColor}
                  materialType={materialType}
                  onLoad={handleLoad}
                  onError={handleError}
                />
              </Scene>
            </Canvas>
          </>
        )}
      </div>
    );
  },
);

StlViewer.displayName = 'StlViewer';
