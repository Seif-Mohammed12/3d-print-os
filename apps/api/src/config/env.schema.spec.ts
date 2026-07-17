import { describe, expect, it } from 'vitest';

import { parseEnv } from './env.schema';

describe('parseEnv', () => {
  it('parses required database url and defaults', () => {
    const config = parseEnv({
      DATABASE_URL: 'postgresql://printos:printos@localhost:5432/printos',
    });

    expect(config.API_PORT).toBe(3000);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.CORS_ORIGINS).toContain('http://localhost:5173');
    expect(config.DB_REQUIRED_ON_BOOT).toBe(false);
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('parses CORS origins list', () => {
    const config = parseEnv({
      DATABASE_URL: 'postgresql://localhost/db',
      CORS_ORIGINS: 'https://admin.example.com, https://portal.example.com',
    });
    expect(config.CORS_ORIGINS).toEqual([
      'https://admin.example.com',
      'https://portal.example.com',
    ]);
  });
});
