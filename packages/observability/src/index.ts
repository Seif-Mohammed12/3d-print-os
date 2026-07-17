import pino, { type Logger } from 'pino';

export type LoggerOptions = {
  service: string;
  level?: string;
};

export function createLogger(options: LoggerOptions): Logger {
  return pino({
    name: options.service,
    level: options.level ?? process.env.LOG_LEVEL ?? 'info',
    base: {
      service: options.service,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type { Logger };
