import fs from 'fs';
import path from 'path';

/**
 * Ensures required server-side environment variables are loaded into process.env.
 * On Vercel, process.env is injected by the platform.
 * In local dev (Vite or Node), this safely reads from local .env if missing.
 */
export function ensureServerEnv() {
  if (process.env.XENDIT_SECRET_KEY && process.env.VITE_SUPABASE_URL) {
    return;
  }

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (err) {
    // Non-blocking in production environments
  }
}
