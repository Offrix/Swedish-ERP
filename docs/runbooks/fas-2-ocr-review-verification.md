> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 2 OCR Review Verification

Detta dokument sammanfattar resultatet av `P2-03`.

## P2-03 OCR, klassificering och granskningsko

- OCR-kedjan skapar separat OCR-derivat och separat klassificeringsderivat fran originalversionen.
- Dokumenttyperna `supplier_invoice`, `expense_receipt`, `contract` och `unknown` klassificeras deterministiskt fran kanalmetadata, dokumentfingerprint, filnamnssignaler, heuristik och providerutfall.
- Kanalen styr confidence-trosklar for klassificering och falt, och under troskel skapas review task i explicit granskningsko.
- Manniskan kan claima, korrigera och godkanna review task utan att skriva over tidigare OCR-resultat.
- Omkorning skapar ny OCR-run med nya derivatversioner och bevarad versionskedja.
- OCR-stubben ar ersatt av Google Document AI-baserad provideradapter med explicita profiler for fakturaparsering, generell OCR och strukturerad dokumenttolkning.
- OCR-run bär nu providerref, processing mode, operation ref, callback mode, page count, processor limits, quality score och text confidence.
- Langre OCR-korningar kan ga via async callback-route i stallet for att latenstesta som synkrona lokala stubbar.
- Low-confidence eller lag providerkvalitet leder till blockerande review i stallet for att slappa igenom forslaget.
- Omkorning supersederar tidigare OCR-run i stallet for att mutera historiskt resultat.
- Klassificeringskedjan materialiserar nu canonical `ExtractionProjection` med `extractionFamilyCode`, `candidateObjectType`, `documentRoleCode`, `targetDomainCode`, `normalizedFieldsJson`, `attachmentRefs` och `payloadHash`.
- OCR-falt kan nu auto-derivera downstream-kandidater for AP, travel, benefits, payroll-support och review-center attachments nar manuell line input saknas.
- Person- och finance-kansliga dokument stoppas i review- eller downstream-gating i stallet for att slinka vidare som vanliga kostnadsunderlag.

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
- providerkedjan valjer nu sync eller async beroende pa profil och page count
- callback-baserad OCR-completion finns som separat route
- page limits och processorprofiler ar explicit spårbara
- lag provider confidence eller quality skapar reviewkrav
- OCR-rutter kan stangas av med `PHASE2_OCR_REVIEW_ENABLED=false`
- review task och OCR-run ar sparbara per dokument och bolag
- extraction projections ar sparbara per klassificeringscase och refererar tillbaka till dokument och OCR-run
- AP-kedjan blockerar nu travel- och andra personkopplade klassificeringsfall i stallet for att slappa igenom dem som vanliga leverantorsfakturor

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

## Providerkedja och operationskrav

- Primar OCR-provider ar Google Document AI via adapter i integrationslagret.
- `invoice_parse` anvands for leverantorsfakturor och kvitton nar signaler tyder pa faktura-/inkopsdokument.
- `generic_document_ocr` anvands for generell texttolkning.
- `structured_document_parse` anvands for strukturerade filer som XML.
- Async providerkorningar maste kunna avslutas via callback utan att tappa evidence eller versionskedja.
- Production mode far inte fa live-ocr utan explicit providerkonfiguration och baseline-stod.

## Disable And Rollback

- Satt `PHASE2_OCR_REVIEW_ENABLED=false` for att returnera `503` pa OCR- och review-rutter utan att stoppa resten av API-processen.
- Satt `PHASE2_COMPANY_INBOX_ENABLED=false` om ny e-postingest ska stoppas men befintliga dokument bevaras.
- Satt `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false` om hela FAS 2 ska stangas av inklusive underliggande dokumentarkiv.
- Databasrollback sker inte genom att skriva om historiska OCR-runs eller review tasks.
- Korrigeringar ska ske med framatrullande migrering, ny OCR-omkorning eller ny manuell klassificeringsversion.

