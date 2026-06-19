import express, { type Express } from 'express';
import type { RuntimeConfig } from './config/index.js';
import { loadRuntimeConfig } from './config/index.js';
import { LineHandler } from './handlers/lineHandler.js';
import { FacebookPublisher } from './services/facebookPublisher.js';
import { InstagramPublisher } from './services/instagramPublisher.js';
import { LineService } from './services/lineService.js';
import { OpenAIService } from './services/openaiService.js';
import { PublisherRegistry } from './services/publisherRegistry.js';
import { S3Service } from './services/s3Service.js';
import { ThreadsPublisher } from './services/threadsPublisher.js';
import type {
  IAIService,
  ILineService,
  IPublisher,
  IPublisherRegistry,
  IS3Service,
  ISessionStore,
} from './types/index.js';
import { createHealthRouter, createWebhookRouter } from './routes/webhook.js';
import { InMemorySessionStore } from './utils/sessionStore.js';
import { createLoggerWithLevel, logger } from './utils/logger.js';

export interface ServiceContainer {
  s3Service: IS3Service;
  aiService: IAIService;
  lineService: ILineService;
  sessionStore: ISessionStore;
  instagramPublisher: IPublisher;
  facebookPublisher: IPublisher;
  threadsPublisher: IPublisher;
  publisherRegistry: IPublisherRegistry;
  lineHandler: LineHandler;
}

export interface BootstrapResult {
  app: Express;
  services: ServiceContainer;
  config: RuntimeConfig;
}

export interface BootstrapOptions {
  config?: RuntimeConfig;
  services?: Partial<ServiceContainer>;
}

/**
 * Wire dependencies and create the Express application.
 */
export function bootstrap(options: BootstrapOptions = {}): BootstrapResult {
  const config = options.config ?? loadRuntimeConfig();

  const s3Service =
    options.services?.s3Service ?? new S3Service({ config });
  const aiService =
    options.services?.aiService ?? new OpenAIService({ config });
  const lineService =
    options.services?.lineService ?? new LineService({ config });
  const instagramPublisher =
    options.services?.instagramPublisher ?? new InstagramPublisher(config);
  const facebookPublisher =
    options.services?.facebookPublisher ?? new FacebookPublisher(config);
  const threadsPublisher =
    options.services?.threadsPublisher ?? new ThreadsPublisher(config);
  const publisherRegistry =
    options.services?.publisherRegistry ??
    new PublisherRegistry({
      instagram: instagramPublisher,
      facebook: facebookPublisher,
      threads: threadsPublisher,
    });

  const sessionStore =
    options.services?.sessionStore ??
    new InMemorySessionStore({
      ttlMs: config.SESSION_TTL_MS,
      logger,
      onExpire: (session) => {
        void s3Service.delete(session.imageS3Key).catch((error) => {
          logger.error(
            { err: error, key: session.imageS3Key },
            'TTL S3 cleanup failed',
          );
        });
      },
    });

  const lineHandler =
    options.services?.lineHandler ??
    new LineHandler({
      lineService,
      s3Service,
      aiService,
      sessionStore,
      publisherRegistry,
    });

  const app = express();
  app.use(createHealthRouter());
  app.use(
    '/webhook',
    express.raw({ type: 'application/json' }),
    createWebhookRouter(lineHandler, config.LINE_CHANNEL_SECRET),
  );

  return {
    app,
    config,
    services: {
      s3Service,
      aiService,
      lineService,
      sessionStore,
      instagramPublisher,
      facebookPublisher,
      threadsPublisher,
      publisherRegistry,
      lineHandler,
    },
  };
}

export { createLoggerWithLevel, logger };
