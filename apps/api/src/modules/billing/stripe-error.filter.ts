import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import Stripe from 'stripe';

/** Stripe SDK failures (bad key, declined, Stripe down) become 502 with Stripe's message instead of a bare 500. */
@Catch(Stripe.errors.StripeError)
export class StripeErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Stripe');

  catch(err: InstanceType<typeof Stripe.errors.StripeError>, host: ArgumentsHost): void {
    this.logger.error(`${err.type}: ${err.message}`);
    host.switchToHttp().getResponse<Response>().status(502).json({ statusCode: 502, message: `Stripe: ${err.message}` });
  }
}
