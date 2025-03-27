import { z } from 'zod';

/**
 * Server-side environment variables schema
 */
export const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Authentication
  AUTH_SECRET: z.string().min(32),
  // JWT_SECRET: z.string().min(32),
  // JWT_EXPIRES_IN: z.string(),
  // JWT_REFRESH_SECRET: z.string().min(32),
  // JWT_REFRESH_EXPIRES_IN: z.string(),
  // SESSION_SECRET: z.string().min(32),

  // // Google OAuth
  // GOOGLE_CLIENT_ID: z.string(),
  // GOOGLE_CLIENT_SECRET: z.string(),

  // // Strava API
  // STRAVA_CLIENT_ID: z.string(),
  // STRAVA_CLIENT_SECRET: z.string(),
  // STRAVA_WEBHOOK_VERIFY_TOKEN: z.string(),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
