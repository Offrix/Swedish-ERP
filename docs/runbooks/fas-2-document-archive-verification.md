> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 2 Document Archive Verification

Detta dokument sammanfattar resultatet av `P2-01`.

## P2-01 Dokumentarkiv och metadata

- Dokumentarkivet lagrar dokumentmetadata separat fran dokumentversioner och dokumentlankar.
- Originalfil lagras som egen versionstyp och far inte ersattas av derivat.
- Derivatversioner maste peka pa versionen de harletts fran.
- Varje dokumentversion bar hash, filstorlek, MIME-typ, storage key och skapad tid.
- Dokumentlankar ar explicita och versionsoberoende.
- Dubbletter upptacks via hash och kallreferens utan att legitim ny version blockeras.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run verify:phase2:archive
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

## Verifierat i repo

- original och derivat skiljs at
- export av dokumentkedja fungerar
- dubbletter upptacks
- audit-spar kan foljas fran dokumentmottagning till lankat affarsobjekt
- dokumentrutter kan stangas av med `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false`

## Lokal databasverifiering

Foljande kommandon korde mot lokal Docker-stack:

```bash
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

Resultat efter lokal migrering och seed:

- `documents=2`
- `document_versions=3`
- `document_links=1`

## Disable And Rollback

- Satt `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false` for att returnera `503` pa dokumentarkivrutter utan att stoppa resten av API-processen.
- Databasrollback sker inte genom omskrivning av historik.
- Korrigeringar ska ske med framatrullande migrering eller nya dokumentversioner.

