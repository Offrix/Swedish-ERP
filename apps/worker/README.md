# Worker

Background worker runtime for async jobs, retry, replay and dead-letter handling.

## Start

```bash
pnpm --filter @swedish-erp/worker start
```

## Behavior

- Polls the async job store on a fixed interval.
- Claims jobs with a worker-scoped claim token and TTL.
- Records attempts, success, retry scheduling and dead-letter outcomes through `domain-core`.
- Defaults to an in-memory store for smoke tests and local lightweight runs.
- Uses Postgres automatically when `WORKER_JOB_STORE=postgres` or Postgres connection settings are present.
- Exits cleanly on `SIGINT`.
