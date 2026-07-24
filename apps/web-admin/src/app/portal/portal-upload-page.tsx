import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  FileText,
  Package,
  CheckCircle,
  AlertCircle,
  X,
  Send,
  Clock,
  Printer,
} from 'lucide-react';
import { apiClient } from '../../shared/api/api-client';
import { ModelViewer } from '../../shared/components/model-viewer';

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface QuoteAnalysis {
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
    supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
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
  };
  printabilityScore: number;
  estimatedPriceRange?: { min: number; max: number };
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
      score -= 1;
    }
  }

  const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z);
  const minDim = Math.min(dimensions.x, dimensions.y, dimensions.z);
  const aspectRatio = maxDim / minDim;

  if (aspectRatio > 20) {
    score -= 2;
  }

  if (minDim < 0.2) {
    score -= 1;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateInfillVolume(volume: number, infillPercentage: number = 15): number {
  const shellVolume = volume * 0.25;
  const innerVolume = volume - shellVolume;
  return Math.max(0, innerVolume * (infillPercentage / 100));
}

function calculateTotalMaterial(
  volume: number,
  infillVolume: number,
  supportVolume: number,
): number {
  // STL volume represents the actual solid volume of the model
  // For prints with infill, we need to account for the infill material
  // The shell is solid, the interior uses infill percentage
  const shellVolume = volume * 0.25; // Shell is ~25% of volume
  const innerVolume = volume - shellVolume;

  // Total material = shell (solid) + inner (infill) + support + waste
  const wasteBuffer = volume * 0.05;
  return shellVolume + infillVolume + supportVolume + wasteBuffer;
}

function calculateSupportVolume(
  triangles: Triangle[],
  dimensions: { x: number; y: number; z: number },
): number {
  let overhangArea = 0;

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

    if (normal.z < -0.707 && normalLength > 0) {
      const triangleArea = normalLength / 2;
      overhangArea += triangleArea;
    }
  }

  const supportHeight = dimensions.z * 0.2;
  const supportVolumeMM3 = overhangArea * supportHeight * 0.05;
  return supportVolumeMM3 / 1000;
}

function calculateOptimalOrientation(
  triangles: Triangle[],
  _dimensions: { x: number; y: number; z: number },
): { axis: string; angle: number } {
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

    const area = normalLength / 2;
    const upwardScore = normal.y * area;
    if (upwardScore > maxScore) {
      maxScore = upwardScore;
      bestNormal = normal;
    }
  }

  const targetNormal = { x: 0, y: 0, z: -1 };

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

  if (crossLength < 0.001) {
    return { axis: 'X', angle: 0 };
  }

  const rotationAxis = {
    x: crossProduct.x / crossLength,
    y: crossProduct.y / crossLength,
    z: crossProduct.z / crossLength,
  };

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
  dimensions: { x: number; y: number; z: number },
  _surfaceArea: number,
  layerHeightMm: number = 0.2,
  infillPercentage: number = 20,
): number {
  const nozzleWidthMm = 0.4 * 1.2;
  const printSpeedMmPerS = 45; // More realistic average speed
  const volumetricFlowRateMm3PerS = printSpeedMmPerS * layerHeightMm * nozzleWidthMm;

  // More realistic calculation based on actual printing
  // Shell is always printed solid (25% of volume)
  // Infill affects the remaining volume
  const shellVolume = volume * 1000 * 0.25;
  const innerVolume = volume * 1000 * 0.75;
  const infillVolume = innerVolume * (infillPercentage / 100);

  // Total material to extrude
  const totalMaterialMm3 = shellVolume + infillVolume;

  // Base print time for extrusion
  const extrusionTimeSeconds = totalMaterialMm3 / volumetricFlowRateMm3PerS;

  // Travel time (movement between points) - more conservative
  const travelTimeSeconds = extrusionTimeSeconds * 0.35;

  // Layer changes take time
  const layers = Math.ceil(dimensions.y / layerHeightMm);
  const layerChangeTime = layers * 3; // 3 seconds per layer change

  // Acceleration/deceleration overhead
  const accelerationOverhead = (extrusionTimeSeconds + travelTimeSeconds) * 0.15;

  // Setup and cleanup time
  const setupTime = 300; // 5 minutes for bed heating, priming, etc.

  // Total time
  const totalTimeSeconds =
    extrusionTimeSeconds + travelTimeSeconds + layerChangeTime + accelerationOverhead + setupTime;

  return Math.round(totalTimeSeconds / 60);
}

