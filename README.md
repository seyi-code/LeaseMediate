# LeaseMediate

**Production-oriented open-source Tenant-Landlord Mediation Portal**

https://github.com/seyi-code/LeaseMediate

Structured evidence → AI-assisted analysis → non-binding proposals with **mandatory human mediator review** before acceptance.

> Non-binding only. Not legal advice. Attorney review of prompts and jurisdiction packs is required before any pilot.

## Production foundation (current)

| Area | Status |
|------|--------|
| Multi-tenant Prisma schema | Done |
| JWT auth + register/login + roles | Done |
| Case routes on Prisma (org-scoped) | Done |
| Human mediator gate (accept blocked until review) | Done |
| ClamAV scanner (fail-closed in production) | Done |
| LangGraph agent mesh + Pydantic schemas | Done |
| Schema unit tests | Done |
| Jurisdiction pack format | Documented |
| Rate limiting | Done |
| Docker Compose (Postgres, Redis, MinIO) | Done |

## Still required before public pilot

1. Run real ClamAV (or cloud scanner) – do not ship with `CLAMAV_DISABLED=true` in production.
2. Attorney-reviewed jurisdiction packs and prompts.
3. Prisma migrations applied to managed Postgres.
4. OpenTelemetry exporters + log/metrics backend.
5. PDF upload → PyMuPDF → agent pipeline end-to-end.
6. Backups, retention policy, pen test.

## Quick start

```bash
docker compose -f infra/docker-compose.yml up -d
cd services/api && npm i && npx prisma generate && npx prisma migrate dev
# set JWT_SECRET, DATABASE_URL, OPENAI_API_KEY, REDIS_URL
npm run dev

cd ../agent && pip install -r requirements.txt && pytest
python -m worker   # or uvicorn main:app

cd ../../apps/web && npm i && npm run dev
```

Register via `POST /api/v1/auth/register`, store the JWT, then create cases.

## Human mediator gate

- `POST /api/v1/cases/:id/review` – MEDIATOR or ADMIN only
- `POST /api/v1/cases/:id/accept` – returns 403 `HUMAN_REVIEW_REQUIRED` until reviewed

## License

MIT recommended. Add LICENSE before public release.
