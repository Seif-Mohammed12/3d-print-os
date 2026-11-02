import { apiClient } from './api-client';

/** Published by tools/start-server.ps1 each time the backend's tunnel address changes. */
type RuntimeConfig = { apiBaseUrl?: string };

const CONFIG_URL = import.meta.env.VITE_RUNTIME_CONFIG_URL ?? '';
const TIMEOUT_MS = 4000;

/**
 * Point the API client at the backend's current address before the app renders.
 * Falls back to the build-time VITE_API_BASE_URL when no config URL is set or it can't be read.
 */
export async function loadRuntimeConfig(): Promise<void> {
  if (!CONFIG_URL) {
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const separator = CONFIG_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${CONFIG_URL}${separator}t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      return;
    }
    const config = (await response.json()) as RuntimeConfig;
    if (typeof config.apiBaseUrl === 'string' && /^https?:\/\//.test(config.apiBaseUrl)) {
      apiClient.setBaseUrl(config.apiBaseUrl.replace(/\/+$/, ''));
    }
  } catch {
    // Keep the build-time address.
  } finally {
    clearTimeout(timer);
  }
}
