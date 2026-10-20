/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Shop whose customer portal this build serves (customer sign-up needs it). */
  readonly VITE_PORTAL_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
