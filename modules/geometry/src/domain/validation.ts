const STL_EXTENSION = /\.stl$/i;

const ALLOWED_CONTENT_TYPES = new Set([
  'model/stl',
  'application/sla',
  'application/vnd.ms-pki.stl',
  'application/octet-stream',
]);

export class GeometryDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'GeometryDomainError';
  }
}

export function assertStlUpload(input: {
  originalFilename: string;
  byteSize: number;
  maxBytes: number;
  contentType?: string;
}): { safeFilename: string; contentType: string } {
  const trimmed = input.originalFilename.trim();
  if (!trimmed) {
    throw new GeometryDomainError('Filename is required', 'models.invalid_filename', 400);
  }

  const baseName = trimmed.replace(/^.*[\\/]/, '');
  if (!STL_EXTENSION.test(baseName)) {
    throw new GeometryDomainError('Only .stl files are supported', 'models.invalid_extension', 400);
  }

  if (baseName.includes('..')) {
    throw new GeometryDomainError('Invalid filename', 'models.invalid_filename', 400);
  }

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new GeometryDomainError('File size must be positive', 'models.invalid_size', 400);
  }

  if (input.byteSize > input.maxBytes) {
    throw new GeometryDomainError(
      `File exceeds maximum size of ${input.maxBytes} bytes`,
      'models.file_too_large',
      400,
    );
  }

  const contentType = (input.contentType ?? 'model/stl').toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new GeometryDomainError(
      'Unsupported content type for STL',
      'models.invalid_content_type',
      400,
    );
  }

  return { safeFilename: baseName, contentType };
}

export function buildStorageKey(tenantId: string, modelId: string): string {
  return `tenants/${tenantId}/models/${modelId}.stl`;
}
