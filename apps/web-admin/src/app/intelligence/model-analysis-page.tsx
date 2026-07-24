import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { ModelViewer } from '../../shared/components/model-viewer';
import { AIAnalysisPanel } from '../../shared/components/ai-analysis-panel';

interface AnalysisResult {
  volume: number;
  dimensions: { x: number; y: number; z: number };
  weight: number;
  printabilityScore: number;
  estimatedTime: number;
  materialRequired: number;
  surfaceArea: number;
  triangleCount: number;
  infillVolume: number;
  supportVolume: number;
  totalMaterial: number;
  optimalOrientation: { axis: string; angle: number };
  estimatedPriceRange?: { min: number; max: number };
}

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface AIAnalysisResult {
  geometry: {
    volumeMm3: number;
    surfaceAreaMm2: number;
    boundingBox: { x: number; y: number; z: number };
    triangleCount: number;
    dimensions: { width: number; height: number; depth: number };
  };
  orientation: {
    recommended: { x: number; y: number; z: number };
    score: number;
    explanation: string;
  };
  support: {
    supportVolumeCm3: number;
    supportPercentage: number;
    supportDifficulty: string;
    overhangAreaMm2: number;
    recommendations: string[];
  };
  estimation: {
    material: {
      totalMaterialVolumeCm3: number;
      estimatedWeightGrams: number;
    };
    time: {
      layers: number;
      totalTimeMinutes: number;
    };
    difficultyScore: number;
    riskPercentage: number;
    riskFactors: string[];
  };
  printabilityScore: number;
}

const parseSTL = (arrayBuffer: ArrayBuffer): Triangle[] => {
  const dataView = new DataView(arrayBuffer);
  const triangles: Triangle[] = [];

  if (arrayBuffer.byteLength > 84) {
    const triangleCount = dataView.getUint32(80, true);
    const expectedSize = 84 + triangleCount * 50;

    if (arrayBuffer.byteLength >= expectedSize) {
      for (let i = 0; i < triangleCount; i++) {
        const offset = 84 + i * 50;
        const v1 = {
          x: dataView.getFloat32(offset + 12, true),
          y: dataView.getFloat32(offset + 16, true),
          z: dataView.getFloat32(offset + 20, true),
        };
        const v2 = {
          x: dataView.getFloat32(offset + 24, true),
          y: dataView.getFloat32(offset + 28, true),
          z: dataView.getFloat32(offset + 32, true),
        };
        const v3 = {
          x: dataView.getFloat32(offset + 36, true),
          y: dataView.getFloat32(offset + 40, true),
          z: dataView.getFloat32(offset + 44, true),
        };
        triangles.push({ v1, v2, v3 });
      }
      return triangles;
    }
  }

  const text = new TextDecoder().decode(arrayBuffer);
  const lines = text.split('\n');
  let currentTriangle: Partial<Triangle> = {};
  let vertexCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const x = parseFloat(parts[1] || '0');
        const y = parseFloat(parts[2] || '0');
        const z = parseFloat(parts[3] || '0');

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          const vertex = { x, y, z };

          if (vertexCount === 0) {
            currentTriangle.v1 = vertex;
          } else if (vertexCount === 1) {
            currentTriangle.v2 = vertex;
          } else if (vertexCount === 2) {
            currentTriangle.v3 = vertex;
          }
          vertexCount++;
        }
      }
    } else if (
      trimmed.startsWith('endfacet') &&
      currentTriangle.v1 &&
      currentTriangle.v2 &&
      currentTriangle.v3
    ) {
      triangles.push(currentTriangle as Triangle);
      currentTriangle = {};
      vertexCount = 0;
    }
  }

  return triangles;
};

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

function calculateBoundingBox(triangles: Triangle[]): { min: Vector3; max: Vector3 } {
  if (triangles.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const tri of triangles) {
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
      maxZ = Math.max(maxZ, v.z);
    }
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

function calculateVolume(triangles: Triangle[]): number {
  let volume = 0;

  for (const tri of triangles) {
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

    // Signed volume of tetrahedron formed by triangle and origin
    const signedVolume =
      (v1.x * (v2.y * v3.z - v2.z * v3.y) +
        v1.y * (v2.z * v3.x - v2.x * v3.z) +
        v1.z * (v2.x * v3.y - v2.y * v3.x)) /
      6;

    volume += signedVolume;
  }

  return Math.abs(volume);
}

function calculateSurfaceArea(triangles: Triangle[]): number {
  let area = 0;

  for (const tri of triangles) {
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

    // Calculate triangle area using cross product
    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

    const cross = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x,
    };

    const triangleArea = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) / 2;
    area += triangleArea;
  }

  return area;
}

