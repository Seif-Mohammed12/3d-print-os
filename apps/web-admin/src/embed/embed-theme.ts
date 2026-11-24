import type { EmbedTheme } from './embed-api';

/**
 * Fitting the quoter to the host site. The shop sets a default look in the console; the
 * host page can override it per embed with data attributes, which the loader passes in the
 * frame URL. Everything lands on the same CSS variables the app's tokens use.
 */

export type FrameOptions = {
  key: string;
  theme: EmbedTheme;
  /** A Google Fonts stylesheet for `font_family`, if the host uses a web font. */
  fontUrl: string | null;
  mode: 'light' | 'dark';
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_FAMILY = /^[A-Za-z0-9 ,'"-]{1,80}$/;

/** "#0f766e" → "175 77% 26%", the HSL triplet format of the app's tokens. */
export function hexToHslTriplet(hex: string): string | null {
  if (!HEX.test(hex)) {
    return null;
  }
  let value = hex.slice(1);
  if (value.length === 3) {
    value = [...value].map((c) => c + c).join('');
  }
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function lightness(triplet: string): number {
  return Number(triplet.split(' ')[2]?.replace('%', '') ?? 50);
}

function parseTriplet(triplet: string): [number, number, number] {
  const [h = '0', s = '0%', l = '0%'] = triplet.split(' ');
  return [Number(h), Number(s.replace('%', '')), Number(l.replace('%', ''))];
}

/**
 * The surfaces around a host page's background, so panels, fields and rules sit on the host's
 * own colour instead of the app's. Steps go lighter on a dark background and darker on a light
 * one, keeping the background's hue. Muted text sits between the foreground and the background.
 */
export function surfaceTokens(background: string, foreground?: string): Record<string, string> {
  const [h, s, l] = parseTriplet(background);
  const isDark = l < 50;
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const step = (delta: number) => `${h} ${s}% ${clamp(isDark ? l + delta : l - delta)}%`;
  const raised = `${h} ${s}% ${clamp(l + 3)}%`;
  const tokens: Record<string, string> = {
    '--card': raised,
    '--popover': isDark ? step(6) : raised,
    '--secondary': step(6),
    '--muted': step(6),
    '--accent': step(6),
    '--border': step(11),
    '--rule': step(11),
    '--stock-edge': step(11),
    '--input': step(16),
  };
  if (foreground) {
    const [fh, fs, fl] = parseTriplet(foreground);
    tokens['--muted-foreground'] = `${fh} ${fs}% ${Math.round(fl + (l - fl) * 0.35)}%`;
  }
  return tokens;
}

/** The corner scale for a base radius. A base of 10px gives the app's own scale. */
export function radiusTokens(radius: number): Record<string, string> {
  return {
    '--radius': `${radius}px`,
    '--radius-sm': `${Math.min(radius, 6)}px`,
    '--radius-md': `${Math.min(radius, 8)}px`,
    '--radius-xl': `${Math.round(radius * 1.4)}px`,
    '--radius-2xl': `${Math.round(radius * 1.8)}px`,
    // Pills only suit a rounded look; a square site gets square chips.
    '--radius-chip': radius >= 10 ? '9999px' : `${radius}px`,
  };
}

function setTokens(root: HTMLElement, tokens: Record<string, string>) {
  for (const [token, value] of Object.entries(tokens)) {
    root.style.setProperty(token, value);
  }
}

function pickHex(value: string | null): string | undefined {
  return value && HEX.test(value) ? value : undefined;
}

export function readFrameOptions(search: string): FrameOptions {
  const params = new URLSearchParams(search);
  const radius = params.get('radius');
  const font = params.get('font');
  const fontUrl = params.get('font_url');
  const theme: EmbedTheme = {};
  const accent = pickHex(params.get('accent'));
  const background = pickHex(params.get('background'));
  const foreground = pickHex(params.get('foreground'));
  if (accent) theme.accent = accent;
  if (background) theme.background = background;
  if (foreground) theme.foreground = foreground;
  if (radius !== null && Number.isFinite(Number(radius))) {
    theme.radius = Math.min(24, Math.max(0, Number(radius)));
  }
  if (font && FONT_FAMILY.test(font)) theme.font_family = font;
  return {
    key: params.get('key') ?? '',
    theme,
    // Only Google Fonts stylesheets: an arbitrary URL would be an arbitrary stylesheet.
    fontUrl: fontUrl && /^https:\/\/fonts\.googleapis\.com\/css2?\?/.test(fontUrl) ? fontUrl : null,
    mode: params.get('mode') === 'dark' ? 'dark' : 'light',
  };
}

/** Host overrides win over the shop's defaults. */
export function applyTheme(shop: EmbedTheme, frame: FrameOptions) {
  const theme = { ...shop, ...frame.theme };
  const root = document.documentElement;
  root.classList.toggle('dark', frame.mode === 'dark');

  const accent = theme.accent ? hexToHslTriplet(theme.accent) : null;
  if (accent) {
    for (const token of ['--primary', '--brand', '--ring', '--stock-printing']) {
      root.style.setProperty(token, accent);
    }
    // Light accents need dark text on buttons.
    root.style.setProperty(
      '--primary-foreground',
      lightness(accent) > 60 ? '0 0% 9%' : '0 0% 100%',
    );
    const [h, s] = accent.split(' ');
    root.style.setProperty(
      '--stock-printing-soft',
      frame.mode === 'dark' ? `${h} ${s} 16%` : `${h} ${s} 94%`,
    );
  }
  const background = theme.background ? hexToHslTriplet(theme.background) : null;
  const foreground = theme.foreground ? hexToHslTriplet(theme.foreground) : null;
  if (background) {
    root.style.setProperty('--background', background);
    document.body.style.background = `hsl(${background})`;
    setTokens(root, surfaceTokens(background, foreground ?? undefined));
  }
  if (foreground) {
    for (const token of [
      '--foreground',
      '--card-foreground',
      '--popover-foreground',
      '--secondary-foreground',
      '--accent-foreground',
    ]) {
      root.style.setProperty(token, foreground);
    }
  }
  if (theme.radius !== undefined) {
    setTokens(root, radiusTokens(theme.radius));
  }
  if (theme.font_family) {
    root.style.fontFamily = `${theme.font_family}, ui-sans-serif, system-ui, sans-serif`;
  }
  if (frame.fontUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = frame.fontUrl;
    document.head.appendChild(link);
  }
}
