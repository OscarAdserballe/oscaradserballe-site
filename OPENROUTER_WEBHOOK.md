# OpenRouter Webhook Ingestion

This project now uses a thin telemetry pipeline:

- Open WebUI / OpenCode call OpenRouter
- OpenRouter Broadcast pushes OTLP JSON to this app
- This app ingests and stores normalized events in Convex

No direct Postgres reads are used.

## Architecture

```mermaid
flowchart LR
  A[Open WebUI] --> OR[OpenRouter]
  B[OpenCode] --> OR
  OR --> WB[Broadcast Webhook]
  WB --> API[/api/openrouter/webhook]
  API --> MUT[convex openrouterEvents:ingestMany]
  MUT --> DB[(openrouterEvents)]
```

## What We Implemented

1. `POST /api/openrouter/webhook` endpoint with bearer auth
2. OTLP span parsing to minimal event model
3. Idempotent upsert by `eventId = traceId:spanId`
4. Convex table `openrouterEvents` with indexes

## Files

- Route: `app/api/openrouter/webhook/route.ts`
- Convex mutation/query: `convex/openrouterEvents.ts`
- Convex schema: `convex/schema.ts`
- Env example: `.env.example`

## Required Environment Variables

- `NEXT_PUBLIC_CONVEX_URL`
- `OPENROUTER_WEBHOOK_SECRET`

Set both in Vercel for Preview and Production.

## OpenRouter Dashboard Setup

In OpenRouter -> Settings -> Observability -> Broadcast -> New Webhook:

- Name: `Convex Webhook`
- URL: `https://<your-production-domain>/api/openrouter/webhook`
- Method: `POST`
- Headers:

```json
{
  "Authorization": "Bearer <OPENROUTER_WEBHOOK_SECRET>"
}
```

- Privacy Mode: enable if you do not need prompt/completion content
- Sampling Rate: `1` initially
- API Key Filter: select the keys/sources you want included

Then run:

1. `Test Connection`
2. `Send Trace`
3. Make one real request from each producer (Open WebUI, OpenCode)

## Verification (Deployed Runtime)

1. Missing/invalid auth returns `401` from webhook route
2. OpenRouter test connection passes
3. Real trace ingestion increases rows in `openrouterEvents`

You can inspect rows in the Convex dashboard data explorer for `openrouterEvents`.

## Operational Notes

- Delivery is asynchronous and may retry; ingestion is idempotent.
- Keep endpoint fast: parse, upsert, return `200`.
- Use separate OpenRouter API keys per source for cleaner attribution.
