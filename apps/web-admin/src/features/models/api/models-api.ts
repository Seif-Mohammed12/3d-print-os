import axios from 'axios';

import { http } from '../../../shared/api/http';

export type ModelFile = {
  id: string;
  filename: string;
  byte_size: number;
  status: 'pending_upload' | 'uploaded' | 'failed' | 'deleted';
  upload_date: string;
};

type StartUploadResponse = {
  model: ModelFile;
  upload: { method: 'PUT'; url: string; headers: Record<string, string>; expires_in: number };
};

async function sha256Hex(file: File): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) {
    return undefined;
  }
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const modelsApi = {
  /** Reserve a model, upload the file straight to storage, then mark it uploaded. */
  async upload(file: File, shopId: string | undefined, onProgress?: (fraction: number) => void) {
    const started = await http.post<StartUploadResponse>('/models/uploads', {
      filename: file.name,
      byteSize: file.size,
      contentType: 'model/stl',
      ...(shopId ? { shopId } : {}),
    });

    await axios.put(started.upload.url, file, {
      headers: started.upload.headers,
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(event.loaded / event.total);
        }
      },
    });

    const checksumSha256 = await sha256Hex(file);
    return http.post<ModelFile>(`/models/${started.model.id}/complete`, {
      ...(checksumSha256 ? { checksumSha256 } : {}),
    });
  },
};
