# Sea Ready

A 26-week fitness tracker for getting to the Royal Navy Pre-Joining Fitness Test standard. It runs on laptop, iPhone and iPad.

- **Plan**: a 2-week rotation repeated 13 times (Base → Build → Peak → Sharpen). Paces, reps and volume adapt to your bleep tests, synced runs, training load and how many sessions you complete.
- **Meals**: daily meals with portions scaled to that day's training.
- **Quick 15**: a 15-minute session with a full-screen timer, picked to target your biggest gap.
- **Bleep test**: the 20 m multi-stage fitness test (UK protocol) with audio beeps, voice level calls and a missed-line counter.
- **Sync**: Strava sign-in, Apple Health export import, and sync between your devices.

```
wrangler.jsonc     Cloudflare Workers config
src/worker.js      Worker entry: serves /public, routes /api/*
public/            the website (everything Cloudflare serves)
  index.html       the whole app
  sw.js            offline support
  manifest.webmanifest, icons/   "Add to Home Screen" support
  _headers         security / caching headers
functions/api/     the API route handlers (also usable as Pages Functions)
  health.js        tells the app which features are configured
  state.js         saves / loads your data for cross-device sync
  strava/          Strava sign-in (OAuth) and activity download
lib/server.js      shared helpers for the functions
```

The site works with no backend at all: your data stays in that browser. The backend adds Strava and device sync.

---

## 1. Put it on GitHub

1. Create an **empty** repository on github.com, for example `sea-ready`. Make it private if you like. Don't add a README.
2. In this folder:

```bash
git remote add origin https://github.com/<your-username>/sea-ready.git
git branch -M main
git push -u origin main
```

(The repo is already initialised with a first commit.)

## 2. Deploy on Cloudflare (Workers)

This repo deploys as a **Cloudflare Worker with static assets**. `wrangler.jsonc` tells Cloudflare to publish only the `public/` folder and to run `src/worker.js` for the `/api/*` routes.

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Import a repository**, and pick `sea-ready`.
2. Leave the build command empty. The deploy command is `npx wrangler deploy`, which is the default.
3. The Worker's name in Cloudflare must match `"name"` in `wrangler.jsonc` (`sea-ready`). If you named it something else, change that line to match.
4. To use your own domain: Worker → **Settings → Domains & Routes → Add → Custom domain**, e.g. `fitness.george-b.com`.

Every `git push` to `main` now redeploys automatically.

## 3. Device sync (KV storage)

Nothing to do. On the first deploy, Wrangler creates a KV namespace for the `SEAREADY` binding automatically.

Then, on your first device, go to **Profile → Sync between devices → Turn on sync**. Copy the key. On each other device, open the site, go to Profile and paste the key into **Link this device**. The key works as the password to your data, so keep it private. The server only stores a hash of it.

## 4. Connect Strava

1. Go to <https://www.strava.com/settings/api> and create an API application:
   - Website: your site URL
   - **Authorization Callback Domain**: your domain with no `https://`, e.g. `fitness.george-b.com`
2. Copy the **Client ID** and **Client Secret**.
3. In the Worker → **Settings → Variables and Secrets → Add**, add both as type **Secret**:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
4. Redeploy: **Deployments → Retry/redeploy**, or push a commit.
5. In the app: **Sync → Connect Strava**.

New Strava API apps allow one connected athlete (you), which is fine for personal use.

To check the setup, open `https://<your-domain>/api/health`. It should show `"kv":true,"strava":true`.

## 5. Apple Fitness / Apple Watch

Apple doesn't let websites read Health data, so there are two options:

- **Easiest:** in the Strava iPhone app, go to **Settings → Applications, Services and Devices → Health** and turn on sending workouts to Strava. Your Apple Watch workouts then arrive through the Strava sync.
- **Import:** Health app → your photo → **Export All Health Data** → save `export.zip` → **Sync → Apple** in the app. This brings in workouts and Apple Watch VO₂ max readings. The file is read on your device and only the workout summaries are kept.

## 6. Install it on iPhone / iPad

Open your site in **Safari** → **Share** → **Add to Home Screen**. It opens full-screen like an app and works offline, so you can do a bleep test on a field without signal.

For the bleep test, turn **silent mode off** and the volume up.

---

## Local development (optional)

```bash
npm install
cp .dev.vars.example .dev.vars   # add your Strava keys
npm run dev                      # http://localhost:8787
```

For Strava locally, add `localhost` as a callback domain on your Strava app.

## The standard

From 1 October 2026 the Royal Navy Pre-Joining Fitness Test is the multi-stage fitness test (level 6.6 for general entry, 10.5 for divers, who also need 30 press-ups, 40 sit-ups and 4 pull-ups), an isometric mid-thigh pull and a seated 4 kg medicine ball throw. Check the current standard on the [Royal Navy website](https://www.royalnavy.mod.uk/careers/joining-process/pre-joining-fitness-test) before your test.

This is a personal training tool. It is not affiliated with or endorsed by the Royal Navy or the Ministry of Defence. VO₂ max and level projections are estimates.
