import { z } from 'zod';

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_BASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AUTH_SESSION_SECRET: z.string().min(32),
  PAYMENT_PROVIDER_WEBHOOK_SECRET: z.string().min(16),
  PAYSTACK_SECRET_KEY: z.string().min(8).optional(),
  PAYSTACK_PUBLIC_KEY: z.string().min(8).optional(),
  PAYSTACK_API_BASE_URL: z.string().url().default('https://api.paystack.co')
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(environment: NodeJS.ProcessEnv): ServerEnvironment {
  return serverEnvironmentSchema.parse(environment);
}
