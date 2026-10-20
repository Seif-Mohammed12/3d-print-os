import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { cn } from '../../../shared/lib/utils';

export type ModelSize = { x: number; y: number; z: number };

/**
 * Interactive STL preview. Parses the file in the browser, so it works before the upload
 * finishes. Reports the bounding-box size (mm) once parsed.
 */
export function ModelPreview({
  file,
  className,
  onSize,
}: {
  file: File;
  className?: string;
  onSize?: (size: ModelSize) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onSizeRef = useRef(onSize);
  onSizeRef.current = onSize;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let disposed = false;
    setError(null);

    const isDark = document.documentElement.classList.contains('dark');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10_000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, isDark ? 0x1e2230 : 0xdfe3ea, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(1, 1.5, 2);
    scene.add(key);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let mesh: THREE.Mesh | null = null;
    let grid: THREE.GridHelper | null = null;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    file
      .arrayBuffer()
      .then((buffer) => {
        if (disposed) {
          return;
        }
        const geometry = new STLLoader().parse(buffer);
        // STL is Z-up; show it the way it sits on a print bed.
        geometry.rotateX(-Math.PI / 2);
        // Many exporters write zero normals; derive them from the faces so shading works.
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const box = geometry.boundingBox ?? new THREE.Box3();
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -box.min.y, -center.z);
        onSizeRef.current?.({ x: size.x, y: size.z, z: size.y });

        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.55, metalness: 0.05 }),
        );
        scene.add(mesh);

        const span = Math.max(size.x, size.y, size.z) || 10;
        grid = new THREE.GridHelper(
          span * 2.5,
          20,
          isDark ? 0x3a4052 : 0xc7cdd8,
          isDark ? 0x262b38 : 0xe3e7ee,
        );
        scene.add(grid);

        camera.position.set(span * 1.6, span * 1.3, span * 2.1);
        controls.target.set(0, size.y / 2, 0);
        controls.update();
      })
      .catch(() => {
        if (!disposed) {
          setError("This file couldn't be read as an STL.");
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
      grid?.geometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [file]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-muted/50', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      <p className="pointer-events-none absolute bottom-2 start-3 text-xs text-muted-foreground">
        Drag to rotate · scroll to zoom
      </p>
    </div>
  );
}
