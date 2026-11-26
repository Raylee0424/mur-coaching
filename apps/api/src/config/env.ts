import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  CORS_ORIGIN: z.string().min(1),
  /** Public web origin used in emailed links (reset, invite). */
  WEB_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(4000),
  /**
   * Express `trust proxy`: which hops may set X-Forwarded-For (rate limits key on the client IP).
   * `true`/`false`, a hop count, or an Express preset / comma-separated subnet list. The web server forwards
   * the visitor IP only from its CLIENT_IP_HEADER, so set this to the web server's address or subnet.
   */
  TRUST_PROXY: z.string().min(1).default('loopback'),
  /** Unset = payments disabled: billing endpoints answer 503, entitlements still resolve. */
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  /** Signing secret of the separate Connect endpoint (connected-account events). Unset = that endpoint answers 503. */
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  /** Stripe Price ids for the paid platform plans (monthly). */
  STRIPE_PRICE_ATHLETE_PRO: z.string().startsWith('price_').optional(),
  STRIPE_PRICE_COACH: z.string().startsWith('price_').optional(),
  /** Platform cut of coach-offer payments, in percent. */
  STRIPE_PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(50).default(0),
  /** Cloudflare R2 (S3 API) for the resource vault. All four unset = uploads and downloads answer 503. */
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  /** How often the automation worker checks triggers. 0 = off (fire only through "Run now"). */
  /**
   * AES-256-GCM key for cycle logs: 32 random bytes, base64 (`openssl rand -base64 32`).
   * Unset = cycle routes answer 503; readiness still works. Rotating it makes existing cycle logs unreadable.
   */
  CYCLE_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'CYCLE_ENCRYPTION_KEY must be 32 bytes, base64-encoded')
    .optional(),
  /**
   * Optional model provider for the MUR AI Training Coach, workout generator and voice parsing. Unset = every AI
   * route answers from the deterministic server rules, with no network call (local dev, CI, smoke tests).
   */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default('claude-sonnet-4-6'),
  AUTOMATIONS_INTERVAL_MINUTES: z.coerce.number().int().min(0).max(1440).default(5),
  /**
   * Platform moderators: comma-separated emails, compared case-insensitively after trimming. Unset or empty = nobody
   * can open the moderation queue. Read on every moderation request, so edits apply after a restart.
   */
  MODERATOR_EMAILS: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.validate: fail fast on boot with a readable message. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

/**
 * Express `trust proxy` value. Booleans and hop counts must reach Express typed: the raw string "true" would be
 * read as a subnet list and crash proxy-addr at boot.
 */
export function parseTrustProxy(value: string): boolean | number | string {
  const v = value.trim();
  if (/^true$/i.test(v)) return true;
  if (/^false$/i.test(v)) return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(',');
}
