import { parseEnv, type EnvConfig } from './env.schema';

export type AppConfig = {
  nodeEnv: EnvConfig['NODE_ENV'];
  port: number;
  logLevel: EnvConfig['LOG_LEVEL'];
  databaseUrl: string;
  redisUrl?: string;
  corsOrigins: string[];
  dbPoolMax: number;
  throttleTtlMs: number;
  throttleLimit: number;
  dbRequiredOnBoot: boolean;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtlSeconds: number;
  jwtRefreshTtlDays: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  uploadBucket: string;
  uploadMaxBytes: number;
  uploadSignedUrlTtlSeconds: number;
  geometryServiceUrl: string;
  sliceTimeoutMs: number;
};

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = parseEnv(env);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.API_PORT,
    logLevel: parsed.LOG_LEVEL,
    databaseUrl: parsed.DATABASE_URL,
    ...(parsed.REDIS_URL !== undefined ? { redisUrl: parsed.REDIS_URL } : {}),
    corsOrigins: parsed.CORS_ORIGINS,
    dbPoolMax: parsed.DB_POOL_MAX,
    throttleTtlMs: parsed.THROTTLE_TTL_MS,
    throttleLimit: parsed.THROTTLE_LIMIT,
    dbRequiredOnBoot: parsed.DB_REQUIRED_ON_BOOT,
    jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
    jwtRefreshSecret: parsed.JWT_REFRESH_SECRET,
    jwtAccessTtlSeconds: parsed.JWT_ACCESS_TTL_SECONDS,
    jwtRefreshTtlDays: parsed.JWT_REFRESH_TTL_DAYS,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    uploadBucket: parsed.UPLOAD_BUCKET,
    uploadMaxBytes: parsed.UPLOAD_MAX_BYTES,
    uploadSignedUrlTtlSeconds: parsed.UPLOAD_SIGNED_URL_TTL_SECONDS,
    geometryServiceUrl: parsed.GEOMETRY_SERVICE_URL.replace(/\/+$/, ''),
    sliceTimeoutMs: parsed.SLICE_TIMEOUT_MS,
  };
}

/** Nest ConfigModule factory — returns nested config object. */
export default function configuration(): { app: AppConfig } {
  return { app: loadAppConfig() };
}
