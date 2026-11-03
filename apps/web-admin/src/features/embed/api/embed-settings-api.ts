import { http } from '../../../shared/api/http';

/** Staff side of the website quoter. */
export type EmbedSettings = {
  /** Public: goes in the snippet on the shop's website. */
  publishable_key: string;
  is_enabled: boolean;
  /** Exact origins, e.g. "https://www.example.com". */
  allowed_origins: string[];
  /** Printers visitors may pick; null for every active FDM printer. */
  printer_ids: string[] | null;
  theme: {
    accent?: string;
    background?: string;
    foreground?: string;
    radius?: number;
    font_family?: string;
  };
  updated_at: string;
};

export type UpdateEmbedSettings = {
  isEnabled?: boolean;
  allowedOrigins?: string[];
  printerIds?: string[] | null;
  theme?: EmbedSettings['theme'];
};

export const embedSettingsApi = {
  get: () => http.get<EmbedSettings>('/embed-settings'),
  update: (input: UpdateEmbedSettings) => http.put<EmbedSettings>('/embed-settings', input),
  rotateKey: () => http.post<EmbedSettings>('/embed-settings/rotate-key'),
};
