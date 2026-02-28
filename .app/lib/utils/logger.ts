import pino from "pino";

declare global {
  var __appLogger__: ReturnType<typeof pino> | undefined;
}

const logger =
  globalThis.__appLogger__ ??
  pino({
    level: process.env.LOG_LEVEL || "info",
  });

if (!globalThis.__appLogger__) globalThis.__appLogger__ = logger;

export default logger;
