import { ApiError } from '../shared/api/api-error-handler';
import type { PortalMaterial, PortalQuote, PrintQuality } from '../features/portal/api/portal-api';

/**
 * The website quoter's API client. It never sends a staff token: the shop is named by its
 * publishable key and every later call carries the visitor session from `startSession`.
 */

export type EmbedTheme = {
  accent?: string;
  background?: string;
  foreground?: string;
  radius?: number;
  font_family?: string;
};

export type EmbedPrinter = {
  id: string;
  name: string;
  build_volume_mm: { x: number | null; y: number | null; z: number | null };
  qualities: Array<{
    code: PrintQuality;
    label: string;
    description: string;
    layer_height_mm: number;
  }>;
  materials: PortalMaterial[];
};

export type EmbedConfig = {
  shop_name: string;
  available: boolean;
  printers: EmbedPrinter[];
  max_quantity: number;
  currency: string;
  upload_max_bytes: number;
  theme: EmbedTheme;
};

export type EmbedQuoteChoices = {
  printerId: string;
  materialId: string;
  quality: PrintQuality;
  quantity: number;
};

export type EmbedContact = { name: string; email?: string; phone?: string; notes?: string };

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown[] } };

async function sha256Hex(file: File): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) {
    return undefined;
  }
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** PUT to the signed storage URL with progress (fetch can't report upload progress). */
function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError('The upload failed. Try again.', 'upload_failed', xhr.status));
    xhr.onerror = () =>
      reject(new ApiError("Can't reach the server. Check your connection.", 'network_error', 0));
    xhr.send(file);
  });
}

export class EmbedClient {
  private session: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly key: string,
  ) {}

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/public/embed${path}`, {
        method,
        credentials: 'omit',
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(this.session ? { 'X-Embed-Session': this.session } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError("Can't reach the shop right now. Try again.", 'network_error', 0);
    }
    const payload = (await response.json().catch(() => ({}))) as { data?: T } & ErrorBody;
    if (!response.ok) {
      throw new ApiError(
        payload.error?.message ??
          (response.status === 429
            ? 'Too many requests. Wait a minute and try again.'
            : `Something went wrong (${response.status}).`),
        payload.error?.code ?? 'unknown_error',
        response.status,
        payload.error?.details,
      );
    }
    return payload.data as T;
  }

  config() {
    return this.request<EmbedConfig>('GET', `/${encodeURIComponent(this.key)}/config`);
  }

  async startSession(parentOrigin: string) {
    const result = await this.request<{ token: string; expires_at: string }>(
      'POST',
      `/${encodeURIComponent(this.key)}/sessions`,
      { parentOrigin },
    );
    this.session = result.token;
    return result;
  }

  /** Reserve a model, upload the file straight to storage, then mark it uploaded. */
  async upload(file: File, onProgress?: (fraction: number) => void) {
    const started = await this.request<{
      model: { id: string; filename: string };
      upload: { method: 'PUT'; url: string; headers: Record<string, string> };
    }>('POST', '/models/uploads', { filename: file.name, byteSize: file.size });
    await putWithProgress(started.upload.url, file, started.upload.headers, onProgress);
    const checksumSha256 = await sha256Hex(file);
    return this.request<{ id: string; filename: string; status: string }>(
      'POST',
      `/models/${started.model.id}/complete`,
      checksumSha256 ? { checksumSha256 } : {},
    );
  }

  createQuote(modelFileId: string, choices: EmbedQuoteChoices) {
    return this.request<PortalQuote>('POST', '/quotes', { modelFileId, ...choices });
  }

  repriceQuote(quoteId: string, choices: EmbedQuoteChoices) {
    return this.request<PortalQuote>('POST', `/quotes/${quoteId}/price`, choices);
  }

  placeOrder(quoteId: string, expectedTotalCents: number, contact: EmbedContact) {
    return this.request<PortalQuote>('POST', `/quotes/${quoteId}/order`, {
      expectedTotalCents,
      ...contact,
    });
  }
}
