> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 3 Ledger Rules Verification

Detta dokument sammanfattar resultatet av `3.2`.

## 3.2 Dimensioner, perioder och bokforingsregler

- Ledgern exponerar projekt, kostnadsstalle och affarsomrade som deterministiska dimensioner per bolag.
- Projektkostnadsregler valideras innan journalen kan sparas eller bokas.
- Perioder kan soft-lockas och hard-closeas med auditspår och dual control for senior finance-beslut.
- Draft- och validated-journaler tekniskt fryses nar perioden lasses.
- Korrigering och reversal sker som nya immutabla verifikationer med lankar till originalet.
- Hard-closed perioder rattas i nasta oppna period om perioden inte har reopenats.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run verify:phase3:ledger
pnpm run verify:phase3:ledger:rules
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

## Verifierat i repo

- `GET /v1/ledger/accounting-periods` listar perioder med lock-status
- `GET /v1/ledger/dimensions` listar projekt, kostnadsstallen och affarsomraden
- låsta perioder blockerar ny mutation
- dual control krav finns for hard close och reopen
- correction och reversal skapar nya verifikationer i stallet for att skriva over historik
- correction efter hard close flyttas till nasta oppna period
- projektkostnadsrader nekas om obligatorisk projektdimension saknas

## Lokal databasverifiering

Foljande kommandon ska koras mot lokal Docker-stack:

```bash
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

Resultat som ska kunna verifieras efter lokal migrering och seed:

- `ledger_dimension_values` innehaller demo-dimensioner for projekt, kostnadsstalle och affarsomrade
- bokforingsperioden `2026-01-01` till `2026-12-31` kan hard-closeas med lockmetadata
- demojournal `phase3-demo-reversal-001` finns som full reversal
- demojournal `phase3-demo-correction-001` finns som correction i efterfoljande oppen period

## Disable And Rollback

- Satt `PHASE3_LEDGER_ENABLED=false` for att returnera `503` pa ledger-rutter utan att stoppa resten av API-processen.
- Periodlåsning eller correction ska inte rollas tillbaka genom att skriva over bokad historik.
- Fel i denna fas korrigeras med ny framatrullande migrering eller ny korrigeringsverifikation.

