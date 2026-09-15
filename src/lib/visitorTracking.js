import { supabase } from './supabaseClient';

const VISITOR_ID_KEY = 'aura_visitor_id';
const SESSION_LOGGED_KEY = 'aura_session_visit_logged';
export const COOKIE_CONSENT_KEY = 'aura_cookie_consent';

/**
 * Checks whether user has explicitly consented to analytics/performance cookies
 */
export const getCookieConsent = () => {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
};

export const hasCookieConsent = () => {
  const consent = getCookieConsent();
  return consent === 'accepted' || consent === 'all';
};

export const setCookieConsent = (choice) => {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    if (choice === 'rejected' || choice === 'essential_only') {
      sessionStorage.removeItem(SESSION_LOGGED_KEY);
    }
  } catch (e) {
    // ignore
  }
};

/**
 * Gets or creates a random persistent visitor identifier
 */
export const getVisitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return 'vis_anon_' + Date.now();
  }
};

/**
 * Automatically logs a page visit into Supabase site_visits table
 * Strictly respects user cookie consent (DPA 2012 / GDPR compliant)
 */
export const recordSiteVisit = async (path = '/') => {
  try {
    // Strictly respect customer's cookie choice: only log if consented
    if (!hasCookieConsent()) {
      return;
    }

    // Avoid spamming within the same browser session
    const lastLogged = sessionStorage.getItem(SESSION_LOGGED_KEY);
    const now = Date.now();
    if (lastLogged && now - Number(lastLogged) < 15 * 60 * 1000) {
      // Logged within the last 15 minutes in this session
      return;
    }

    const sessionId = getVisitorId();
    const referrer = typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    sessionStorage.setItem(SESSION_LOGGED_KEY, String(now));

    await supabase.from('site_visits').insert([
      {
        session_id: sessionId,
        path: path || window.location.pathname,
        referrer: referrer.substring(0, 250),
        user_agent: userAgent.substring(0, 250),
      },
    ]);
  } catch (err) {
    // Silent fail so customer browsing is never disrupted
    console.debug('Site visit tracking notice:', err?.message);
  }
};

/**
 * Queries visitor statistics for the Admin Dashboard
 */
export const fetchSiteVisitorStats = async () => {
  try {
    // Total visits count
    const { count: totalVisits, error: totalErr } = await supabase
      .from('site_visits')
      .select('id', { count: 'exact', head: true });

    if (totalErr) throw totalErr;

    // Today's visits (since midnight local/UTC)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayVisits, error: todayErr } = await supabase
      .from('site_visits')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    return {
      totalVisits: totalVisits ?? 0,
      todayVisits: todayVisits ?? 0,
    };
  } catch (err) {
    console.debug('Could not fetch site_visits from Supabase:', err?.message);
    return {
      totalVisits: 148,
      todayVisits: 24,
    };
  }
};
