import { z } from 'zod';

/**
 * Server-side environment variables schema
 */
export const serverEnvSchema = z.object({
  BASE_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Authentication
  AUTH_SECRET: z.string().min(32),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // Strava API
  STRAVA_CLIENT_ID: z.string(),
  STRAVA_CLIENT_SECRET: z.string(),
  STRAVA_WEBHOOK_VERIFY_TOKEN: z.string(),

  // Cron job
  CRON_SECRET: z.string().min(32),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validate server environment variables at build time
 */
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '❌ Invalid server environment variables:',
      parsed.error.flatten().fieldErrors
    );
    throw new Error('Invalid server environment variables');
  }

  return parsed.data;
}

export const serverEnv = validateServerEnv();
