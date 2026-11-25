import 'dotenv/config';

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '4000'), 10),
  DATABASE_URL: optional('DATABASE_URL', ''),          // set in .env
  JWT_SECRET: optional('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  COOKIE_SECRET: optional('COOKIE_SECRET', 'cookie-secret-change-me'),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:3000'),
  // Supabase object storage
  SUPABASE_URL: optional('SUPABASE_URL', ''),
  SUPABASE_SERVICE_KEY: optional('SUPABASE_SERVICE_KEY', ''),
  SUPABASE_BUCKET: optional('SUPABASE_BUCKET', 'buildflow-docs'),
} as const;

export type Env = typeof env;
