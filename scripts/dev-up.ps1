param()

$ErrorActionPreference = "Stop"

$envFile = "infra/docker/.env"
if (-not (Test-Path $envFile) -and (Test-Path "infra/docker/.env.example")) {
  Copy-Item "infra/docker/.env.example" $envFile
}

docker compose --env-file $envFile -f infra/docker/docker-compose.yml up -d