function calculatePrintabilityScore(
  triangles: Triangle[],
  dimensions: { x: number; y: number; z: number },
): number {
  let score = 100;

  // Check for very thin walls (small triangles) - very lenient threshold
  for (const tri of triangles) {
    const edge1 = Math.sqrt(
      Math.pow(tri.v2.x - tri.v1.x, 2) +
        Math.pow(tri.v2.y - tri.v1.y, 2) +
        Math.pow(tri.v2.z - tri.v1.z, 2),
    );
    const edge2 = Math.sqrt(
      Math.pow(tri.v3.x - tri.v2.x, 2) +
        Math.pow(tri.v3.y - tri.v2.y, 2) +
        Math.pow(tri.v3.z - tri.v2.z, 2),
    );
    const edge3 = Math.sqrt(
      Math.pow(tri.v1.x - tri.v3.x, 2) +
        Math.pow(tri.v1.y - tri.v3.y, 2) +
        Math.pow(tri.v1.z - tri.v3.z, 2),
    );

    const minEdge = Math.min(edge1, edge2, edge3);
    if (minEdge < 0.1) {
      score -= 1; // Only extremely thin walls (0.1mm)
    }
  }

  // Check for very large overhangs (aspect ratio) - much more lenient
  const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z);
  const minDim = Math.min(dimensions.x, dimensions.y, dimensions.z);
  const aspectRatio = maxDim / minDim;

  if (aspectRatio > 20) {
    score -= 2; // Only extreme aspect ratios
  }

  // Check for very small details - more lenient
  if (minDim < 0.2) {
    score -= 1;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateInfillVolume(volume: number, infillPercentage: number = 15): number {
  // Infill adds material inside the model (not shell)
  // Assuming shell is ~2mm thick, infill is the remaining volume
  const shellVolume = volume * 0.25; // More realistic shell volume
  const innerVolume = volume - shellVolume;
  return Math.max(0, innerVolume * (infillPercentage / 100));
}

function calculateTotalMaterial(
  volume: number,
  _infillVolume: number,
  supportVolume: number,
): number {
  // STL volume represents the actual solid volume of the model
  // For solid prints, this is the material needed
  // Add support material and small waste buffer
  const wasteBuffer = volume * 0.05;
  return volume + supportVolume + wasteBuffer;
}

function calculateSupportVolume(
  triangles: Triangle[],
  dimensions: { x: number; y: number; z: number },
): number {
  // Detect overhangs (faces with normal pointing down beyond 45 degrees)
  let overhangArea = 0;

  for (const tri of triangles) {
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

    // Calculate face normal
    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

    const normal = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x,
    };

    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);

    // Check if normal points down (z < 0) beyond 45 degrees
    if (normal.z < -0.707 && normalLength > 0) {
      // Calculate triangle area using cross product magnitude
      const triangleArea = normalLength / 2;
      overhangArea += triangleArea;
    }
  }

  // Support volume is roughly overhang area * height * 0.05 (support density)
  // Convert from mm³ to cm³
  const supportHeight = dimensions.z * 0.2; // Supports typically don't go full height
  const supportVolumeMM3 = overhangArea * supportHeight * 0.05;
  return supportVolumeMM3 / 1000; // Convert to cm³
}

