import type { Server } from 'node:http';
import { bootstrap, logger } from './bootstrap.js';

let server: Server | undefined;

function registerProcessHandlers(
  httpServer: Server,
  destroySessionStore: () => void,
): void {
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    httpServer.close(() => {
      destroySessionStore();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function main(): Promise<void> {
  const { app, config, services } = bootstrap();

  server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Server listening');
  });

  registerProcessHandlers(server, () => {
    if ('destroy' in services.sessionStore) {
      (services.sessionStore as { destroy: () => void }).destroy();
    }
  });
}

if (process.env.VITEST !== 'true') {
  main().catch((error) => {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  });
}

export { bootstrap };
