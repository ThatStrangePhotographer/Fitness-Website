// Shared helpers for the Pages Functions in /functions.
// Bindings expected (set in the Cloudflare dashboard, see README):
//   SEAREADY              KV namespace — stores synced app state and Strava tokens
//   STRAVA_CLIENT_ID      Strava API application client ID (plain variable)
//   STRAVA_CLIENT_SECRET  Strava API application client secret (encrypted secret)

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function needKV(env) {
  return env.SEAREADY ? null : json({ error: 'kv_missing', message: 'The SEAREADY KV namespace binding is not configured.' }, 501);
}

export function needStrava(env) {
  return env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET
    ? null
    : json({ error: 'strava_missing', message: 'STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are not configured.' }, 501);
}

// The sync key never leaves the browser except in this header; the server only stores a hash of it.
export async function syncId(request) {
  const key = (request.headers.get('x-sync-key') || '').trim();
  if (key.length < 20 || key.length > 120) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('seaready:' + key));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const STRAVA = 'https://www.strava.com';

async function tokenRequest(env, params) {
  const body = new URLSearchParams({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, ...params });
  const res = await fetch(STRAVA + '/oauth/token', { method: 'POST', body });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.access_token) {
    const err = new Error('Strava token request failed (' + res.status + ')');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function exchangeCode(env, code) {
  return tokenRequest(env, { code, grant_type: 'authorization_code' });
}

// Returns a valid token record, refreshing it if it expires within 2 minutes. null = not connected.
export async function getToken(env, id) {
  const rec = await env.SEAREADY.get('strava:' + id, 'json');
  if (!rec) return null;
  if (rec.expires_at > Date.now() / 1000 + 120) return rec;
  const fresh = await tokenRequest(env, { grant_type: 'refresh_token', refresh_token: rec.refresh_token });
  const next = { ...rec, access_token: fresh.access_token, refresh_token: fresh.refresh_token, expires_at: fresh.expires_at };
  await env.SEAREADY.put('strava:' + id, JSON.stringify(next));
  return next;
}

export async function stravaGet(token, path) {
  return fetch(STRAVA + '/api/v3' + path, { headers: { authorization: 'Bearer ' + token.access_token } });
}

export { STRAVA };
