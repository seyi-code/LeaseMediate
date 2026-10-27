# Deployment – LeaseMediate

## Local production-like stack

```bash
docker compose -f infra/docker-compose.yml up -d
cd services/api && npx prisma migrate deploy && npx prisma generate
```

## Fly.io / Render

- Web (Next.js) + API (Fastify) + Python agent worker
- Managed Postgres + Redis
- Secrets: JWT_SECRET, OPENAI_API_KEY, DATABASE_URL, REDIS_URL, S3_*
- ClamAV as separate service or cloud scanner

## Hard requirements before public pilot

- Real malware scanning (no placeholder)
- Attorney-reviewed prompts
- Human mediator gate enforced
- Backups + PITR
- Observability (logs, metrics, traces)
- Multi-tenancy: every case scoped by organizationId from JWT
