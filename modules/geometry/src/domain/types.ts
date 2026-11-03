export const MODEL_FILE_STATUSES = ['pending_upload', 'uploaded', 'failed', 'deleted'] as const;

export type ModelFileStatus = (typeof MODEL_FILE_STATUSES)[number];

export type ModelFile = {
  id: string;
  tenantId: string;
  /** Null for a model uploaded by an anonymous embed visitor. */
  uploadedByUserId: string | null;
  embedSessionId: string | null;
  shopId: string | null;
  originalFilename: string;
  byteSize: number;
  contentType: string;
  storageBucket: string;
  storageKey: string;
  checksumSha256: string | null;
  status: ModelFileStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateModelUploadInput = {
  tenantId: string;
  /** Exactly one of userId / embedSessionId owns the upload. */
  userId: string | null;
  embedSessionId?: string;
  shopId?: string;
  originalFilename: string;
  byteSize: number;
  contentType?: string;
};
