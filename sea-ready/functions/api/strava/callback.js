import { needKV, needStrava, exchangeCode } from '../../../lib/server.js';

const back = (request, result) => Response.redirect(new URL('/?strava=' + result + '#sync', request.url).toString(), 302);

// GET /api/strava/callback — Strava sends the user back here after they approve access
export async function onRequestGet({ request, env }) {
  const miss = needKV(env) || needStrava(env); if (miss) return miss;
  const p = new URL(request.url).searchParams;
  const state = p.get('state') || '';
  const id = state ? await env.SEAREADY.get('oauth:' + state) : null;
  if (!id) return back(request, 'expired');
  await env.SEAREADY.delete('oauth:' + state);
  if (p.get('error')) return back(request, 'denied');
  const scope = p.get('scope') || '';
  if (!/activity:read/.test(scope)) return back(request, 'scope');
  try {
    const t = await exchangeCode(env, p.get('code') || '');
    await env.SEAREADY.put('strava:' + id, JSON.stringify({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
      athlete: t.athlete ? { id: t.athlete.id, firstname: t.athlete.firstname || '' } : null,
      connected_at: Date.now(),
    }));
    return back(request, 'connected');
  } catch {
    return back(request, 'failed');
  }
}
