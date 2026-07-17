import { describe, expect, it } from 'vitest';

import { parseEnv } from './env.schema';

const baseEnv = {
  DATABASE_URL: 'postgresql://printos:printos@localhost:5432/printos',
  JWT_ACCESS_SECRET: 'dev-only-access-secret-change-me-32c',
  JWT_REFRESH_SECRET: 'dev-only-refresh-secret-change-me-32',
};

describe('parseEnv', () => {
  it('parses required database url and defaults', () => {
    const config = parseEnv(baseEnv);

    expect(config.API_PORT).toBe(3000);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.CORS_ORIGINS).toContain('http://localhost:5173');
    expect(config.DB_REQUIRED_ON_BOOT).toBe(false);
    expect(config.JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() =>
      parseEnv({
        JWT_ACCESS_SECRET: baseEnv.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: baseEnv.JWT_REFRESH_SECRET,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('parses CORS origins list', () => {
    const config = parseEnv({
      ...baseEnv,
      CORS_ORIGINS: 'https://admin.example.com, https://portal.example.com',
    });
    expect(config.CORS_ORIGINS).toEqual([
      'https://admin.example.com',
      'https://portal.example.com',
    ]);
  });
});
