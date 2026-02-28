# Vercel Operations

This is the quick-reference for deploying this app and managing Vercel environment variables.

## 1) First-time setup

```bash
# Install CLI (macOS)
npm i -g vercel

# Login and link this repo to a Vercel project
vercel login
vercel link
```

## 2) Deploy basics

```bash
# Preview deploy
vercel

# Production deploy
vercel --prod
```

## 2.1) Local "Vercel deployment" behavior

There are two local workflows and they source env vars differently:

### A) `next dev` (recommended for this repo)

- Uses local env files loaded by Next.js (`.env.local`, `.env`, etc.)
- Does **not** automatically pull from Vercel cloud settings
- Typical setup:

```bash
vercel env pull .env.local
npm run dev
```

### B) `vercel dev`

- Emulates Vercel runtime locally
- Automatically downloads your project's **Development** env vars into memory
- You usually do **not** need to run `vercel env pull` first

```bash
vercel dev
```

Rule of thumb:

- If you run `npm run dev`, keep `.env.local` up to date.
- If you run `vercel dev`, Vercel Development env is fetched automatically.

## 3) Environment variable lifecycle

### List vars

```bash
vercel env ls
```

### Add/update vars

```bash
# You will be prompted for value + environment (development/preview/production)
vercel env add NEXT_PUBLIC_CONVEX_URL
vercel env add OPENROUTER_WEBHOOK_SECRET
```

### Remove vars

```bash
vercel env rm OPENROUTER_WEBHOOK_SECRET
```

### Pull vars to local file

```bash
# Pull development env vars into .env.local
vercel env pull .env.local
```

You can also target a specific environment:

```bash
vercel env pull .env.local --environment=development
vercel env pull .env.preview --environment=preview
vercel env pull .env.production --environment=production
```

### Important note on "getting" values

Vercel does not expose secret values in plain text after creation in dashboard views. Treat `vercel env pull` as your operational way to sync values into local development.

## 4) Variables used by this project

| Variable                    | Public? | Required            | Used by                                       |
| --------------------------- | ------- | ------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`    | Yes     | Yes                 | Next.js server route -> Convex Http client    |
| `OPENROUTER_WEBHOOK_SECRET` | No      | Yes                 | Auth check for `POST /api/openrouter/webhook` |
| `CONVEX_DEPLOY_KEY`         | No      | Only for CI deploys | Convex production deployment automation       |

## 5) Recommended env mapping

- `development`: local/testing values
- `preview`: safe test values (not production DB unless intentional)
- `production`: live values used by `vercel --prod`

## 6) Verify after changes

```bash
# Confirm vars exist
vercel env ls

# Trigger a production deployment
vercel --prod
```

Then verify:

- `POST /api/openrouter/webhook` returns `401` without Authorization header
- OpenRouter Broadcast "Test Connection" succeeds for your production URL
- Sending a real OpenRouter trace writes an event row to `openrouterEvents`

## 7) Common gotchas

- Do not put secrets behind `NEXT_PUBLIC_`.
- If env vars change, redeploy for server runtime to pick them up reliably.
- The webhook URL must be publicly reachable (`https://<your-domain>/api/openrouter/webhook`).
