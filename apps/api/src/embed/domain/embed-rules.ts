/**
 * Rules for the embeddable quoter: which origins may use a shop's embed, how the visitor
 * session token looks, and the shop's theme. Pure functions, so they are easy to test.
 */
import { createHash, randomBytes } from 'node:crypto';

/** One visitor session lasts a day; the quoter starts a new one after that. */
export const EMBED_SESSION_TTL_HOURS = 24;
/** Per session, so one visitor (or one script) can't fill the bucket or the slicer queue. */
export const MAX_UPLOADS_PER_SESSION = 20;
export const MAX_QUOTES_PER_SESSION = 40;
export const MAX_ALLOWED_ORIGINS = 20;

const PUBLISHABLE_KEY_PREFIX = 'pk_';

export function newPublishableKey(): string {
  return `${PUBLISHABLE_KEY_PREFIX}${randomBytes(18).toString('base64url')}`;
}

export function isPublishableKey(value: string): boolean {
  return /^pk_[A-Za-z0-9_-]{16,64}$/.test(value);
}

export function newSessionToken(): string {
  return `es_${randomBytes(32).toString('base64url')}`;
}

/** Tokens are stored only as a hash, so a database leak can't be replayed. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * The canonical form of an origin ("https://shop.example", lower case, no path, default
 * port dropped), or null when the value is not an http(s) origin. `http` is only accepted
 * for localhost so that shops can test locally.
 */
export function normalizeOrigin(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  if (url.username || url.password) {
    return null;
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol === 'http:' && !local) {
    return null;
  }
  return url.origin.toLowerCase();
}

/** Exact match only: no wildcards, so a lookalike subdomain can never embed a shop. */
export function isOriginAllowed(origin: string | null | undefined, allowed: string[]): boolean {
  if (!origin) {
    return false;
  }
  const normalized = normalizeOrigin(origin);
  return normalized !== null && allowed.includes(normalized);
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type EmbedTheme = {
  accent?: string;
  background?: string;
  foreground?: string;
  radius?: number;
  font_family?: string;
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** Font names only ("Inter", "Helvetica Neue"): never CSS that could break out of a rule. */
const FONT_FAMILY = /^[A-Za-z0-9 ,'"-]{1,80}$/;

/** Keeps only well-formed theme values; anything else falls back to the quoter's default. */
export function sanitizeTheme(input: unknown): EmbedTheme {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const raw = input as Record<string, unknown>;
  const theme: EmbedTheme = {};
  for (const key of ['accent', 'background', 'foreground'] as const) {
    const value = raw[key];
    if (typeof value === 'string' && HEX_COLOR.test(value)) {
      theme[key] = value.toLowerCase();
    }
  }
  const radius = Number(raw.radius);
  if (raw.radius !== undefined && raw.radius !== null && Number.isFinite(radius)) {
    theme.radius = Math.min(24, Math.max(0, Math.round(radius)));
  }
  if (typeof raw.font_family === 'string' && FONT_FAMILY.test(raw.font_family.trim())) {
    theme.font_family = raw.font_family.trim();
  }
  return theme;
}