function calculateOptimalOrientation(
  triangles: Triangle[],
  _dimensions: { x: number; y: number; z: number },
): { axis: string; angle: number } {
  // Find the face with the largest area that points somewhat upward
  let bestNormal = { x: 0, y: 1, z: 0 };
  let maxScore = 0;

  for (const tri of triangles) {
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

    const normal = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x,
    };

    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (normalLength > 0) {
      normal.x /= normalLength;
      normal.y /= normalLength;
      normal.z /= normalLength;
    }

    // Calculate triangle area
    const area = normalLength / 2;

    // Score based on upward component and area (prefer large flat faces)
    const upwardScore = normal.y * area;
    if (upwardScore > maxScore) {
      maxScore = upwardScore;
      bestNormal = normal;
    }
  }

  // Compute quaternion to rotate bestNormal to build direction (0,0,-1)
  // Using axis-angle formula: axis = normalize(a × b), angle = acos(a · b)
  const targetNormal = { x: 0, y: 0, z: -1 }; // Build direction (down)

  const crossProduct = {
    x: bestNormal.y * targetNormal.z - bestNormal.z * targetNormal.y,
    y: bestNormal.z * targetNormal.x - bestNormal.x * targetNormal.z,
    z: bestNormal.x * targetNormal.y - bestNormal.y * targetNormal.x,
  };

  const crossLength = Math.sqrt(
    crossProduct.x * crossProduct.x +
      crossProduct.y * crossProduct.y +
      crossProduct.z * crossProduct.z,
  );
  const dotProduct =
    bestNormal.x * targetNormal.x + bestNormal.y * targetNormal.y + bestNormal.z * targetNormal.z;
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);

  // If vectors are parallel, no rotation needed
  if (crossLength < 0.001) {
    return { axis: 'X', angle: 0 };
  }

  // Normalize cross product to get rotation axis
  const rotationAxis = {
    x: crossProduct.x / crossLength,
    y: crossProduct.y / crossLength,
    z: crossProduct.z / crossLength,
  };

  // Return the dominant axis and angle for simplified application
  const maxAxisComponent = Math.max(
    Math.abs(rotationAxis.x),
    Math.abs(rotationAxis.y),
    Math.abs(rotationAxis.z),
  );
  if (Math.abs(rotationAxis.x) === maxAxisComponent) {
    return { axis: 'X', angle: rotationAxis.x > 0 ? angle : -angle };
  } else if (Math.abs(rotationAxis.y) === maxAxisComponent) {
    return { axis: 'Y', angle: rotationAxis.y > 0 ? angle : -angle };
  } else {
    return { axis: 'Z', angle: rotationAxis.z > 0 ? angle : -angle };
  }
}

function calculatePrintTime(
  volume: number,
  _dimensions: { x: number; y: number; z: number },
  _surfaceArea: number,
): number {
  // Use volumetric flow rate like real slicers (matches PrintEstimatorService)
  const layerHeightMm = 0.2;
  const nozzleWidthMm = 0.4 * 1.2; // Extrusion width
  const printSpeedMmPerS = 60;
  const volumetricFlowRateMm3PerS = printSpeedMmPerS * layerHeightMm * nozzleWidthMm;

  // Effective volume accounts for infill (not solid STL volume)
  // Assuming 20% infill for estimation
  const effectiveVolumeMm3 = volume * 1000 * (0.3 + 0.2 * 0.7);

  // Base print time
  const printTimeSeconds = effectiveVolumeMm3 / volumetricFlowRateMm3PerS;

  // Travel time (18% for well-optimized prints)
  const travelTimeSeconds = printTimeSeconds * 0.18;

  // Acceleration factor (modern printers are faster)
  const accelerationFactor = 1.1;

  // Total time
  const totalTimeSeconds = (printTimeSeconds + travelTimeSeconds) * accelerationFactor;

  return Math.round(totalTimeSeconds / 60);
}

