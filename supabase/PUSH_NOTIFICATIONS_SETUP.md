# Push notifications (workers)

Workers receive push alerts when:

- A job is **assigned** to them
- A **job is updated** (status, schedule, title, etc.)
- A **note is added** on their job (by someone else)

Admins do not register for push — only workers on the mobile app.

## 1. Database

Run in Supabase SQL Editor:

`supabase/fix-push-notifications.sql`

Includes `REPLICA IDENTITY FULL` on `jobs` so UPDATE webhooks send a complete `old_record` (required for edit notifications).

## 2. Expo project ID (mobile)

`send-worker-push` is **not** a PowerShell command — it is the Supabase Edge Function you deploy later (see section 3).

### Option A — No EAS CLI (easiest)

1. Go to [expo.dev](https://expo.dev) and sign in.
2. **Create a project** (e.g. name `tradeflow-mobile`).
3. Open the project → **Project settings** → copy the **Project ID** (UUID).
4. Paste it in `mobile/app.json` → `extra.eas.projectId` (must be a **UUID from Expo**, not your Supabase project ref).
5. In `mobile` folder run: `npm install` (for push libraries only).

### Option B — EAS CLI

From the **repo root** or `mobile` folder in PowerShell:

```powershell
cd mobile
npm install
npx eas-cli init
```

Or:

```powershell
npm run eas:init
```

If `npx eas init` fails, always use **`npx eas-cli init`** (full package name).

After init, confirm `app.json` has your project ID under `extra.eas.projectId`.

### Android FCM (required — fixes “push credentials missing”)

Remote push on Android **does not work** until Firebase Cloud Messaging is linked to your Expo project.

**A. Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com))

1. Create a project (or use an existing one).
2. **Add app** → **Android** → package name must be exactly:  
   `com.tradeflow1.tradeflow` (from `mobile/app.json`).
3. Download **`google-services.json`** → save as:  
   `mobile/google-services.json`
4. **Project settings** → **Service accounts** → **Generate new private key** (JSON).  
   Keep this file private (do not commit).

**B. Expo** ([expo.dev](https://expo.dev) → **tradeflow-mobile**)

1. **Project settings** → **Credentials** → **Android**.
2. **FCM V1 service account key** → upload the Firebase service account JSON from step A4.
3. Confirm credentials show as configured.

**C. Rebuild the dev app** (credentials are baked into the native build)

```powershell
cd mobile
$env:EAS_NO_VCS = "1"
npm run eas:build:dev:android
```

Install the new `.apk`, sign in as **worker**, tap **Register push alerts**, then confirm a row in Supabase **`push_tokens`**.

CLI alternative: `npx eas-cli credentials` → Android → set up **FCM V1**.

### Development build (push on a real phone)

Expo Go does **not** support remote push. You need a dev build:

```powershell
cd mobile
npx eas-cli build --profile development --platform android
```

Or: `npm run eas:build -- --profile development --platform android`

## 3. Deploy Edge Function (Supabase)

The `supabase` command only works **after** the Supabase CLI is installed. Pick **A** (Dashboard, no install) or **B** (CLI).

### Option A — Supabase Dashboard (no CLI)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Edge Functions**.
2. **Create a new function** named exactly: `send-worker-push`
3. Replace the default code with the full contents of:
   `supabase/functions/send-worker-push/index.ts` in this repo (copy/paste in the editor).
4. **Deploy** the function.
5. Under **Edge Functions → Secrets**, add only:
   - `PUSH_WEBHOOK_SECRET` — any long random string you make up (e.g. a password generator)
   - Optional: `SERVICE_ROLE_KEY` — your **Secret** API key (`sb_secret_...`) from **Project Settings → API**, only if pushes fail and logs show auth errors. Names starting with `SUPABASE_` cannot be added manually (Supabase injects `SUPABASE_URL` and usually `SUPABASE_SERVICE_ROLE_KEY` automatically).
6. Under function **Settings**, turn **off** “Enforce JWT verification” (so database webhooks can call it with your secret header instead).

Your function URL will be:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-worker-push`

Use that URL in section 4 (webhooks). Header: `x-push-secret` = same value as `PUSH_WEBHOOK_SECRET`.

### Option B — Supabase CLI (PowerShell)

Install once:

```powershell
npm install -g supabase
```

Close and reopen PowerShell, then:

```powershell
cd "C:\Users\Naveed's PC\tradeflow-web"
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-worker-push --no-verify-jwt
```

`YOUR_PROJECT_REF` is the ID in your project URL (e.g. `gdhcanxkffzqfgoiuwji` from `https://xxxx.supabase.co`).

**Without installing globally**, from the repo root:

```powershell
cd "C:\Users\Naveed's PC\tradeflow-web"
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest functions deploy send-worker-push --no-verify-jwt
```

Set secrets in Dashboard → Edge Functions → `send-worker-push` → **Secrets** (same as Option A).

| Secret | Value |
|--------|--------|
| `PUSH_WEBHOOK_SECRET` | Long random string you create (required) |
| `SERVICE_ROLE_KEY` | Secret API key (`sb_secret_...`) — only if auto-injected service role is not enough |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Reserved `SUPABASE_*` names — provided by Supabase; do not add manually |

## 4. Database Webhooks

Dashboard → **Database** → **Webhooks** → **Create webhook**

### Recommended: type **Supabase Edge Functions**

Create **two or three** webhooks (all target `send-worker-push`):

| Webhook | Table | Event | Worker gets notified when… |
|---------|--------|--------|----------------------------|
| A | `jobs` | **Update** | Status, assignment, schedule, or title changes |
| B | `job_notes` | **Insert** | Someone adds a note on their job |
| C (recommended) | `jobs` | **Insert** | New job created already assigned to them |

Custom **HTTP headers are not sent** by this integration. The function accepts these calls automatically.

Notifications are delivered **in the background** via Expo/FCM when the worker has a row in `push_tokens` (dev build, not Expo Go).

## 5. Test

1. Sign in as worker on a physical device with the dev build.
2. Allow notifications when prompted.
3. As admin, assign or update a job for that worker, or add a note.
4. Worker should receive a push within a few seconds.

## Troubleshooting

- **`shutdown` / `EarlyDrop` in Logs** — normal after the function finishes; not an error. Check **Invocations (200)** and **Logs** for `send-worker-push complete` / `Expo push sent`.
- **`queued: 0` in logs** — job had no assignee, worker changed their own job, or webhook had nothing to send.
- **`sent: 0`** — no row in **`push_tokens`** for that worker, or wrong `user_id`.
- **Expo `DeviceNotRegistered`** — reinstall dev build, sign in as worker again, allow notifications.
- **No token in `push_tokens`** — worker must sign in on device; check Metro console for `Push token registered`.
- **200 but no banner on phone** — [expo.dev](https://expo.dev) → project → **Credentials → Android → FCM** must be configured; test with app in **background**.
- **Invalid project ID** — run `eas init` and update `app.json`.
- **Webhook 401** — For **HTTP Request** webhooks, `x-push-secret` must match `PUSH_WEBHOOK_SECRET`. For **Supabase Edge Functions** webhooks, redeploy `send-worker-push` after pull (pg_net sends no custom headers). Manual **Test** still needs the header.
- **Expo Go** — remote push does not work; use a development build.
