import { json, needKV, needStrava, syncId, randomToken } from '../../../lib/server.js';

// POST /api/strava/start — returns the Strava authorisation URL for this device's sync key
export async function onRequestPost({ request, env }) {
  const miss = needKV(env) || needStrava(env); if (miss) return miss;
  const id = await syncId(request);
  if (!id) return json({ error: 'no_key' }, 401);
  const state = randomToken(18);
  await env.SEAREADY.put('oauth:' + state, id, { expirationTtl: 600 });
  const origin = new URL(request.url).origin;
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: origin + '/api/strava/callback',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  }).toString();
  return json({ url: url.toString() });
}
