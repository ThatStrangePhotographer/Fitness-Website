import { json, needKV, syncId, STRAVA } from '../../../lib/server.js';

// POST /api/strava/disconnect — revoke access and forget the tokens
export async function onRequestPost({ request, env }) {
  const miss = needKV(env); if (miss) return miss;
  const id = await syncId(request);
  if (!id) return json({ error: 'no_key' }, 401);
  const rec = await env.SEAREADY.get('strava:' + id, 'json');
  if (rec) {
    try { await fetch(STRAVA + '/oauth/deauthorize', { method: 'POST', body: new URLSearchParams({ access_token: rec.access_token }) }); } catch {}
    await env.SEAREADY.delete('strava:' + id);
  }
  return json({ ok: true });
}
