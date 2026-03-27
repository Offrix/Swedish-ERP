> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 3 Ledger Foundation Verification

Detta dokument sammanfattar resultatet av `3.1`.

## 3.1 Ledger-schema och verifikationsmotor

- DSAM-kontoplanen seedas fran compliance section 24.2 utan handskriven specialvariant.
- Voucher series `A-Z` installeras per bolag och nummer okar deterministiskt inom serie.
- Journal entry skapas som `draft`, valideras separat och bokas forst efter balanskontroll.
- Journal lines maste vara ensidiga och varje verifikation maste balansera debet och kredit exakt.
- Importerad historik markeras utan att skapa eget dolt source-beteende utanfor ledgern.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run verify:phase3:ledger
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

## Verifierat i repo

- DSAM-konton kan installeras for ett bolag och listas via API
- A-Z-serier finns och kan listats via API
- samma idempotency key ger samma journal entry i stallet for nytt verifikat
- obalanserad verifikation nekas vid validering
- importerad historik markeras med `importedFlag`
- ledger-rutter kan stangas av med `PHASE3_LEDGER_ENABLED=false`

## Lokal databasverifiering

Foljande kommandon ska koras mot lokal Docker-stack:

```bash
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

Resultat som ska kunna verifieras efter lokal migrering och seed:

- demobolaget har full DSAM-kontoplan
- demobolaget har voucher series `A-Z`
- demojournal `phase3-demo-manual-001` finns som bokad
- demojournal `phase3-demo-import-001` finns som bokad och importerad

## Disable And Rollback

- Satt `PHASE3_LEDGER_ENABLED=false` for att returnera `503` pa ledger-rutter utan att stoppa resten av API-processen.
- Databasrollback sker inte genom att skriva om bokade journal entries eller linehistorik.
- Korrigeringar ska ske med ny framatrullande migrering eller ny korrigeringsverifikation i senare fas.

