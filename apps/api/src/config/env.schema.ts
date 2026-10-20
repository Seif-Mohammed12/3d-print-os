import { z } from 'zod';

const booleanFromString = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
});

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.string().min(1).optional(),
  ),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  /** When false, API still boots if DB is down; /health/ready reports degraded. */
  DB_REQUIRED_ON_BOOT: booleanFromString.default(false),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  UPLOAD_BUCKET: z.string().min(1).default('model-files'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(52_428_800),
  UPLOAD_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  /** Base URL of the geometry service including its API prefix. */
  GEOMETRY_SERVICE_URL: z.string().url().default('http://localhost:8000/api/v1'),
  /** Upper bound for one slicing request (all orientation candidates). */
  SLICE_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