function analyzeSupport(triangles: Triangle[], orientation: { x: number; y: number; z: number }) {
  const supportAngleThreshold = 50; // degrees - adjusted to catch more overhangs
  const buildDirection = { x: 0, y: 0, z: -1 }; // Downward in Three.js

  // Calculate triangle properties
  const triangleData = triangles.map((tri, index) => {
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

    // Calculate normal
    const edge1 = {
      x: v2.x - v1.x,
      y: v2.y - v1.y,
      z: v2.z - v1.z,
    };
    const edge2 = {
      x: v3.x - v1.x,
      y: v3.y - v1.y,
      z: v3.z - v1.z,
    };
    const normal = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x,
    };

    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (normalLength > 0) {
      normal.x /= normalLength;
      normal.y /= normalLength;
      normal.z /= normalLength;
    }

    // Apply orientation rotation to normal
    const radX = (orientation.x * Math.PI) / 180;
    const radY = (orientation.y * Math.PI) / 180;
    const radZ = (orientation.z * Math.PI) / 180;

    // Simplified rotation (would use quaternion in full implementation)
    const rotatedNormal = { ...normal };
    if (radX !== 0) {
      const cos = Math.cos(radX);
      const sin = Math.sin(radX);
      const y = rotatedNormal.y * cos - rotatedNormal.z * sin;
      const z = rotatedNormal.y * sin + rotatedNormal.z * cos;
      rotatedNormal.y = y;
      rotatedNormal.z = z;
    }
    if (radY !== 0) {
      const cos = Math.cos(radY);
      const sin = Math.sin(radY);
      const x = rotatedNormal.x * cos + rotatedNormal.z * sin;
      const z = -rotatedNormal.x * sin + rotatedNormal.z * cos;
      rotatedNormal.x = x;
      rotatedNormal.z = z;
    }
    if (radZ !== 0) {
      const cos = Math.cos(radZ);
      const sin = Math.sin(radZ);
      const x = rotatedNormal.x * cos - rotatedNormal.y * sin;
      const y = rotatedNormal.x * sin + rotatedNormal.y * cos;
      rotatedNormal.x = x;
      rotatedNormal.y = y;
    }

    // Calculate area
    const area = normalLength / 2;

    // Calculate centroid
    const centroid = {
      x: (v1.x + v2.x + v3.x) / 3,
      y: (v1.y + v2.y + v3.y) / 3,
      z: (v1.z + v2.z + v3.z) / 3,
    };

    return { index, normal: rotatedNormal, area, centroid };
  });

  // Detect overhangs - only downward-facing faces above the bed
  const overhangs = triangleData
    .map((td) => {
      const dotProduct =
        td.normal.x * buildDirection.x +
        td.normal.y * buildDirection.y +
        td.normal.z * buildDirection.z;
      const overhangAngle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);

      // Only flag as overhang if:
      // 1. Face is significantly above the bed (y > 2mm to avoid bed-touching faces)
      // 2. Normal points downward (z < -0.3 to exclude side walls)
      // 3. Overhang angle exceeds threshold
      const isAboveBed = td.centroid.y > 2; // More than 2mm above bed
      const isDownwardFacing = td.normal.z < -0.3; // Points downward, not horizontal
      const needsSupport = overhangAngle > supportAngleThreshold && isAboveBed && isDownwardFacing;

      return {
        ...td,
        overhangAngle,
        needsSupport,
      };
    })
    .filter((oh) => oh.needsSupport);

  // Calculate support metrics
  const supportArea = overhangs.reduce((sum, oh) => sum + oh.area, 0);
  const totalArea = triangleData.reduce((sum, t) => sum + t.area, 0);
  const supportPercentage = totalArea > 0 ? (supportArea / totalArea) * 100 : 0;

  // Estimate support volume
  const avgHeight =
    overhangs.length > 0
      ? overhangs.reduce((sum, oh) => sum + Math.tan((oh.overhangAngle * Math.PI) / 180) * 5, 0) /
        overhangs.length
      : 0;
  const supportDensityFactor = 0.2;
  // Fix: Use reasonable height estimation and proper unit conversion
  const reasonableHeight = Math.min(avgHeight, 10); // Cap at 10mm max height
  const supportVolumeMm3 = supportArea * reasonableHeight * supportDensityFactor;
  const supportVolumeCm3 = supportVolumeMm3 / 1000;

  // Determine difficulty based on support percentage and volume
  let difficulty: 'very_low' | 'low' | 'medium' | 'high' | 'extreme' = 'very_low';
  if (overhangs.length > 0) {
    const avgAngle = overhangs.reduce((sum, oh) => sum + oh.overhangAngle, 0) / overhangs.length;
    if (supportPercentage < 5 && avgAngle < 65) difficulty = 'low';
    else if (supportPercentage < 15 && avgAngle < 70) difficulty = 'medium';
    else if (supportPercentage < 30 && avgAngle < 75) difficulty = 'high';
    else difficulty = 'extreme';
  }

  return {
    supportRequired: overhangs.length > 0,
    supportPercentage,
    supportAreaMm2: supportArea,
    supportVolumeCm3,
    supportWeightGrams: supportVolumeCm3 * 1.24, // PLA density
    supportTimeMinutes: supportVolumeCm3 * 0.5, // Simplified
    supportCost: ((supportVolumeCm3 * 1.24) / 1000) * 20 + supportVolumeCm3 * 0.5 * 0.1,
    difficulty,
    confidenceScore: 0.7, // Base confidence for geometric estimation
  };
}

