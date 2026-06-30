# Resonance Lab API

Minimal NestJS service scaffold for the production backend path.

```bash
npm run api:build
npm run api:start
```

Endpoints:

- `GET /api/health`
- `GET /api/research`
- `POST /api/assistant/experiments`
- `POST /api/journal`

The current service is provider-ready and database-ready, but intentionally safe in demo mode:

- no secrets are required,
- `DATABASE_URL` switches status from demo echo to Postgres-ready,
- assistant responses keep evidence categories separate,
- no endpoint produces medical, diagnostic, treatment, or cure claims.
