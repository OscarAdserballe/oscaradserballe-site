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

| Variable                         | Description                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `OPENAI_API_BASE`                | OpenRouter API endpoint (`https://openrouter.ai/api/v1`)       |
| `OPENAI_API_KEY`                 | Your OpenRouter API key (starts with `sk-or-`)                 |
| `WEBUI_SECRET_KEY`               | Random secret for session encryption                           |
| `DATABASE_URL`                   | PostgreSQL connection string (must use `postgresql://` prefix) |
| `VECTOR_DB`                      | Vector database type (`pgvector`)                              |
| `PGVECTOR_DB_URL`                | pgvector connection string (same as DATABASE_URL)              |
| `RAG_EMBEDDING_MODEL_AUTO_UPDATE`| Set to `false` to prevent OOM from large model downloads       |

## Reference Variables

Railway uses `${{Service.VARIABLE}}` syntax to reference variables from other services. The `${{pgvector.DATABASE_URL}}` automatically injects the database connection string from the pgvector template.

## pgvector Extension

The pgvector template (`3jJFCA`) includes the vector extension pre-installed. Open WebUI enables it automatically on startup.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| OOM / keeps restarting | Embedding model download (~800MB) exceeds memory | `RAG_EMBEDDING_MODEL_AUTO_UPDATE=false` (already set above) |
| `sqlalchemy.dialects:postgres` error | SQLAlchemy needs `postgresql://` not `postgres://` | Use component-based URL (already set above) |
| `extension "vector" not available` | Used `railway add -d postgres` instead of pgvector template | Use `railway deploy -t 3jJFCA` |

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

## Local Development

For local development, use docker-compose:

```bash
cp .env.example .env
# Edit .env with your values
docker-compose up
```

## Updating

Railway auto-deploys when the source image updates. To manually redeploy:

```bash
railway redeploy
```

---

## Data Export & Analysis Scripts

Scripts to export your conversations and generate weekly recaps. Your data, your control.

### Setup

```bash
cd scripts
pip install -r requirements.txt
```

### Get Database URL

First, get your database connection string from Railway:

```bash
railway variable list -s pgvector
# Copy the DATABASE_URL (or construct it from the components)
```

### Export Chats

Export all your conversations to JSON or Markdown:

```bash
# Export all chats to JSON
DATABASE_URL='postgresql://...' python export_chats.py --output chats.json

# Export last 7 days to markdown
DATABASE_URL='postgresql://...' python export_chats.py --days 7 --format markdown --output weekly.md

# Export specific date range
DATABASE_URL='postgresql://...' python export_chats.py --from 2025-01-01 --to 2025-01-31

# Filter by user ID
DATABASE_URL='postgresql://...' python export_chats.py --user your-user-id
```

### Weekly Recap

Generate a summary of your AI conversations:

```bash
# Generate recap for last 7 days
DATABASE_URL='postgresql://...' python weekly_recap.py

# Custom period (14 days)
DATABASE_URL='postgresql://...' python weekly_recap.py --days 14

# Save to file
DATABASE_URL='postgresql://...' python weekly_recap.py --output recap.md

# Output raw stats as JSON
DATABASE_URL='postgresql://...' python weekly_recap.py --json
```

The weekly recap includes:
- Total conversations and messages
- Daily activity breakdown
- Models used
- Topics discussed (from chat titles)
- Sample questions you asked

### Pro Tips

**Use Railway's public URL for external access:**
```bash
# Get the public DATABASE_URL for external connections
railway variable list -s pgvector | grep DATABASE_URL
# Use the non-PRIVATE one (with proxy host)
```

**Set up a cron job for weekly recaps:**
```bash
# Add to crontab (runs every Sunday at 9am)
0 9 * * 0 DATABASE_URL='...' python /path/to/weekly_recap.py --output ~/recaps/$(date +\%Y-\%W).md
```