function getLayerHeight(quality: 'draft' | 'standard' | 'high'): number {
  switch (quality) {
    case 'draft':
      return 0.3;
    case 'standard':
      return 0.2;
    case 'high':
      return 0.1;
    default:
      return 0.2;
  }
}

function getInfillPercentage(infill: 'draft' | 'standard' | 'strong'): number {
  switch (infill) {
    case 'draft':
      return 10;
    case 'standard':
      return 20;
    case 'strong':
      return 40;
    default:
      return 20;
  }
}

function analyzeSupport(triangles: Triangle[], orientation: { x: number; y: number; z: number }) {
  const supportAngleThreshold = 50;
  const buildDirection = { x: 0, y: 0, z: -1 };

  const triangleData = triangles.map((tri, index) => {
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

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

    const radX = (orientation.x * Math.PI) / 180;
    const radY = (orientation.y * Math.PI) / 180;
    const radZ = (orientation.z * Math.PI) / 180;

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

    const area = normalLength / 2;

    const centroid = {
      x: (v1.x + v2.x + v3.x) / 3,
      y: (v1.y + v2.y + v3.y) / 3,
      z: (v1.z + v2.z + v3.z) / 3,
    };

    return { index, normal: rotatedNormal, area, centroid };
  });

  const overhangs = triangleData
    .map((td) => {
      const dotProduct =
        td.normal.x * buildDirection.x +
        td.normal.y * buildDirection.y +
        td.normal.z * buildDirection.z;
      const overhangAngle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);

      const isAboveBed = td.centroid.y > 2;
      const isDownwardFacing = td.normal.z < -0.3;
      const needsSupport = overhangAngle > supportAngleThreshold && isAboveBed && isDownwardFacing;

      return {
        ...td,
        overhangAngle,
        needsSupport,
      };
    })
    .filter((oh) => oh.needsSupport);

  const supportArea = overhangs.reduce((sum, oh) => sum + oh.area, 0);
  const totalArea = triangleData.reduce((sum, t) => sum + t.area, 0);
  const supportPercentage = totalArea > 0 ? (supportArea / totalArea) * 100 : 0;

  const avgHeight =
    overhangs.length > 0
      ? overhangs.reduce((sum, oh) => sum + Math.tan((oh.overhangAngle * Math.PI) / 180) * 5, 0) /
        overhangs.length
      : 0;
  const supportDensityFactor = 0.2;
  const reasonableHeight = Math.min(avgHeight, 10);
  const supportVolumeMm3 = supportArea * reasonableHeight * supportDensityFactor;
  const supportVolumeCm3 = supportVolumeMm3 / 1000;

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
    supportWeightGrams: supportVolumeCm3 * 1.24,
    supportTimeMinutes: supportVolumeCm3 * 0.5,
    supportCost: ((supportVolumeCm3 * 1.24) / 1000) * 20 + supportVolumeCm3 * 0.5 * 0.1,
    difficulty,
    confidenceScore: 0.7,
  };
}

