# LeaseMediate

**Open-source Tenant-Landlord Mediation Portal** (production-oriented foundation)

LeaseMediate helps tenants and landlords resolve disputes faster with structured evidence submission, AI-assisted analysis, and non-binding resolution proposals. Human review is mandatory before any proposal is treated as final.

> **Legal notice**: Non-binding proposals only. Not legal advice. Requires jurisdiction-specific attorney review before any pilot or production use.

## Repositories

- This repo: https://github.com/seyi-code/LeaseMediate

## What is production-ready in this foundation

- Multi-tenant Postgres schema (Prisma) – Organization → Users → Cases → Documents → Audit
- JWT auth + role guards (TENANT / LANDLORD / MEDIATOR / ADMIN)
- Case repository that always scopes by organizationId
- Malware scan interface (ClamAV / cloud) – **replace placeholder before public use**
- LangGraph agent mesh with Instructor + Pydantic schemas
- Unit tests for schemas
- Docker Compose for local infra
- Deploy notes (Fly / Render / VPS)

## What you still must do for a real pilot

1. Wire real ClamAV or cloud scanner (no placeholder).
2. Attorney review of prompts + jurisdiction rule packs.
3. Enforce human mediator approval in UI + API before "accepted".
4. Run Prisma migrations against real Postgres.
5. Add OpenTelemetry + log shipping.
6. Pen test + rate-limit tuning.
7. Backups + retention policy.

## Quick start

```bash
docker compose -f infra/docker-compose.yml up -d
cd services/api && npm i && npx prisma generate && npx prisma migrate dev
cd ../agent && pip install -r requirements.txt
# set OPENAI_API_KEY, JWT_SECRET, DATABASE_URL in .env
```

See `deploy/README.md` and `docs/` for architecture and legal notes.

## License

MIT recommended; add LICENSE before public release.