export function ModelAnalysisPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>(() => {
    // Restore file name from sessionStorage
    const saved = sessionStorage.getItem('uploadedFileName');
    return saved || '';
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => {
    // Restore analysis result from sessionStorage
    const saved = sessionStorage.getItem('analysisResult');
    return saved ? JSON.parse(saved) : null;
  });
  const [triangles, setTriangles] = useState<Triangle[]>(() => {
    // Restore triangles from sessionStorage
    const saved = sessionStorage.getItem('triangles');
    return saved ? JSON.parse(saved) : [];
  });
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(() => {
    // Restore AI analysis result from sessionStorage
    const saved = sessionStorage.getItem('aiAnalysisResult');
    return saved ? JSON.parse(saved) : null;
  });
  const [orientation, setOrientation] = useState(() => {
    // Restore orientation from sessionStorage
    const saved = sessionStorage.getItem('orientation');
    return saved ? JSON.parse(saved) : { x: 0, y: 0, z: 0 };
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state to sessionStorage whenever it changes (skip File object as it can't be serialized)
  useEffect(() => {
    if (uploadedFileName) {
      sessionStorage.setItem('uploadedFileName', uploadedFileName);
    } else {
      sessionStorage.removeItem('uploadedFileName');
    }
  }, [uploadedFileName]);

  useEffect(() => {
    if (analysisResult) {
      sessionStorage.setItem('analysisResult', JSON.stringify(analysisResult));
    } else {
      sessionStorage.removeItem('analysisResult');
    }
  }, [analysisResult]);

  useEffect(() => {
    if (triangles.length > 0) {
      sessionStorage.setItem('triangles', JSON.stringify(triangles));
    } else {
      sessionStorage.removeItem('triangles');
    }
  }, [triangles]);

  useEffect(() => {
    if (aiAnalysisResult) {
      sessionStorage.setItem('aiAnalysisResult', JSON.stringify(aiAnalysisResult));
    } else {
      sessionStorage.removeItem('aiAnalysisResult');
    }
  }, [aiAnalysisResult]);

  useEffect(() => {
    sessionStorage.setItem('orientation', JSON.stringify(orientation));
  }, [orientation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file && (file.name.endsWith('.stl') || file.name.endsWith('.STL'))) {
        setUploadedFile(file);
        setUploadedFileName(file.name);
        analyzeModel(file);
      } else {
        alert('Please upload an STL file');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        setUploadedFile(file);
        setUploadedFileName(file.name);
        analyzeModel(file);
      }
    }
  }, []);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const analyzeModel = async (file: File) => {
    setIsAnalyzing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedTriangles = parseSTL(arrayBuffer);

      if (parsedTriangles.length === 0) {
        throw new Error('No triangles found in STL file');
      }

      setTriangles(parsedTriangles);

      // Use client-side analysis only (backend is not working)
      const boundingBox = calculateBoundingBox(parsedTriangles);
      const volumeMM3 = calculateVolume(parsedTriangles);
      const surfaceAreaMM2 = calculateSurfaceArea(parsedTriangles);
      const volumeCM3 = volumeMM3 / 1000;

      const dimensions = {
        x: Math.round((boundingBox.max.x - boundingBox.min.x) * 10) / 10,
        y: Math.round((boundingBox.max.y - boundingBox.min.y) * 10) / 10,
        z: Math.round((boundingBox.max.z - boundingBox.min.z) * 10) / 10,
      };

      const printabilityScore = calculatePrintabilityScore(parsedTriangles, dimensions);
      const infillVolume = calculateInfillVolume(volumeCM3);
      const supportVolume = calculateSupportVolume(parsedTriangles, dimensions);
      const optimalOrientation = calculateOptimalOrientation(parsedTriangles, dimensions);
      const estimatedTimeMinutes = calculatePrintTime(volumeCM3, dimensions, surfaceAreaMM2);
      const totalMaterial = calculateTotalMaterial(volumeCM3, infillVolume, supportVolume);
      const weight = totalMaterial * 1.24;
      const materialRequired = totalMaterial;

      setAiAnalysisResult({
        geometry: {
          volumeMm3: volumeMM3,
          surfaceAreaMm2: surfaceAreaMM2,
          boundingBox: { x: dimensions.x, y: dimensions.y, z: dimensions.z },
          triangleCount: parsedTriangles.length,
          dimensions: { width: dimensions.x, height: dimensions.y, depth: dimensions.z },
        },
        orientation: {
          recommended: {
            x: optimalOrientation.axis === 'X' ? optimalOrientation.angle : 0,
            y: optimalOrientation.axis === 'Y' ? optimalOrientation.angle : 0,
            z: optimalOrientation.axis === 'Z' ? optimalOrientation.angle : 0,
          },
          score: 0.8,
          explanation: 'Client-side analysis based on bounding box',
        },
        support: {
          supportVolumeCm3: supportVolume,
          supportPercentage: (supportVolume / volumeCM3) * 100,
          supportDifficulty: 'low',
          overhangAreaMm2: 0,
          recommendations: ['Client-side analysis'],
        },
        estimation: {
          material: {
            totalMaterialVolumeCm3: totalMaterial,
            estimatedWeightGrams: weight,
          },
          time: {
            layers: Math.ceil(dimensions.y / 0.2),
            totalTimeMinutes: estimatedTimeMinutes,
          },
          difficultyScore: 0.5,
          riskPercentage: 10,
          riskFactors: [],
        },
        printabilityScore,
      });

      // Set orientation from optimal orientation (convert axis/angle to XYZ rotations)
      let rotationX = 0,
        rotationY = 0,
        rotationZ = 0;
      if (optimalOrientation.axis === 'X') {
        rotationX = optimalOrientation.angle;
      } else if (optimalOrientation.axis === 'Y') {
        rotationY = optimalOrientation.angle;
      } else if (optimalOrientation.axis === 'Z') {
        rotationZ = optimalOrientation.angle;
      }
      setOrientation({ x: rotationX, y: rotationY, z: rotationZ });

      // Run support analysis with the calculated orientation
      const supportAnalysis = analyzeSupport(parsedTriangles, {
        x: rotationX,
        y: rotationY,
        z: rotationZ,
      });

      // Calculate orientation score based on support requirements
      // Lower support percentage = higher score
      let orientationScore = 100;
      if (supportAnalysis.supportPercentage > 0) {
        orientationScore = Math.max(0, 100 - supportAnalysis.supportPercentage * 2);
      }
      // Cap at 95 if there's any support needed, 100 if no support
      orientationScore = supportAnalysis.supportRequired ? Math.min(95, orientationScore) : 100;

      // Set AI analysis result with support data
      setAiAnalysisResult({
        geometry: {
          volumeMm3: volumeCM3 * 1000,
          surfaceAreaMm2: surfaceAreaMM2,
          boundingBox: { x: dimensions.x, y: dimensions.y, z: dimensions.z },
          triangleCount: parsedTriangles.length,
          dimensions: { width: dimensions.x, height: dimensions.y, depth: dimensions.z },
        },
        orientation: {
          recommended: { x: rotationX, y: rotationY, z: rotationZ },
          score: orientationScore,
          explanation: 'Optimal orientation based on largest flat surface',
        },
        support: {
          supportVolumeCm3: supportAnalysis.supportVolumeCm3,
          supportPercentage: supportAnalysis.supportPercentage,
          supportDifficulty: supportAnalysis.difficulty,
          overhangAreaMm2: supportAnalysis.supportAreaMm2,
          recommendations: supportAnalysis.supportRequired
            ? ['Support required for overhangs', 'Consider adjusting orientation to reduce support']
            : ['No support required', 'Model is self-supporting'],
        },
        estimation: {
          material: {
            totalMaterialVolumeCm3: totalMaterial,
            estimatedWeightGrams: weight,
          },
          time: {
            layers: Math.ceil(dimensions.y / 0.2),
            totalTimeMinutes: estimatedTimeMinutes,
          },
          difficultyScore: 0.5,
          riskPercentage: 10,
          riskFactors: [],
        },
        printabilityScore,
      });

      // Calculate estimated price range using pricing rules
      const plaCost = parseFloat(localStorage.getItem('plaCost') || '2.5');
      const fdmRate = parseFloat(localStorage.getItem('fdmRate') || '25');
      const electricityRate = parseFloat(localStorage.getItem('electricityRate') || '25');
      const maintenanceRate = parseFloat(localStorage.getItem('maintenanceRate') || '50');
      const postProcessingRate = parseFloat(localStorage.getItem('postProcessingRate') || '500');
      const taxRate = parseFloat(localStorage.getItem('taxRate') || '14');
      const minimumOrder = parseFloat(localStorage.getItem('minimumOrder') || '500');

      const materialCost = weight * plaCost;
      const printTimeHours = estimatedTimeMinutes / 60;
      const machineTimeCost = printTimeHours * fdmRate;
      const electricityCost = printTimeHours * electricityRate;
      const maintenanceCost = printTimeHours * maintenanceRate;
      const postProcessingCost = postProcessingRate;

      const baseCost =
        materialCost + machineTimeCost + electricityCost + maintenanceCost + postProcessingCost;

      // Calculate price range with different margins (10% - 30%)
      const minMargin = baseCost * 0.1;
      const maxMargin = baseCost * 0.3;

      const minSubtotal = Math.max(minimumOrder, baseCost + minMargin);
      const maxSubtotal = Math.max(minimumOrder, baseCost + maxMargin);

      const minTax = minSubtotal * (taxRate / 100);
      const maxTax = maxSubtotal * (taxRate / 100);

      const minPrice = Math.round(minSubtotal + minTax);
      const maxPrice = Math.round(maxSubtotal + maxTax);

      // Set basic analysis from client-side results
      setAnalysisResult({
        volume: Math.round(volumeCM3 * 10) / 10,
        dimensions,
        weight: Math.round(weight * 10) / 10,
        printabilityScore,
        estimatedTime: estimatedTimeMinutes,
        materialRequired: Math.round(materialRequired * 10) / 10,
        surfaceArea: Math.round(surfaceAreaMM2),
        triangleCount: parsedTriangles.length,
        infillVolume: Math.round(infillVolume * 10) / 10,
        supportVolume: Math.round(supportVolume * 10) / 10,
        totalMaterial: Math.round(totalMaterial * 10) / 10,
        optimalOrientation,
        estimatedPriceRange: { min: minPrice, max: maxPrice },
      });
    } catch (error) {
      console.error('Error analyzing STL file:', error);
      alert(
        `Error analyzing STL file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFileName('');
    setAnalysisResult(null);
    setTriangles([]);
    setAiAnalysisResult(null);
    setOrientation({ x: 0, y: 0, z: 0 });
    // Clear sessionStorage
    sessionStorage.removeItem('uploadedFileName');
    sessionStorage.removeItem('analysisResult');
    sessionStorage.removeItem('triangles');
    sessionStorage.removeItem('aiAnalysisResult');
    sessionStorage.removeItem('orientation');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Model Analysis</h1>
        <p className="text-muted-foreground">Upload and analyze your 3D models with AI</p>
      </div>

      {!uploadedFile && !analysisResult && triangles.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed bg-card p-12 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`rounded-full p-4 ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
              <Upload
                className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Upload STL file</p>
              <p className="text-sm text-muted-foreground">Drag and drop or click to browse</p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.STL"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={handleButtonClick}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Select File
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <File className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {uploadedFileName || 'Uploaded Model'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadedFile
                    ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`
                    : 'Restored from session'}
                </p>
              </div>
            </div>
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Analyzing...
              </div>
            ) : analysisResult ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Analysis Complete
              </div>
            ) : (
              <button
                onClick={handleRemoveFile}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {analysisResult && (
            <div className="space-y-6">
              {triangles.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">3D Preview</h3>
                  <ModelViewer
                    triangles={triangles}
                    dimensions={analysisResult.dimensions}
                    orientation={orientation}
                    overlayType="none"
                  />
                </div>
              )}

              {aiAnalysisResult && (
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">AI Print Analysis</h3>
                  <AIAnalysisPanel
                    printabilityScore={aiAnalysisResult.printabilityScore}
                    recommendedOrientation={aiAnalysisResult.orientation.recommended}
                    orientationScore={aiAnalysisResult.orientation.score}
                    materialWeight={aiAnalysisResult.estimation.material.estimatedWeightGrams}
                    estimatedTime={aiAnalysisResult.estimation.time.totalTimeMinutes}
                    riskAnalysis={{
                      riskPercentage: aiAnalysisResult.estimation.riskPercentage,
                      riskFactors: aiAnalysisResult.estimation.riskFactors.map((f) => ({
                        factor: f,
                        severity: 'low',
                        description: f,
                      })),
                    }}
                    recommendations={aiAnalysisResult.support.recommendations}
                    isAnalyzing={false}
                  />
                </div>
              )}

              {analysisResult && analysisResult.estimatedPriceRange && (
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Estimated Price Range
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Based on model analysis</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Final price may vary based on material and settings
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        {analysisResult.estimatedPriceRange.min} -{' '}
                        {analysisResult.estimatedPriceRange.max} EGP
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {analysisResult && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleRemoveFile}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Upload New Model
              </button>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Generate Quote
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
