# FAS 2 Company Inbox Verification

Detta dokument sammanfattar resultatet av `P2-02`.

## P2-02 Foretagsinbox och mail ingestion

- Foretagsinboxen registrerar inboxkanaler per bolag med exakt adress, kanalcode, use case, tillatna MIME-typer och maximal bilagestorlek.
- Ratt bolag och kanal bestams fran mottagaradressen innan vidare behandling.
- Ramejl lagras som eget ingestmeddelande med message-id, avsandare, amne, storage key och auditspor.
- Varje giltig bilaga blir eget dokument med gemensam raw-mail-referens.
- Ogiltiga bilagor stoppas fore fortsatt behandling och markeras med tydlig quarantine reason.
- Dubbletter pa samma message-id och kanal skapar inte nya ingestposter eller nya dokument.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run verify:phase2:inbox
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

## Verifierat i repo

- flera bilagor hanteras korrekt och ger separata dokument
- message-id dedupliceras per bolag och inboxkanal
- felaktiga bilagor flaggas och gar till karantan
- inboxrutter kan stangas av med `PHASE2_COMPANY_INBOX_ENABLED=false`
- giltiga bilagor bevarar raw-mail-referensen i dokumentmetadata

## Lokal databasverifiering

Foljande kommandon korde mot lokal Docker-stack:

```bash
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

Resultat efter lokal migrering och seed:

- `inbox_channels=1`
- `email_ingest_messages=1`
- `email_ingest_attachments=2`

## Disable And Rollback

- Satt `PHASE2_COMPANY_INBOX_ENABLED=false` for att returnera `503` pa foretagsinboxrutter utan att stoppa resten av API-processen.
- Satt `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false` om hela FAS 2 ska stangas av inklusive underliggande dokumentarkiv.
- Databasrollback sker inte genom att skriva om historiska raw-mail eller dokument.
- Korrigeringar ska ske med framatrullande migrering och ny ingest eller omspelning fran bevarat raw-mail.