export function PortalUploadPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<QuoteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [triangles, setTriangles] = useState<Triangle[]>([]);
  const [orientation, setOrientation] = useState({ x: 0, y: 0, z: 0 });
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high'>('standard');
  const [infill, setInfill] = useState<'draft' | 'standard' | 'strong'>('standard');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recalculate analysis when quality or infill changes
  useEffect(() => {
    if (uploadedFile && triangles.length > 0) {
      // Only recalculate analysis data, don't re-parse the file
      const boundingBox = calculateBoundingBox(triangles);
      const volumeMM3 = calculateVolume(triangles);
      const surfaceAreaMM2 = calculateSurfaceArea(triangles);
      const volumeCM3 = volumeMM3 / 1000;

      const dimensions = {
        x: Math.round((boundingBox.max.x - boundingBox.min.x) * 10) / 10,
        y: Math.round((boundingBox.max.y - boundingBox.min.y) * 10) / 10,
        z: Math.round((boundingBox.max.z - boundingBox.min.z) * 10) / 10,
      };

      const printabilityScore = calculatePrintabilityScore(triangles, dimensions);

      const layerHeightMm = getLayerHeight(quality);
      const infillPercentage = getInfillPercentage(infill);

      const infillVolume = calculateInfillVolume(volumeCM3, infillPercentage);
      const supportVolume = calculateSupportVolume(triangles, dimensions);
      const optimalOrientation = calculateOptimalOrientation(triangles, dimensions);
      const estimatedTimeMinutes = calculatePrintTime(
        volumeCM3,
        dimensions,
        surfaceAreaMM2,
        layerHeightMm,
        infillPercentage,
      );
      const totalMaterial = calculateTotalMaterial(volumeCM3, infillVolume, supportVolume);
      const weight = totalMaterial * 1.24;

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

      const supportAnalysis = analyzeSupport(triangles, {
        x: rotationX,
        y: rotationY,
        z: rotationZ,
      });

      let orientationScore = 100;
      if (supportAnalysis.supportPercentage > 0) {
        orientationScore = Math.max(0, 100 - supportAnalysis.supportPercentage * 2);
      }
      orientationScore = supportAnalysis.supportRequired ? Math.min(95, orientationScore) : 100;

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

      const minMargin = baseCost * 0.1;
      const maxMargin = baseCost * 0.3;

      const minSubtotal = Math.max(minimumOrder, baseCost + minMargin);
      const maxSubtotal = Math.max(minimumOrder, baseCost + maxMargin);

      const minTax = minSubtotal * (taxRate / 100);
      const maxTax = maxSubtotal * (taxRate / 100);

      const minPrice = Math.round(minSubtotal + minTax);
      const maxPrice = Math.round(maxSubtotal + maxTax);

      setAnalysis({
        geometry: {
          volumeMm3: volumeCM3 * 1000,
          surfaceAreaMm2: surfaceAreaMM2,
          boundingBox: { x: dimensions.x, y: dimensions.y, z: dimensions.z },
          triangleCount: triangles.length,
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
          supportDifficulty:
            supportAnalysis.difficulty === 'very_low'
              ? 'low'
              : supportAnalysis.difficulty === 'extreme'
                ? 'high'
                : supportAnalysis.difficulty,
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
            layers: Math.ceil(dimensions.y / layerHeightMm),
            totalTimeMinutes: estimatedTimeMinutes,
          },
          difficultyScore: 0.5,
          riskPercentage: 10,
        },
        printabilityScore,
        estimatedPriceRange: { min: minPrice, max: maxPrice },
      });
    }
  }, [quality, infill, triangles]);

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

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFileName('');
    setAnalysis(null);
    setError(null);
    setQuoteSubmitted(false);
    setTriangles([]);
    setOrientation({ x: 0, y: 0, z: 0 });
    setQuality('standard');
    setInfill('standard');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeModel = async (file: File) => {
    setAnalyzing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedTriangles = parseSTL(arrayBuffer);

      if (parsedTriangles.length === 0) {
        throw new Error('No triangles found in STL file');
      }

      setTriangles(parsedTriangles);

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

      // Use current quality and infill settings
      const layerHeightMm = getLayerHeight(quality);
      const infillPercentage = getInfillPercentage(infill);

      const infillVolume = calculateInfillVolume(volumeCM3, infillPercentage);
      const supportVolume = calculateSupportVolume(parsedTriangles, dimensions);
      const optimalOrientation = calculateOptimalOrientation(parsedTriangles, dimensions);
      const estimatedTimeMinutes = calculatePrintTime(
        volumeCM3,
        dimensions,
        surfaceAreaMM2,
        layerHeightMm,
        infillPercentage,
      );
      const totalMaterial = calculateTotalMaterial(volumeCM3, infillVolume, supportVolume);
      const weight = totalMaterial * 1.24;

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

      const supportAnalysis = analyzeSupport(parsedTriangles, {
        x: rotationX,
        y: rotationY,
        z: rotationZ,
      });

      let orientationScore = 100;
      if (supportAnalysis.supportPercentage > 0) {
        orientationScore = Math.max(0, 100 - supportAnalysis.supportPercentage * 2);
      }
      orientationScore = supportAnalysis.supportRequired ? Math.min(95, orientationScore) : 100;

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

      const minMargin = baseCost * 0.1;
      const maxMargin = baseCost * 0.3;

      const minSubtotal = Math.max(minimumOrder, baseCost + minMargin);
      const maxSubtotal = Math.max(minimumOrder, baseCost + maxMargin);

      const minTax = minSubtotal * (taxRate / 100);
      const maxTax = maxSubtotal * (taxRate / 100);

      const minPrice = Math.round(minSubtotal + minTax);
      const maxPrice = Math.round(maxSubtotal + maxTax);

      setAnalysis({
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
          supportDifficulty:
            supportAnalysis.difficulty === 'very_low'
              ? 'low'
              : supportAnalysis.difficulty === 'extreme'
                ? 'high'
                : supportAnalysis.difficulty,
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
        },
        printabilityScore,
        estimatedPriceRange: { min: minPrice, max: maxPrice },
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Failed to analyze file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitQuoteRequest = async () => {
    if (!uploadedFile || !analysis) {
      setError('Please analyze the file first');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('fileName', uploadedFileName);
      formData.append('notes', notes);
      formData.append('volume', analysis.geometry.volumeMm3.toString());
      formData.append(
        'estimatedWeight',
        analysis.estimation.material.estimatedWeightGrams.toString(),
      );
      formData.append('estimatedTime', analysis.estimation.time.totalTimeMinutes.toString());
      formData.append('quality', quality);
      formData.append('infill', infill);
      formData.append('estimatedPriceMin', analysis.estimatedPriceRange?.min.toString() || '0');
      formData.append('estimatedPriceMax', analysis.estimatedPriceRange?.max.toString() || '0');
      formData.append('printabilityScore', analysis.printabilityScore.toString());

      await apiClient.instance.post('/portal/quotes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setQuoteSubmitted(true);
      setUploadedFile(null);
      setUploadedFileName('');
      setAnalysis(null);
      setNotes('');
      setTriangles([]);
      setOrientation({ x: 0, y: 0, z: 0 });
      setQuality('standard');
      setInfill('standard');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit quote request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Get a Quote</h1>
        <p className="text-muted-foreground">
          Upload your 3D model to get an instant price estimate
        </p>
      </div>

      {quoteSubmitted ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Quote Request Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Our team will review your model and send you a detailed quote within 24 hours.
          </p>
          <button
            onClick={() => setQuoteSubmitted(false)}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Submit Another Quote
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Upload Model</h3>

              {!uploadedFile ? (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-base font-medium text-foreground mb-1">Upload STL file</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to browse or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">Maximum file size: 50MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.STL"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{uploadedFileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button onClick={handleRemoveFile} className="p-2 hover:bg-accent rounded-md">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Print Settings */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Print Settings</h3>

              <div className="space-y-4">
                {/* Quality Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Quality</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setQuality('draft')}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        quality === 'draft'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => setQuality('standard')}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        quality === 'standard'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setQuality('high')}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        quality === 'high'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      High
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {quality === 'draft' && '0.3mm layer height - Faster, less detail'}
                    {quality === 'standard' && '0.2mm layer height - Balanced quality and speed'}
                    {quality === 'high' && '0.1mm layer height - Best detail, slower'}
                  </p>
                </div>

                {/* Infill Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Infill</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setInfill('draft')}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        infill === 'draft'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => setInfill('standard')}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        infill === 'standard'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setInfill('strong')}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        infill === 'strong'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      Strong
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {infill === 'draft' && '10% infill - Lightweight, less material'}
                    {infill === 'standard' && '20% infill - Standard strength'}
                    {infill === 'strong' && '40% infill - Maximum strength, more material'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
                placeholder="Add any special requirements or notes for your quote..."
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>

          {analysis && (
            <div className="space-y-6">
              {/* 3D Model Viewer */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-foreground">3D Model Preview</h3>
                </div>
                <ModelViewer
                  triangles={triangles}
                  dimensions={{
                    x: analysis.geometry.dimensions.width,
                    y: analysis.geometry.dimensions.height,
                    z: analysis.geometry.dimensions.depth,
                  }}
                  orientation={orientation}
                  className="w-full"
                  overlayType="none"
                  key="model-viewer"
                />
              </div>

              {/* Analysis Results */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-foreground">Analysis Results</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Volume</p>
                      <p className="text-lg font-bold text-foreground">
                        {(analysis.geometry.volumeMm3 / 1000).toFixed(1)} cm³
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Weight</p>
                      <p className="text-lg font-bold text-foreground">
                        {analysis.estimation.material.estimatedWeightGrams.toFixed(0)} g
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Print Time</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.round(analysis.estimation.time.totalTimeMinutes)} min
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Printability</p>
                      <p className="text-lg font-bold text-foreground">
                        {analysis.printabilityScore}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Material</span>
                      </div>
                      <span className="text-sm font-medium">PLA (Standard)</span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Difficulty</span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          analysis.support.supportDifficulty === 'low'
                            ? 'text-green-600'
                            : analysis.support.supportDifficulty === 'medium'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {analysis.support.supportDifficulty}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Support Needed</span>
                      </div>
                      <span className="text-sm font-medium">
                        {analysis.support.supportPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Estimated Price Range</span>
                      <span className="text-2xl font-bold text-foreground">
                        {analysis.estimatedPriceRange?.min} - {analysis.estimatedPriceRange?.max}{' '}
                        EGP
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Final price may vary based on material choice and print settings
                    </p>
                  </div>

                  <button
                    onClick={submitQuoteRequest}
                    disabled={submitting}
                    className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Submitting...' : 'Submit Quote Request'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
