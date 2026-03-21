# Production deploy runbook

Detta dokument beskriver hur produkten ska deployas till produktion, hur miljöer sätts upp och hur rollback, backup och övervakning fungerar.

## Målarkitektur

- Cloudflare framför allt publikt
- AWS som primär driftplattform
- ECS Fargate för API och workers
- RDS PostgreSQL för primär databas
- S3 för dokument och exports
- Valkey/Redis-kompatibel tjänst för köer och cache
- Grafana Cloud + Sentry för observability
- Secrets Manager för hemligheter

## Miljöer

- `dev`
- `staging`
- `prod`

Varje miljö ska ha:
- egen databas
- egna buckets
- egna secrets
- egna webhook-URLs
- egna third-party credentials där leverantören stödjer detta

## Infrastruktur som kod

All produktion ska definieras i `infra/terraform/`.

Minst följande resurser:
- VPC
- subnät
- säkerhetsgrupper
- ECS cluster
- tjänster för API och workers
- RDS PostgreSQL
- ElastiCache/Valkey
- S3 buckets
- CloudWatch-loggrupper eller motsvarande
- IAM-roller
- backup-policy
- DNS records
- TLS-certifikat

## Första miljösättning

1. Skapa AWS-konto och baseline-IAM.
2. Skapa separat prod-konto om möjligt.
3. Skapa Cloudflare-zon och DNS.
4. Lägg in secrets i Secrets Manager.
5. Kör terraform plan.
6. Kör terraform apply.
7. Provisionera databas och cache.
8. Skapa buckets och retentionregler.
9. Konfigurera observability och alerts.
10. Sätt upp CI/CD-roll och deploy pipeline.

## CI/CD

Merge till huvudgren ska kunna:
- bygga images
- köra tester
- publicera images till container registry
- köra migrations i kontrollerad ordning
- deploya till staging
- kräva manuell godkännandegrind för prod

## Migrationsordning i produktion

1. backup av databas
2. kontroll av kompatibilitet
3. kör migrationsjobb
4. starta ny appversion
5. kör smoke tests
6. öppna trafik
7. verifiera metrics och felgrad

Migrationspolicy:
- migration ska vara framåtkompatibel när möjligt
- destruktiva migrationer ska vara tvåstegsmigrationer
- rollback-plan ska dokumenteras före körning

## Dokumentlagring i produktion

- S3 buckets ska ha versionshantering
- object lock eller legal hold-liknande strategi ska användas när det behövs
- kryptering ska vara aktiverad
- backup och återläsning ska testas
- access ska gå via tjänsteroller, inte statiska nycklar i kod

## Observability

### Minimiinstrumentering
- request rate
- error rate
- latency
- queue depth
- failed jobs
- DB connections
- slow queries
- storage growth
- OCR failure rate
- Peppol delivery failures
- AGI/HUS/årsrapport-submission failures

### Alerts
- API 5xx över tröskel
- kö växer för snabbt
- dokumentingest fastnar
- backup misslyckas
- databaslagring börjar ta slut
- inloggnings- eller säkerhetsavvikelser
- submissionfel i myndighetsflöden

## Rollback

Det måste finnas två sorters rollback:

### Application rollback
- rulla tillbaka container-image
- stoppa feature flag
- disable specifik integration

### Data rollback
- punktåterställning av databas
- återställning av objektlagring
- replay av outbox eller köer när det är säkert

Data rollback får aldrig ske tyst i produktion utan incidentnummer och godkännande.

## Backup och återställning

- dagliga fulla backuper
- PITR för databas
- objektlagringsversionering
- kvartalsvis restore-test till isolerad miljö
- dokumenterat RTO/RPO

## Go-live checklista

- [ ] alla kritiska tester gröna
- [ ] alla secrets satta
- [ ] DNS och certifikat gröna
- [ ] backup-policy aktiv
- [ ] observabilitypaneler på plats
- [ ] support- och incidentkanal bemannad
- [ ] pilotkunders migrering verifierad
- [ ] rollback-plan signerad

## Incident-first regler

- stäng av automation före manuella databasingrepp
- skriv incidentlogg innan hotfix i prod
- skapa regressionstest efter incident
- uppdatera relevant runbook och compliance-dokument om incidenten avslöjar regellucka

## Exit gate

- [ ] Staging och prod kan deployas reproducerbart.
- [ ] Backup och restore har testats.
- [ ] Observability täcker alla kritiska domäner.
- [ ] Rollback är övad, inte bara dokumenterad.
