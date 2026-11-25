import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';
import { parseTrustProxy } from './config/env';

async function bootstrap(): Promise<void> {
  // rawBody: the Stripe webhook verifies its signature over the exact bytes.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const env = app.get(EnvService);

  // Rate limits key on req.ip; only trusted hops may set X-Forwarded-For.
  app.set('trust proxy', parseTrustProxy(env.get('TRUST_PROXY')));
  app.setGlobalPrefix('api/v1');
  // CSV imports carry the file as JSON (up to 5 MB plus escaping). Wrapped so Nest still registers its default
  // 100 KB parser for every other route (it skips registration when a layer named jsonParser already exists).
  const importJson = json({ limit: '12mb' });
  app.use('/api/v1/me/data/imports', (req: Parameters<typeof importJson>[0], res: Parameters<typeof importJson>[1], next: Parameters<typeof importJson>[2]) => importJson(req, res, next));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({
    origin: env.get('CORS_ORIGIN').split(',').map((o) => o.trim()),
    credentials: true,
  });

  await app.listen(env.get('PORT'));
}

void bootstrap();
