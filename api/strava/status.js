import { json, needKV, syncId } from '../../../lib/server.js';

// GET /api/strava/status — is Strava connected for this sync key?
export async function onRequestGet({ request, env }) {
  const miss = needKV(env); if (miss) return miss;
  const id = await syncId(request);
  if (!id) return json({ connected: false });
  const rec = await env.SEAREADY.get('strava:' + id, 'json');
  return json({ connected: !!rec, athlete: rec && rec.athlete ? rec.athlete.firstname : null });
}
