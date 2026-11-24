import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { EnvService } from '../../config/env.service';

export type WebhookEndpoint = 'platform' | 'connect';

/** Owns the Stripe SDK client. Null when STRIPE_SECRET_KEY is unset, so the app still runs without payments. */
@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;

  constructor(private readonly env: EnvService) {
    const key = env.get('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  get configured(): boolean {
    return this.stripe !== null;
  }

  /** The SDK client, or 503 when payments are not configured. */
  client(): Stripe {
    if (!this.stripe) throw new ServiceUnavailableException('Payments are not configured');
    return this.stripe;
  }

  /** Signing secret for the platform endpoint, or for the separate Connect endpoint (connected-account events). */
  webhookSecret(endpoint: WebhookEndpoint): string {
    const secret = this.env.get(endpoint === 'connect' ? 'STRIPE_CONNECT_WEBHOOK_SECRET' : 'STRIPE_WEBHOOK_SECRET');
    if (!this.stripe || !secret) throw new ServiceUnavailableException('Payments are not configured');
    return secret;
  }

  /** Absolute web URL for Stripe redirects (checkout success, portal return, Connect onboarding). */
  webUrl(path: `/${string}`): string {
    return `${this.env.get('WEB_URL').replace(/\/$/, '')}${path}`;
  }
}
