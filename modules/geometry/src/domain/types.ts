export const MODEL_FILE_STATUSES = ['pending_upload', 'uploaded', 'failed', 'deleted'] as const;

export type ModelFileStatus = (typeof MODEL_FILE_STATUSES)[number];

export type ModelFile = {
  id: string;
  tenantId: string;
  uploadedByUserId: string;
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
  userId: string;
  shopId?: string;
  originalFilename: string;
  byteSize: number;
  contentType?: string;
};
