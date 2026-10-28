import { createClient } from '@supabase/supabase-js';
import { ensureServerEnv } from './envHelper.js';

// Polyfill global WebSocket for Node.js < 22 runtimes (e.g. Node 20)
// Prevents @supabase/realtime-js WebSocketFactory from throwing in serverless environments
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

class ServerWebSocketTransport {}

/**
 * Creates a server-side Supabase client safe for Node.js < 22 runtimes
 * @param {string|null} customKey Optional override key (e.g. Service Role or Anon key)
 * @param {Object} [customHeaders={}] Optional custom headers (e.g. Authorization bearer token)
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function getSupabaseServerClient(customKey = null, customHeaders = {}) {
  ensureServerEnv();
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://pcmlleeuxbymomjxhwlv.supabase.co';

  const supabaseKey =
    customKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: customHeaders || {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: typeof WebSocket !== 'undefined' ? WebSocket : ServerWebSocketTransport,
    },
  });
}
