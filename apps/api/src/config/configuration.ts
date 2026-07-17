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
  };
}

/** Nest ConfigModule factory — returns nested config object. */
export default function configuration(): { app: AppConfig } {
  return { app: loadAppConfig() };
}
