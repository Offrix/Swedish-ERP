# Worker

Minimal background worker baseline.

## Start

```bash
pnpm --filter @swedish-erp/worker start
```

## Behavior

- Starts a heartbeat loop.
- Exits cleanly on `SIGINT`.
