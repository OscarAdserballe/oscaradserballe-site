# Open WebUI on Railway

Deploy Open WebUI with PostgreSQL + pgvector on Railway using the CLI.

## Prerequisites

- [Railway CLI](https://docs.railway.com/guides/cli) installed
- [OpenRouter API key](https://openrouter.ai/keys)

```bash
# Install Railway CLI (macOS)
brew install railway
```

## Deploy

```bash
# 1. Login to Railway
railway login

# 2. Create a new project
railway init

# 3. Add PostgreSQL with pgvector (template includes the extension)
railway deploy -t 3jJFCA

# 4. Add Open WebUI service from Docker image
railway add -s open-webui -i ghcr.io/open-webui/open-webui:main

# 5. Link to the open-webui service (for subsequent commands)
railway service link open-webui

# 6. Set environment variables (replace $OPENROUTER_API_KEY with your actual key or export it)
railway variable set \
  OPENAI_API_BASE=https://openrouter.ai/api/v1 \
  OPENAI_API_KEY=$OPENROUTER_API_KEY \
  "WEBUI_SECRET_KEY=$(openssl rand -hex 32)" \
  'DATABASE_URL=postgresql://${{pgvector.PGUSER}}:${{pgvector.PGPASSWORD}}@${{pgvector.PGHOST_PRIVATE}}:${{pgvector.PGPORT_PRIVATE}}/${{pgvector.PGDATABASE}}' \
  VECTOR_DB=pgvector \
  'PGVECTOR_DB_URL=postgresql://${{pgvector.PGUSER}}:${{pgvector.PGPASSWORD}}@${{pgvector.PGHOST_PRIVATE}}:${{pgvector.PGPORT_PRIVATE}}/${{pgvector.PGDATABASE}}' \
  RAG_EMBEDDING_MODEL_AUTO_UPDATE=false \
  -s open-webui

# 7. Add custom domain (or omit the domain to get a railway.app subdomain)
railway domain chat.oscaradserballe.com -s open-webui
# This outputs DNS records - add the CNAME to your DNS provider
```

## Environment Variables

| Variable                          | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `OPENAI_API_BASE`                 | OpenRouter API endpoint (`https://openrouter.ai/api/v1`)       |
| `OPENAI_API_KEY`                  | Your OpenRouter API key (starts with `sk-or-`)                 |
| `WEBUI_SECRET_KEY`                | Random secret for session encryption                           |
| `DATABASE_URL`                    | PostgreSQL connection string (must use `postgresql://` prefix) |
| `VECTOR_DB`                       | Vector database type (`pgvector`)                              |
| `PGVECTOR_DB_URL`                 | pgvector connection string (same as DATABASE_URL)              |
| `RAG_EMBEDDING_MODEL_AUTO_UPDATE` | Set to `false` to prevent OOM from large model downloads       |

## Reference Variables

Railway uses `${{Service.VARIABLE}}` syntax to reference variables from other services. The `${{pgvector.DATABASE_URL}}` automatically injects the database connection string from the pgvector template.

## pgvector Extension

The pgvector template (`3jJFCA`) includes the vector extension pre-installed. Open WebUI enables it automatically on startup.

## Troubleshooting

| Issue                                | Cause                                                       | Fix                                                         |
| ------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------- |
| OOM / keeps restarting               | Embedding model download (~800MB) exceeds memory            | `RAG_EMBEDDING_MODEL_AUTO_UPDATE=false` (already set above) |
| `sqlalchemy.dialects:postgres` error | SQLAlchemy needs `postgresql://` not `postgres://`          | Use component-based URL (already set above)                 |
| `extension "vector" not available`   | Used `railway add -d postgres` instead of pgvector template | Use `railway deploy -t 3jJFCA`                              |

## Useful Commands

```bash
# View logs
railway logs

# Open the Railway dashboard
railway open

# SSH into the service
railway shell

# Check service status
railway status

# Tear down everything
railway down
```

## Updating

Railway auto-deploys when the source image updates. To manually redeploy:

```bash
railway redeploy
```

---

This document covers Open WebUI deployment only.
For OpenRouter telemetry ingestion into this app, see `OPENROUTER_WEBHOOK.md`.
