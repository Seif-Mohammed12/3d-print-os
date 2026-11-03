import { describe, expect, it } from 'vitest';

import {
  hashSessionToken,
  isOriginAllowed,
  isPublishableKey,
  newPublishableKey,
  newSessionToken,
  normalizeOrigin,
  sanitizeTheme,
} from './embed-rules';

describe('normalizeOrigin', () => {
  it('reduces a URL to its origin', () => {
    expect(normalizeOrigin('https://Shop.Example/quote?x=1')).toBe('https://shop.example');
    expect(normalizeOrigin('https://shop.example:443')).toBe('https://shop.example');
    expect(normalizeOrigin('https://shop.example:8443/')).toBe('https://shop.example:8443');
  });

  it('allows plain http only for localhost', () => {
    expect(normalizeOrigin('http://localhost:4173')).toBe('http://localhost:4173');
    expect(normalizeOrigin('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
    expect(normalizeOrigin('http://shop.example')).toBeNull();
  });

  it('rejects anything that is not an http(s) origin', () => {
    expect(normalizeOrigin('shop.example')).toBeNull();
    expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
    expect(normalizeOrigin('https://user:pass@shop.example')).toBeNull();
    expect(normalizeOrigin('')).toBeNull();
  });
});

describe('isOriginAllowed', () => {
  const allowed = ['https://shop.example'];

  it('matches exact origins only', () => {
    expect(isOriginAllowed('https://shop.example', allowed)).toBe(true);
    expect(isOriginAllowed('https://SHOP.example', allowed)).toBe(true);
    expect(isOriginAllowed('https://evil.shop.example', allowed)).toBe(false);
    expect(isOriginAllowed('https://shop.example.evil', allowed)).toBe(false);
    expect(isOriginAllowed('http://shop.example', allowed)).toBe(false);
  });

  it('refuses a missing origin', () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
    expect(isOriginAllowed('null', allowed)).toBe(false);
  });
});

describe('keys and tokens', () => {
  it('generates publishable keys that validate', () => {
    const key = newPublishableKey();
    expect(isPublishableKey(key)).toBe(true);
    expect(isPublishableKey('sk_live_secret')).toBe(false);
    expect(isPublishableKey("pk_' OR 1=1")).toBe(false);
  });

  it('hashes session tokens deterministically and never returns the token', () => {
    const token = newSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
    expect(newSessionToken()).not.toBe(token);
  });
});

describe('sanitizeTheme', () => {
  it('keeps valid values', () => {
    expect(
      sanitizeTheme({
        accent: '#0F766E',
        background: '#fff',
        radius: 12.4,
        font_family: 'Inter, sans-serif',
      }),
    ).toEqual({
      accent: '#0f766e',
      background: '#fff',
      radius: 12,
      font_family: 'Inter, sans-serif',
    });
  });

  it('drops values that could inject CSS', () => {
    expect(
      sanitizeTheme({
        accent: 'red; background: url(x)',
        foreground: 'rgb(0,0,0)',
        font_family: 'x}body{display:none',
        radius: 'abc',
      }),
    ).toEqual({});
  });

  it('clamps the radius', () => {
    expect(sanitizeTheme({ radius: 400 })).toEqual({ radius: 24 });
    expect(sanitizeTheme({ radius: -3 })).toEqual({ radius: 0 });
  });
});
