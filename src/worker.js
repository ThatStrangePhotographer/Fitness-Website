// Worker entry point: serves the site from /public and runs the /api routes.
// The route handlers live in /functions so the same code also works as Cloudflare Pages Functions.
import * as health from '../functions/api/health.js';
import * as state from '../functions/api/state.js';
import * as stravaStart from '../functions/api/strava/start.js';
import * as stravaCallback from '../functions/api/strava/callback.js';
import * as stravaStatus from '../functions/api/strava/status.js';
import * as stravaActivities from '../functions/api/strava/activities.js';
import * as stravaDisconnect from '../functions/api/strava/disconnect.js';

const ROUTES = {
  '/api/health': health,
  '/api/state': state,
  '/api/strava/start': stravaStart,
  '/api/strava/callback': stravaCallback,
  '/api/strava/status': stravaStatus,
  '/api/strava/activities': stravaActivities,
  '/api/strava/disconnect': stravaDisconnect,
};

const json = (data, status) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/api/')) {
      const mod = ROUTES[path];
      if (!mod) return json({ error: 'not_found' }, 404);
      const m = request.method.toUpperCase();
      const handler = mod['onRequest' + m[0] + m.slice(1).toLowerCase()] || mod.onRequest;
      if (!handler) return json({ error: 'method_not_allowed' }, 405);
      try {
        return await handler({ request, env, ctx, waitUntil: (p) => ctx.waitUntil(p) });
      } catch (e) {
        return json({ error: 'server_error', message: String((e && e.message) || e) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
