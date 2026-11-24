import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Per-client-IP limit for one route (`limit` requests per `ttlMs`). The IP comes from req.ip, which honours
 * TRUST_PROXY: the web server forwards the browser IP in X-Forwarded-For. Buckets live in process memory.
 */
export const RateLimit = (limit: number, ttlMs: number): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(ThrottlerGuard), Throttle({ default: { limit, ttl: ttlMs } }));
