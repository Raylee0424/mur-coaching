import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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
