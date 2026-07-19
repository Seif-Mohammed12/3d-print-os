import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Grid, Box, Ruler, Maximize2 } from 'lucide-react';

interface ModelViewerProps {
  triangles: Array<{
    v1: { x: number; y: number; z: number };
    v2: { x: number; y: number; z: number };
    v3: { x: number; y: number; z: number };
  }>;
  className?: string;
  dimensions?: { x: number; y: number; z: number };
  orientation?: { x: number; y: number; z: number };
  _onOrientationChange?: (orientation: { x: number; y: number; z: number }) => void;
  overlayType?: 'none' | 'support' | 'risk' | 'orientation';
}

export function ModelViewer({
  triangles,
  className = '',
  dimensions,
  orientation = { x: 0, y: 0, z: 0 },
  _onOrientationChange,
  overlayType = 'none',
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axisRef = useRef<THREE.AxesHelper | null>(null);
  const boundingBoxRef = useRef<THREE.BoxHelper | null>(null);
  const _printBedRef = useRef<THREE.Mesh | null>(null);
  const _overlayMeshRef = useRef<THREE.Mesh | null>(null);
  const cameraControlsRef = useRef({
    isDragging: false,
    isPanning: false,
    previousMousePosition: { x: 0, y: 0 },
    panTarget: new THREE.Vector3(0, 0, 0),
  });
  const initialCameraPositionRef = useRef<THREE.Vector3 | null>(null);
  const _currentOrientationRef = useRef(orientation);

  const [showGrid, setShowGrid] = useState(true);
  const [showAxis, setShowAxis] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);

  useEffect(() => {
    if (!containerRef.current || triangles.length === 0) return;

    // Initialize Three.js
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene - professional neutral background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Camera - professional viewing angle
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    const cameraDistance = 120;
    camera.position.set(cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    initialCameraPositionRef.current = camera.position.clone();

    // Renderer - high quality
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Professional studio lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(50, 80, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 500;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50, 40, -50);
    scene.add(fillLight);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 30, -80);
    scene.add(rimLight);

    // Print bed (220x220mm standard)
    const bedSize = 220;
    const bedGeometry = new THREE.BoxGeometry(bedSize, 2, bedSize);
    const bedMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.3,
      roughness: 0.8,
    });
    const printBed = new THREE.Mesh(bedGeometry, bedMaterial);
    printBed.position.y = -1;
    printBed.receiveShadow = true;
    scene.add(printBed);
    _printBedRef.current = printBed;

    // Floor plane for shadows (larger than bed)
    const floorGeometry = new THREE.PlaneGeometry(400, 400);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.05 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create geometry from triangles
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    triangles.forEach((tri) => {
      vertices.push(tri.v1.x, tri.v1.y, tri.v1.z);
      vertices.push(tri.v2.x, tri.v2.y, tri.v2.z);
      vertices.push(tri.v3.x, tri.v3.y, tri.v3.z);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    // Calculate face normals for overlay
    const faceNormals: THREE.Vector3[] = [];
    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i];
      if (!tri) continue;

      const v1 = new THREE.Vector3(tri.v1.x, tri.v1.y, tri.v1.z);
      const v2 = new THREE.Vector3(tri.v2.x, tri.v2.y, tri.v2.z);
      const v3 = new THREE.Vector3(tri.v3.x, tri.v3.y, tri.v3.z);

      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      faceNormals.push(normal);
    }

    // Create vertex colors based on overlay type
    const colors: number[] = [];
    const vertexNormals = geometry.attributes.normal?.array as Float32Array;

    if (!vertexNormals) {
      // Fallback to default colors if no normals
      for (let i = 0; i < vertices.length / 3; i++) {
        colors.push(0.4, 0.45, 0.5);
      }
    } else {
      // Apply initial orientation to normals for color calculation
      const radX = (orientation.x * Math.PI) / 180;
      const radY = (orientation.y * Math.PI) / 180;
      const radZ = (orientation.z * Math.PI) / 180;

      for (let i = 0; i < vertexNormals.length; i += 3) {
        const nx = vertexNormals[i] || 0;
        const ny = vertexNormals[i + 1] || 0;
        const nz = vertexNormals[i + 2] || 0;

        let color: THREE.Color;

        if (overlayType === 'orientation') {
          // Apply rotation to normal
          const normal = new THREE.Vector3(nx, ny, nz);
          normal.applyEuler(new THREE.Euler(radX, radY, radZ));

          // Color based on rotated face normal direction (build direction is -Z)
          // Blue = facing down (toward bed, good contact)
          // Green = facing up (away from bed, prints in air, no support needed)
          // Red = overhangs/angled faces that need support
          const dotWithDown = -normal.z;

          if (dotWithDown > 0.7) {
            // Blue: Facing down (toward bed)
            color = new THREE.Color(0x3b82f6);
          } else if (dotWithDown < -0.7) {
            // Green: Facing up (away from bed, prints in air)
            color = new THREE.Color(0x22c55e);
          } else {
            // Red: Angled/overhang (needs support)
            color = new THREE.Color(0xef4444);
          }
        } else {
          // Support overlay (original logic)
          const angleFromVertical = nz !== undefined ? Math.acos(nz) * (180 / Math.PI) : 0;

          if (angleFromVertical < 45) {
            color = new THREE.Color(0x22c55e);
          } else if (angleFromVertical < 60) {
            color = new THREE.Color(0xeab308);
          } else {
            color = new THREE.Color(0xef4444);
          }
        }

        colors.push(color.r, color.g, color.b);
      }
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Professional matte plastic material (like real 3D prints)
    const material = new THREE.MeshStandardMaterial({
      color: overlayType === 'orientation' ? 0xffffff : 0x64748b, // White for orientation overlay to show colors clearly
      metalness: 0.0,
      roughness: 0.7,
      side: THREE.DoubleSide,
      vertexColors: true, // Always enable vertex colors for orientation overlay
    });

    // Mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // Center and scale the model
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    if (!boundingBox) return;

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 60 / maxDim;
    mesh.scale.set(scale, scale, scale);

    // Don't set initial position or rotation - let the useEffect handle it
    // This ensures consistent behavior

    // Professional grid (matches print bed)
    const gridHelper = new THREE.GridHelper(bedSize, 22, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // Axis helper (hidden by default)
    const axesHelper = new THREE.AxesHelper(30);
    axesHelper.visible = showAxis;
    scene.add(axesHelper);
    axisRef.current = axesHelper;

    // Bounding box helper (hidden by default)
    const boxHelper = new THREE.BoxHelper(mesh, 0x64748b);
    boxHelper.visible = showBoundingBox;
    scene.add(boxHelper);
    boundingBoxRef.current = boxHelper;

    // Smooth camera controls
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        // Right-click or middle-click for pan
        cameraControlsRef.current.isPanning = true;
      } else {
        // Left-click for orbit
        cameraControlsRef.current.isDragging = true;
      }
      cameraControlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!cameraControlsRef.current.isDragging && !cameraControlsRef.current.isPanning) return;

      const deltaX = e.clientX - cameraControlsRef.current.previousMousePosition.x;
      const deltaY = e.clientY - cameraControlsRef.current.previousMousePosition.y;

      if (cameraControlsRef.current.isPanning) {
        // Pan camera
        const panSpeed = 0.5;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        up.copy(camera.up);

        camera.position.addScaledVector(right, -deltaX * panSpeed);
        camera.position.addScaledVector(up, deltaY * panSpeed);
        cameraControlsRef.current.panTarget.addScaledVector(right, -deltaX * panSpeed);
        cameraControlsRef.current.panTarget.addScaledVector(up, deltaY * panSpeed);
        camera.lookAt(cameraControlsRef.current.panTarget);
      } else if (mesh) {
        // Orbit around center
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi -= deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        camera.position.setFromSpherical(spherical);
        camera.lookAt(cameraControlsRef.current.panTarget);
      }

      cameraControlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      cameraControlsRef.current.isDragging = false;
      cameraControlsRef.current.isPanning = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const direction = camera.position.clone().normalize();
      const distance = camera.position.length();
      const newDistance = Math.max(30, Math.min(300, distance * (1 + e.deltaY * zoomSpeed)));
      camera.position.copy(direction.multiplyScalar(newDistance));
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop - no auto-rotation for professional feel
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
    };
  }, [triangles]);

  // Reset camera to initial position
  const resetCamera = () => {
    if (cameraRef.current && initialCameraPositionRef.current) {
      cameraRef.current.position.copy(initialCameraPositionRef.current);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  // Toggle helpers
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
    if (axisRef.current) axisRef.current.visible = showAxis;
    if (boundingBoxRef.current) boundingBoxRef.current.visible = showBoundingBox;
  }, [showGrid, showAxis, showBoundingBox]);

  // Update orientation when prop changes using quaternion rotation
  useEffect(() => {
    if (meshRef.current) {
      const radX = (orientation.x * Math.PI) / 180;
      const radY = (orientation.y * Math.PI) / 180;
      const radZ = (orientation.z * Math.PI) / 180;

      // Reset position to origin first
      meshRef.current.position.set(0, 0, 0);

      // Apply rotation using quaternion for proper 3D orientation
      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(new THREE.Euler(radX, radY, radZ, 'XYZ'));
      meshRef.current.quaternion.copy(quaternion);

      // Update matrix world to get correct bounding box
      meshRef.current.updateMatrixWorld();

      // Calculate world-space bounding box after rotation
      const box = new THREE.Box3().setFromObject(meshRef.current);

      if (box) {
        // Position mesh so it sits on the print bed (y = 0)
        // The mesh extends from box.min.y to box.max.y, so we move it up by -box.min.y
        meshRef.current.position.y = -box.min.y;
      }
    }
  }, [orientation]);

  // Update overlay when overlay type changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.vertexColors = overlayType !== 'none';
      meshRef.current.material.color.setHex(overlayType === 'orientation' ? 0xffffff : 0x64748b);
      meshRef.current.material.needsUpdate = true;
    }
  }, [overlayType]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'grab',
        }}
      />

      {/* Control toolbar */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={resetCamera}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-white transition-colors"
          title="Reset camera"
        >
          <RotateCcw size={18} className="text-slate-600" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 backdrop-blur-sm rounded-lg shadow-md transition-colors ${showGrid ? 'bg-blue-500 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'}`}
          title="Toggle grid"
        >
          <Grid size={18} />
        </button>
        <button
          onClick={() => setShowAxis(!showAxis)}
          className={`p-2 backdrop-blur-sm rounded-lg shadow-md transition-colors ${showAxis ? 'bg-blue-500 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'}`}
          title="Toggle axis"
        >
          <Box size={18} />
        </button>
        <button
          onClick={() => setShowBoundingBox(!showBoundingBox)}
          className={`p-2 backdrop-blur-sm rounded-lg shadow-md transition-colors ${showBoundingBox ? 'bg-blue-500 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'}`}
          title="Toggle bounding box"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Dimensions overlay */}
      {dimensions && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Ruler size={16} />
            <span className="font-medium">Dimensions</span>
          </div>
          <div className="space-y-1 text-slate-500">
            <div>X: {dimensions.x.toFixed(2)} mm</div>
            <div>Y: {dimensions.y.toFixed(2)} mm</div>
            <div>Z: {dimensions.z.toFixed(2)} mm</div>
          </div>
        </div>
      )}
    </div>
  );
}
