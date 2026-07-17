export type ObjectStorageSignedUpload = {
  uploadUrl: string;
  token?: string;
  path: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
};

export type ObjectStoragePort = {
  createSignedUpload: (input: {
    bucket: string;
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }) => Promise<ObjectStorageSignedUpload>;
  objectExists: (input: { bucket: string; key: string }) => Promise<boolean>;
  removeObject: (input: { bucket: string; key: string }) => Promise<void>;
};

export const STORAGE_PACKAGE = '@3d-print-os/storage' as const;
