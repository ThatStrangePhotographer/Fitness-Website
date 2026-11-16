import { json, needKV, needStrava, syncId, getToken, stravaGet } from '../../../lib/server.js';

const KEEP = ['id', 'name', 'sport_type', 'type', 'start_date', 'start_date_local', 'distance', 'moving_time', 'elapsed_time', 'average_heartrate'];

// GET /api/strava/activities?after=<unix seconds> — up to 400 activities since `after`
export async function onRequestGet({ request, env }) {
  const miss = needKV(env) || needStrava(env); if (miss) return miss;
  const id = await syncId(request);
  if (!id) return json({ error: 'no_key' }, 401);
  let token;
  try { token = await getToken(env, id); } catch { await env.SEAREADY.delete('strava:' + id); return json({ error: 'reauth' }, 401); }
  if (!token) return json({ error: 'not_connected' }, 404);
  const now = Math.floor(Date.now() / 1000);
  const after = Math.max(0, Math.min(now, parseInt(new URL(request.url).searchParams.get('after') || '', 10) || now - 200 * 86400));
  const out = [];
  for (let page = 1; page <= 4; page++) {
    const res = await stravaGet(token, `/athlete/activities?after=${after}&per_page=100&page=${page}`);
    if (res.status === 401) { await env.SEAREADY.delete('strava:' + id); return json({ error: 'reauth' }, 401); }
    if (res.status === 429) return json({ error: 'rate_limited', activities: out }, 429);
    if (!res.ok) return json({ error: 'strava_error', status: res.status }, 502);
    const list = await res.json();
    for (const a of list) { const o = {}; for (const k of KEEP) if (a[k] !== undefined) o[k] = a[k]; out.push(o); }
    if (list.length < 100) break;
  }
  return json({ activities: out });
}
