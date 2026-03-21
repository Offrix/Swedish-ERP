# FAS 2 OCR Review Verification

Detta dokument sammanfattar resultatet av `P2-03`.

## P2-03 OCR, klassificering och granskningsko

- OCR-kedjan skapar separat OCR-derivat och separat klassificeringsderivat fran originalversionen.
- Dokumenttyperna `supplier_invoice`, `expense_receipt`, `contract` och `unknown` klassificeras deterministiskt fran stubbad OCR-text och kanalmetadata.
- Kanalen styr confidence-trosklar for klassificering och falt, och under troskel skapas review task i explicit granskningsko.
- Manniskan kan claima, korrigera och godkanna review task utan att skriva over tidigare OCR-resultat.
- Omkorning skapar ny OCR-run med nya derivatversioner och bevarad versionskedja.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run verify:phase2:ocr
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

## Verifierat i repo

- fakturor, kvitton och avtal sarskiljs
- manniskan kan korrigera tolkningen via review task
- omkorning sparar ny OCR- och klassificeringsversion i stallet for mutation
- OCR-rutter kan stangas av med `PHASE2_OCR_REVIEW_ENABLED=false`
- review task och OCR-run ar sparbara per dokument och bolag

## Lokal databasverifiering

Foljande kommandon korde mot lokal Docker-stack:

```bash
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

Resultat efter lokal migrering och seed:

- `ocr_runs=2`
- `review_tasks=1`
- `ocr_threshold_channels=1`

## Disable And Rollback

- Satt `PHASE2_OCR_REVIEW_ENABLED=false` for att returnera `503` pa OCR- och review-rutter utan att stoppa resten av API-processen.
- Satt `PHASE2_COMPANY_INBOX_ENABLED=false` om ny e-postingest ska stoppas men befintliga dokument bevaras.
- Satt `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false` om hela FAS 2 ska stangas av inklusive underliggande dokumentarkiv.
- Databasrollback sker inte genom att skriva om historiska OCR-runs eller review tasks.
- Korrigeringar ska ske med framatrullande migrering, ny OCR-omkorning eller ny manuell klassificeringsversion.
