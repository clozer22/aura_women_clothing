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

/**
 * Validates whether the incoming request contains an authenticated admin session
 * @param {import('http').IncomingMessage} req
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ isAuthorized: boolean, user?: object, email?: string, error?: string }>}
 */
export async function verifyAdminSession(req, supabase) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthorized: false, user: null, error: 'Administrative authorization token required' };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return { isAuthorized: false, user: null, error: 'Empty administrative authorization token' };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return { isAuthorized: false, user: null, error: 'Invalid or expired administrative session' };
  }

  const user = userData.user;
  const userEmail = (user.email || '').toLowerCase().trim();

  const isHardcodedAdmin =
    userEmail.endsWith('@superadmin.com') ||
    userEmail.endsWith('@aura.com') ||
    userEmail.endsWith('@admin.com') ||
    userEmail === 'markjosephaballe1@gmail.com';

  if (isHardcodedAdmin) {
    return { isAuthorized: true, user, email: userEmail, isAdmin: true };
  }

  const { data: adminProf } = await supabase
    .from('admin_profiles')
    .select('id, is_active, role')
    .eq('email', userEmail)
    .maybeSingle();

  if (adminProf?.is_active) {
    return { isAuthorized: true, user, email: userEmail, isAdmin: true, role: adminProf.role };
  }

  return { isAuthorized: false, user, error: 'Forbidden: Administrative privileges required' };
}

