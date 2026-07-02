import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './docs/swagger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import router from './routes';

export function createApp(): Application {
  const app = express();

  // Behind a reverse proxy (Docker / nginx) — trust the first hop for real IPs.
  app.set('trust proxy', 1);

  // Security headers. Relax CSP for the Swagger UI assets.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // API docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

  // Global rate limit, then the API surface.
  app.use('/api', apiLimiter, router);

  // Root ping
  app.get('/', (_req, res) => res.json({ name: 'PollWave API', docs: '/docs' }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
