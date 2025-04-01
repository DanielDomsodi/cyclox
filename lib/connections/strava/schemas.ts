import { z } from 'zod';

export const stravaAuthTokenSchema = z.object({
  token_type: z.string(),
  expires_at: z.number(),
  access_token: z.string(),
  refresh_token: z.string(),
  athlete: z.object({
    id: z.number(),
  }),
});

export type StravaAuthToken = z.infer<typeof stravaAuthTokenSchema>;

export const stravaRefreshTokenSchema = stravaAuthTokenSchema.omit({
  athlete: true,
});

export type StravaRefreshToken = z.infer<typeof stravaRefreshTokenSchema>;
