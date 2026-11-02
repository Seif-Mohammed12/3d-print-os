/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Public JSON with the backend's current address ({ "apiBaseUrl": "..." }); overrides VITE_API_BASE_URL. */
  readonly VITE_RUNTIME_CONFIG_URL?: string;
  /** Shop whose customer portal this build serves (customer sign-up needs it). */
  readonly VITE_PORTAL_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
