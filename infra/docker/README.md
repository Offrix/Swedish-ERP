# Local Docker Infra

Phase 0 local infrastructure profile.

## Services

- PostgreSQL 18.0
- Valkey 8.0.0
- MinIO for local object storage
- Mailpit for local outbound mail capture

## Start

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

## Stop

```bash
docker compose -f infra/docker/docker-compose.yml down -v
```

## Follow-up

- ClamAV/local malware scanning remains a later optional profile.
