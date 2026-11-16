import { json, needKV, syncId } from '../../lib/server.js';

const MAX_BYTES = 2_000_000;

// GET /api/state — the synced app state for this sync key
export async function onRequestGet({ request, env }) {
  const miss = needKV(env); if (miss) return miss;
  const id = await syncId(request);
  if (!id) return json({ error: 'no_key' }, 401);
  const state = await env.SEAREADY.get('state:' + id, 'json');
  return state ? json(state) : json({ error: 'not_found' }, 404);
}

// PUT /api/state — save state; refuses to overwrite newer data (returns it with 409 instead)
export async function onRequestPut({ request, env }) {
  const miss = needKV(env); if (miss) return miss;
  const id = await syncId(request);
  if (!id) return json({ error: 'no_key' }, 401);
  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: 'too_large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }
  if (!body || typeof body !== 'object' || !body.profile || typeof body.updatedAt !== 'number') return json({ error: 'bad_state' }, 400);
  const current = await env.SEAREADY.get('state:' + id, 'json');
  if (current && current.updatedAt > body.updatedAt) return json({ error: 'stale', state: current }, 409);
  await env.SEAREADY.put('state:' + id, text);
  return json({ ok: true, updatedAt: body.updatedAt });
}
