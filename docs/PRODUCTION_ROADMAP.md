# Production readiness roadmap

## You cannot buy these systems as SaaS today

LeaseMediate is **your open-source repo** (https://github.com/seyi-code/LeaseMediate).
There is no storefront. Options: self-host, hire implementers, or commercialize later under a dual license.

## Software checklist

- [x] Multi-tenant schema + JWT auth + login UI
- [x] Human mediator gate
- [x] ClamAV + /health/ready
- [x] PDF upload UI + analyze-with-document
- [x] MIT LICENSE, backup script, e2e smoke
- [x] OTel bootstrap + Jaeger in Compose
- [ ] GitHub Actions CI
- [ ] LLM queue backpressure / cost caps

## Human / ops (cannot be coded away)

- [ ] Attorney-reviewed jurisdiction pack + prompts
- [ ] Pen test
- [ ] Production secrets manager
- [ ] Backup restore drill
- [ ] Closed pilot ToS with counsel

## Closed-pilot bar

Counsel-signed pack · ClamAV healthy · daily backups + one restore test · mediator uses human gate · no public "legal advice" claims
