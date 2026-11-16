import { json } from '../../lib/server.js';

// Lets the app discover which server features are switched on.
export async function onRequestGet({ env }) {
  return json({ ok: true, kv: !!env.SEAREADY, strava: !!(env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET) });
}
