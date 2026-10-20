import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ObjectStoragePort, ObjectStorageSignedUpload } from './types';

export type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
};

export class SupabaseObjectStorage implements ObjectStoragePort {
  private readonly client: SupabaseClient;

  constructor(config: SupabaseStorageConfig) {
    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createSignedUpload(input: {
    bucket: string;
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<ObjectStorageSignedUpload> {
    const expiresInSeconds = input.expiresInSeconds ?? 600;
    const { data, error } = await this.client.storage
      .from(input.bucket)
      .createSignedUploadUrl(input.key);

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create signed upload URL');
    }

    return {
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      expiresInSeconds,
      headers: {
        'Content-Type': input.contentType,
      },
    };
  }

  async createSignedDownloadUrl(input: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }): Promise<string> {
    const { data, error } = await this.client.storage
      .from(input.bucket)
      .createSignedUrl(input.key, input.expiresInSeconds);

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create signed download URL');
    }

    return data.signedUrl;
  }

  async objectExists(input: { bucket: string; key: string }): Promise<boolean> {
    const slash = input.key.lastIndexOf('/');
    const folder = slash >= 0 ? input.key.slice(0, slash) : '';
    const fileName = slash >= 0 ? input.key.slice(slash + 1) : input.key;

    const { data, error } = await this.client.storage.from(input.bucket).list(folder, {
      search: fileName,
      limit: 100,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).some((item) => item.name === fileName);
  }

  async removeObject(input: { bucket: string; key: string }): Promise<void> {
    const { error } = await this.client.storage.from(input.bucket).remove([input.key]);
    if (error) {
      throw new Error(error.message);
    }
  }
}
