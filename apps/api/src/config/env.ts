import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  CORS_ORIGIN: z.string().min(1),
  /** Public web origin used in emailed links (reset, invite). */
  WEB_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(4000),
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
