> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# CODEX PROMPT LIBRARY

Detta dokument innehåller nästan färdiga prompts till Codex för varje delfas. Kopiera en prompt åt gången.

## Tvärgående läsning när scope berör stödplattformen

När implementationen berör search, work items, submissions, async jobs, offline, migration, support/backoffice, reporting/export eller feature flags ska Codex läsa relevanta tvärgående dokument innan kod skrivs:

- Search och index: `docs/domain/search-indexing-and-global-search.md`, `docs/adr/ADR-0013-search-and-indexing-strategy.md`, `docs/runbooks/search-index-rebuild-and-repair.md`, `docs/test-plans/search-relevance-and-permission-trimming-tests.md`
- Work items och notifieringar: `docs/domain/work-items-deadlines-notifications.md`, `docs/adr/ADR-0014-work-items-deadlines-and-notifications-strategy.md`
- Async jobs och replay: `docs/domain/async-jobs-retry-replay-and-dead-letter.md`, `docs/adr/ADR-0015-async-jobs-queues-and-replay-strategy.md`, `docs/runbooks/async-job-retry-replay-and-dead-letter.md`, `docs/test-plans/queue-resilience-and-replay-tests.md`
- Feature flags och disable: `docs/adr/ADR-0016-feature-flags-rollout-and-kill-switch-strategy.md`, `docs/policies/feature-flag-and-emergency-disable-policy.md`, `docs/runbooks/feature-flag-rollout-and-emergency-disable.md`, `docs/test-plans/feature-flag-rollback-and-disable-tests.md`
- Submissions och receipts: `docs/domain/submission-receipts-and-action-queue.md`, `docs/adr/ADR-0017-submission-receipt-and-action-queue-strategy.md`, `docs/runbooks/submission-operations-and-retry.md`
- Offline sync: `docs/domain/offline-sync-and-conflict-resolution.md`, `docs/adr/ADR-0018-offline-sync-and-conflict-resolution-strategy.md`, `docs/runbooks/mobile-offline-conflict-repair.md`, `docs/test-plans/mobile-offline-sync-tests.md`
- Reporting, metrics och export: `docs/domain/reporting-metric-catalog-and-export-jobs.md`, `docs/adr/ADR-0019-reporting-exports-and-metric-governance-strategy.md`, `docs/test-plans/report-reproducibility-and-export-integrity-tests.md`
- Migration och cutover: `docs/domain/migration-cockpit-parallel-run-and-cutover.md`, `docs/adr/ADR-0020-migration-parallel-run-and-cutover-strategy.md`, `docs/runbooks/pilot-migration-and-cutover.md`, `docs/test-plans/migration-parallel-run-diff-tests.md`
- Audit review, support och backoffice: `docs/domain/audit-review-support-and-admin-backoffice.md`, `docs/adr/ADR-0021-audit-review-support-and-backoffice-strategy.md`, `docs/policies/support-access-and-impersonation-policy.md`, `docs/runbooks/support-backoffice-and-audit-review.md`, `docs/test-plans/audit-review-and-sod-tests.md`
- Byråportfölj, klientgodkännanden och close: `docs/domain/bureau-portfolio-client-requests-and-approvals.md`, `docs/domain/close-checklists-blockers-and-signoff.md`, `docs/policies/client-approval-deadline-and-escalation-policy.md`
- Saved views och collaboration: `docs/domain/saved-views-dashboards-and-personalization.md`, `docs/domain/comments-mentions-and-collaboration.md`


# FAS 0 — Bootstrap, repo och dokumentgrund

## P0-01 — FAS 0 / 0.1 Monorepo och runtime-låsning

```text
You are implementing FAS 0 — Bootstrap, repo och dokumentgrund, subphase 0.1 Monorepo och runtime-låsning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0001-runtime-versions.md, docs/adr/ADR-0007-security-baseline.md

Implement exactly this scope:
- Monorepo med apps, packages, infra, docs
- Låsta runtimes och lokala dev-verktyg
- Docker Compose för lokala beroenden

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Ren maskin kan bootstrapa projektet
- Versioner matchar ADR-0001
- Health checks svarar grönt

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P0-02 — FAS 0 / 0.2 CI, kvalitet och säkerhetsbas

```text
You are implementing FAS 0 — Bootstrap, repo och dokumentgrund, subphase 0.2 CI, kvalitet och säkerhetsbas.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0001-runtime-versions.md, docs/adr/ADR-0007-security-baseline.md

Implement exactly this scope:
- GitHub Actions
- Lint, typecheck, test och security checks
- Branch protection och CODEOWNERS

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Trasig PR blockeras
- Secrets och sårbarheter fångas
- CI är deterministisk

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P0-03 — FAS 0 / 0.3 Domänskelett och docskeleton

```text
You are implementing FAS 0 — Bootstrap, repo och dokumentgrund, subphase 0.3 Domänskelett och docskeleton.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0001-runtime-versions.md, docs/adr/ADR-0007-security-baseline.md

Implement exactly this scope:
- Package placeholders för alla domäner
- ADR-bibliotek
- Ubiquitous language

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Inga cirkulära beroenden
- Alla domäner har README
- Alla obligatoriska dokument finns

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 1 — Identitet, organisation, auth och onboarding

## P1-01 — FAS 1 / 1.1 Organisation, roller och accesskontroll

```text
You are implementing FAS 1 — Identitet, organisation, auth och onboarding, subphase 1.1 Organisation, roller och accesskontroll.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0002-surface-strategy.md, docs/domain/ubiquitous-language.md

Implement exactly this scope:
- Bolagsmodell
- Användarmodell
- RBAC + objektbaserad åtkomst
- Delegation och attestkedjor

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Bolag kan inte se varandras data
- Delegation respekterar datum och scope
- Servern blockerar otillåtna actions

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P1-02 — FAS 1 / 1.2 Inloggning, sessioner och stark autentisering

```text
You are implementing FAS 1 — Identitet, organisation, auth och onboarding, subphase 1.2 Inloggning, sessioner och stark autentisering.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0002-surface-strategy.md, docs/domain/ubiquitous-language.md

Implement exactly this scope:
- Login/logout
- MFA
- Passkeys/TOTP
- BankID-provider-abstraktion

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Sessioner kan återkallas
- MFA krävs för admins
- Audit log skapas för autentisering

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P1-03 — FAS 1 / 1.3 Bolagssetup och onboarding wizard

```text
You are implementing FAS 1 — Identitet, organisation, auth och onboarding, subphase 1.3 Bolagssetup och onboarding wizard.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0002-surface-strategy.md, docs/domain/ubiquitous-language.md

Implement exactly this scope:
- Skapa bolag
- Registreringar och inställningar
- Kontoplan-, moms- och periodsetup

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Onboarding skapar komplett bolagskonfiguration
- Checklista visar saknade steg
- Setup kan återupptas

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 2 — Dokumentmotor, företagsinbox och OCR

## P2-01 — FAS 2 / 2.1 Dokumentarkiv och metadata

```text
You are implementing FAS 2 — Dokumentmotor, företagsinbox och OCR, subphase 2.1 Dokumentarkiv och metadata.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0006-document-archive-philosophy.md, docs/domain/ubiquitous-language.md

Implement exactly this scope:
- Immutable storage
- Dokumentversioner
- Document-links
- Hash- och statusmodell

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Original och derivat skiljs åt
- Export av dokumentkedja fungerar
- Duplikat upptäcks

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P2-02 — FAS 2 / 2.2 Företagsinbox och mail ingestion

```text
You are implementing FAS 2 — Dokumentmotor, företagsinbox och OCR, subphase 2.2 Företagsinbox och mail ingestion.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0006-document-archive-philosophy.md, docs/domain/ubiquitous-language.md

Implement exactly this scope:
- Per-bolag-inbox
- Ingest av rått mejl och bilagor
- Routing till dokumentkö

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Flera bilagor hanteras korrekt
- Message-ids dedupliceras
- Felaktiga bilagor flaggas

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P2-03 — FAS 2 / 2.3 OCR, klassificering och granskningskö

```text
You are implementing FAS 2 — Dokumentmotor, företagsinbox och OCR, subphase 2.3 OCR, klassificering och granskningskö.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0006-document-archive-philosophy.md, docs/adr/ADR-0011-document-ingestion-and-ocr-strategy.md, docs/compliance/se/document-inbox-and-ocr-engine.md, docs/domain/ubiquitous-language.md, docs/runbooks/ocr-malware-scanning-operations.md

Implement exactly this scope:
- OCR pipeline
- Klassificering av dokumenttyp
- Granskningskö med confidence

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Fakturor, kvitton och avtal särskiljs
- Människan kan korrigera tolkningen
- Omkörning sparar ny derivatversion

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund

## P3-01 — FAS 3 / 3.1 Ledger-schema och verifikationsmotor

```text
You are implementing FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund, subphase 3.1 Ledger-schema och verifikationsmotor.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/accounting-foundation.md, docs/compliance/se/reconciliation-and-close-engine.md, docs/adr/ADR-0004-ledger-invariants.md, docs/domain/reporting-metric-catalog-and-export-jobs.md, docs/domain/close-checklists-blockers-and-signoff.md

Implement exactly this scope:
- Konton
- Verifikationsserier
- Journal entries och lines
- Balanskontroller

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Debet = kredit i alla tester
- Verifikationsnummer är deterministiska
- Import markerar källtyp

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P3-02 — FAS 3 / 3.2 Dimensioner, perioder och bokföringsregler

```text
You are implementing FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund, subphase 3.2 Dimensioner, perioder och bokföringsregler.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/accounting-foundation.md, docs/adr/ADR-0004-ledger-invariants.md

Implement exactly this scope:
- Projekt/kostnadsställe/affärsområde
- Periodlåsning
- Reversal och korrigering

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Låsta perioder går inte att mutera
- Rättelser skapar ny verifikation
- Obligatoriska dimensioner valideras

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P3-03 — FAS 3 / 3.3 Avstämningscenter och rapportgrund

```text
You are implementing FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund, subphase 3.3 Avstämningscenter och rapportgrund.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/accounting-foundation.md, docs/adr/ADR-0004-ledger-invariants.md

Implement exactly this scope:
- Trial balance
- Verifikationssök
- Avstämningsobjekt
- Basrapporter

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Rapporter kan återskapas historiskt
- Drilldown fungerar till källdokument
- Avstämning sparar sign-off

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 4 — Momsmotor

## P4-01 — FAS 4 / 4.1 Momsmasterdata och beslutsträd

```text
You are implementing FAS 4 — Momsmotor, subphase 4.1 Momsmasterdata och beslutsträd.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/vat-engine.md
- docs/compliance/se/accounting-foundation.md
- docs/adr/ADR-0005-rule-engine-philosophy.md

Implement exactly this scope:
- VAT codes
- decision objects
- regelpaket per datum

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Alla transaktionstyper får ett spårbart momsbeslut
- Historiska regler kan återspelas
- Oklara fall går till granskningskö

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P4-02 — FAS 4 / 4.2 Sverige, EU, import, export och omvänd moms

```text
You are implementing FAS 4 — Momsmotor, subphase 4.2 Sverige, EU, import, export och omvänd moms.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/vat-engine.md, docs/adr/ADR-0005-rule-engine-philosophy.md

Implement exactly this scope:
- Sverige 25/12/6/0
- EU B2B/B2C
- Import/export
- bygg-omvänd moms

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Deklarationsboxar summerar rätt
- Kreditnota spegelvänder moms korrekt
- Importmoms och reverse charge dubbelbokas rätt

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P4-03 — FAS 4 / 4.3 OSS, IOSS, periodisk sammanställning och rapportering

```text
You are implementing FAS 4 — Momsmotor, subphase 4.3 OSS, IOSS, periodisk sammanställning och rapportering.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/vat-engine.md, docs/adr/ADR-0005-rule-engine-philosophy.md

Implement exactly this scope:
- OSS/IOSS classification
- Periodisk sammanställning
- Momsdeklarationsunderlag

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- B2C-distansförsäljning landas rätt
- EU-lista kan skapas om och om igen
- Momsrapport stämmer mot ledgern

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 5 — Försäljning, kundreskontra och kundfakturor

## P5-01 — FAS 5 / 5.1 Kundregister, artiklar, offerter och avtal

```text
You are implementing FAS 5 — Försäljning, kundreskontra och kundfakturor, subphase 5.1 Kundregister, artiklar, offerter och avtal.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/ar-customer-invoicing-engine.md
- docs/compliance/se/accounting-foundation.md

Implement exactly this scope:
- Kundregister
- Kontaktpersoner
- Artiklar och prislistor
- Offert/avtal

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Offerter versionshanteras
- Avtal genererar korrekt fakturaplan
- Kunddata kan importeras

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P5-02 — FAS 5 / 5.2 Kundfakturor och leveranskanaler

```text
You are implementing FAS 5 — Försäljning, kundreskontra och kundfakturor, subphase 5.2 Kundfakturor och leveranskanaler.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/ar-customer-invoicing-engine.md
- docs/compliance/se/vat-engine.md
- docs/compliance/se/einvoice-peppol-engine.md
- docs/compliance/se/accounting-foundation.md

Implement exactly this scope:
- Standard/kredit/del/abonnemangsfakturor
- PDF/e-faktura/Peppol
- Betallänkar

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Faktura bokförs bara en gång
- Kreditfaktura stänger rätt poster
- Peppol-export validerar

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P5-03 — FAS 5 / 5.3 Kundreskontra, påminnelser och inbetalningsmatchning

```text
You are implementing FAS 5 — Försäljning, kundreskontra och kundfakturor, subphase 5.3 Kundreskontra, påminnelser och inbetalningsmatchning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/ar-customer-invoicing-engine.md
- docs/compliance/se/bank-and-payments-engine.md
- docs/compliance/se/accounting-foundation.md
- docs/compliance/se/collections-writeoff-and-bad-debt-engine.md

Implement exactly this scope:
- Öppna poster
- Påminnelseflöde
- Matchning mot bank

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Delbetalningar hanteras
- Felmatchningar kan backas
- Åldersanalys är korrekt

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 6 — Leverantörsfakturor, inköp, bank och betalningar

## P6-01 — FAS 6 / 6.1 Leverantörsregister, PO och mottagning

```text
You are implementing FAS 6 — Leverantörsfakturor, inköp, bank och betalningar, subphase 6.1 Leverantörsregister, PO och mottagning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/ap-supplier-invoice-engine.md
- docs/compliance/se/accounting-foundation.md

Implement exactly this scope:
- Leverantörsregister
- PO
- Mottagningsobjekt
- Pris- och konto-defaults

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Leverantörer och PO kan importeras
- Mottagning kopplar till faktura
- Dubblettskydd finns

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P6-02 — FAS 6 / 6.2 Leverantörsfaktura in, tolkning och matchning

```text
You are implementing FAS 6 — Leverantörsfakturor, inköp, bank och betalningar, subphase 6.2 Leverantörsfaktura in, tolkning och matchning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/ap-supplier-invoice-engine.md
- docs/compliance/se/document-inbox-and-ocr-engine.md
- docs/compliance/se/accounting-foundation.md

Implement exactly this scope:
- AP-ingest
- OCR/radnivå
- 2-vägs- och 3-vägsmatchning

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Flera kostnadsrader bokas rätt
- Momsförslag kan förklaras
- Avvikelser kräver granskning

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P6-03 — FAS 6 / 6.3 Attest, bankintegration och utbetalning

```text
You are implementing FAS 6 — Leverantörsfakturor, inköp, bank och betalningar, subphase 6.3 Attest, bankintegration och utbetalning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/ap-supplier-invoice-engine.md
- docs/compliance/se/bank-and-payments-engine.md
- docs/compliance/se/accounting-foundation.md
- docs/adr/ADR-0010-banking-and-money-movement-strategy.md
- docs/runbooks/fas-6-ap-payments-verification.md

Implement exactly this scope:
- Flerstegsattest
- Betalningsförslag
- Bankreturer och avprickning

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Obehöriga kan inte betala
- Utbetalningar bokförs korrekt
- Returer kan återimporteras

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 7 — Tidportal, HR-bas och anställdportal

## P7-01 — FAS 7 / 7.1 Anställdregister och HR-master

```text
You are implementing FAS 7 — Tidportal, HR-bas och anställdportal, subphase 7.1 Anställdregister och HR-master.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/payroll-engine.md
- docs/compliance/se/agi-engine.md
- docs/compliance/se/bank-and-payments-engine.md
- docs/compliance/se/accounting-foundation.md
- docs/domain/ubiquitous-language.md
- docs/ui/ENTERPRISE_UI_PLAN.md
- docs/runbooks/fas-7-time-reporting-verification.md
- docs/runbooks/fas-7-hr-master-verification.md

Implement exactly this scope:
- Anställningar
- avtal och chefsträd
- bankkonton och dokument

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Samma person kan ha flera anställningar
- Anställningshistorik bevaras
- Känsliga fält loggas

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P7-02 — FAS 7 / 7.2 Tidrapportering, schema och saldon

```text
You are implementing FAS 7 — Tidportal, HR-bas och anställdportal, subphase 7.2 Tidrapportering, schema och saldon.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/payroll-engine.md
- docs/domain/ubiquitous-language.md

Implement exactly this scope:
- In/utstämpling
- Schema/OB/jour/beredskap
- Flex, komp, övertid

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Låsning av period fungerar
- Tid kan kopplas till projekt och aktivitet
- Beräkning av saldon är reproducerbar

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P7-03 — FAS 7 / 7.3 Frånvaro, attest och anställdportal

```text
You are implementing FAS 7 — Tidportal, HR-bas och anställdportal, subphase 7.3 Frånvaro, attest och anställdportal.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/payroll-engine.md
- docs/domain/ubiquitous-language.md

Implement exactly this scope:
- Frånvarotyper
- Chefsgodkännande
- Anställdportal

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Frånvaro kan inte ändras efter AGI-signering
- Historik visas för anställd och admin
- Uppgifter för frånvarosignaler är kompletta

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 8 — Lön och AGI

## P8-01 — FAS 8 / 8.1 Lönearter, lönekalender och lönekörning

```text
You are implementing FAS 8 — Lön och AGI, subphase 8.1 Lönearter, lönekalender och lönekörning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/payroll-engine.md
- docs/compliance/se/agi-engine.md
- docs/runbooks/fas-8-payroll-core-verification.md

Implement exactly this scope:
- Lönearter
- Lönekörning
- Retro och korrigering
- Slutlön

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Lönekedjan följer definierad ordning
- Retrofall är spårbara
- Lönebesked kan regenereras

Return:
1) changed files
2) migrations created
3) tests run and results
4) verification notes for docs/runbooks/fas-8-payroll-core-verification.md
4) follow-up tasks
5) any blockers requiring human action
```

## P8-02 — FAS 8 / 8.2 Skatt, arbetsgivaravgifter, SINK och AGI

```text
You are implementing FAS 8 — Lön och AGI, subphase 8.2 Skatt, arbetsgivaravgifter, SINK och AGI.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/payroll-engine.md
- docs/compliance/se/agi-engine.md
- docs/runbooks/fas-8-payroll-tax-agi-verification.md

Implement exactly this scope:
- Skattelogik
- avgiftsregler
- SINK
- AGI-underlag och submission

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- AGI innehåller rätt fält per individ
- Frånvarouppgifter låses i tid
- Rättelseversioner kan skapas

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P8-03 — FAS 8 / 8.3 Lönebokföring och utbetalning

```text
You are implementing FAS 8 — Lön och AGI, subphase 8.3 Lönebokföring och utbetalning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/payroll-engine.md
- docs/compliance/se/agi-engine.md
- docs/compliance/se/bank-and-payments-engine.md
- docs/compliance/se/accounting-foundation.md

Implement exactly this scope:
- Löneverifikationer
- Bankbetalningsunderlag
- Kostnadsfördelning

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Bokföring per projekt/kostnadsställe fungerar
- Utbetalningar matchas mot bank
- Semesterskuld kan återskapas

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 9 — Förmåner, resor, traktamente, pension och löneväxling

## P9-01 — FAS 9 / 9.1 Förmånsmotor

```text
You are implementing FAS 9 — Förmåner, resor, traktamente, pension och löneväxling, subphase 9.1 Förmånsmotor.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/benefits-engine.md
- docs/compliance/se/payroll-engine.md
- docs/compliance/se/agi-engine.md
- docs/compliance/se/accounting-foundation.md
- docs/compliance/se/travel-and-traktamente-engine.md
- docs/compliance/se/pension-and-salary-exchange-engine.md
- docs/policies/benefits-pension-travel-company-policy.md

Implement exactly this scope:
- Förmånskatalog
- Skattepliktig/skattefri logik
- Bil, drivmedel, friskvård, gåvor, kost, sjukvård

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Förmåner med och utan kontant lön hanteras
- Bilförmån start/stopp per månad fungerar
- AGI-mappning och bokföring är korrekt

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P9-02 — FAS 9 / 9.2 Resor, traktamente, körjournal och utlägg

```text
You are implementing FAS 9 — Förmåner, resor, traktamente, pension och löneväxling, subphase 9.2 Resor, traktamente, körjournal och utlägg.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/benefits-engine.md
- docs/compliance/se/travel-and-traktamente-engine.md
- docs/compliance/se/pension-and-salary-exchange-engine.md
- docs/compliance/se/payroll-engine.md
- docs/policies/benefits-pension-travel-company-policy.md

Implement exactly this scope:
- Tjänsteresa som objekt
- Inrikes/utlandstraktamente
- Bilersättning
- Körjournal

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- 50 km-krav och övernattning styr korrekt
- Måltidsreduktion minskar rätt
- Överskjutande del blir lön

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P9-03 — FAS 9 / 9.3 Pension, extra pension och löneväxling

```text
You are implementing FAS 9 — Förmåner, resor, traktamente, pension och löneväxling, subphase 9.3 Pension, extra pension och löneväxling.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/pension-and-salary-exchange-engine.md
- docs/compliance/se/payroll-engine.md
- docs/compliance/se/accounting-foundation.md
- docs/policies/benefits-pension-travel-company-policy.md

Implement exactly this scope:
- ITP/Fora-stöd
- Extra pension
- Löneväxling
- Pensionsrapportering

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Rapportunderlag per kollektivavtal stämmer
- Löneväxling varnar under tröskel
- Pension bokförs och avstäms

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 10 — Projekt, bygg, fält, lager och personalliggare

## P10-01 — FAS 10 / 10.1 Projekt, budget och uppföljning

```text
You are implementing FAS 10 — Projekt, bygg, fält, lager och personalliggare, subphase 10.1 Projekt, budget och uppföljning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/project-billing-and-revenue-recognition-engine.md
- docs/domain/projects-budget-wip-and-profitability.md
- docs/adr/ADR-0003-domain-boundaries.md
- docs/ui/ENTERPRISE_UI_PLAN.md

Implement exactly this scope:
- Projektbudget
- WIP
- projektmarginal
- resursbeläggning

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Projektkostnad inkluderar lön, förmåner, pension och resor
- WIP kan stämmas av mot fakturering
- Forecast at completion fungerar

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P10-02 — FAS 10 / 10.2 Arbetsorder, serviceorder, fältapp och lager

```text
You are implementing FAS 10 — Projekt, bygg, fält, lager och personalliggare, subphase 10.2 Arbetsorder, serviceorder, fältapp och lager.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/project-billing-and-revenue-recognition-engine.md
- docs/compliance/se/rot-rut-engine.md
- docs/compliance/se/personalliggare-engine.md
- docs/domain/field-work-order-service-order-and-material-flow.md
- docs/domain/offline-sync-and-conflict-resolution.md
- docs/adr/ADR-0018-offline-sync-and-conflict-resolution-strategy.md
- docs/runbooks/mobile-offline-conflict-repair.md
- docs/test-plans/mobile-offline-sync-tests.md
- docs/ui/ENTERPRISE_UI_PLAN.md

Implement exactly this scope:
- Dispatch
- fältmobil
- material och lager
- kundsignatur
- offlinekö, syncstatus och konfliktlösning

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Offline-sync tål nätavbrott
- Materialuttag går till projekt
- Arbetsorder kan faktureras

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P10-03 — FAS 10 / 10.3 Byggspecifika regler: ÄTA, HUS, omvänd moms, personalliggare

```text
You are implementing FAS 10 — Projekt, bygg, fält, lager och personalliggare, subphase 10.3 Byggspecifika regler: ÄTA, HUS, omvänd moms, personalliggare.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/rot-rut-engine.md
- docs/compliance/se/personalliggare-engine.md
- docs/compliance/se/vat-engine.md
- docs/compliance/se/project-billing-and-revenue-recognition-engine.md
- docs/domain/field-work-order-service-order-and-material-flow.md
- docs/domain/projects-budget-wip-and-profitability.md
- docs/domain/ubiquitous-language.md
- docs/runbooks/fas-10-build-verification.md

Implement exactly this scope:
- ÄTA
- ROT/RUT/HUS
- byggmoms
- personalliggare

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- HUS-kundandel och ansökan stämmer
- Byggmoms triggas korrekt
- Personalliggare exporterar kontrollbar kedja

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 11 — Rapporter, byråläge, månadsstängning och bokslut

## P11-01 — FAS 11 / 11.1 Rapporter och drilldown

```text
You are implementing FAS 11 — Rapporter, byråläge, månadsstängning och bokslut, subphase 11.1 Rapporter och drilldown.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
- docs/compliance/se/accounting-foundation.md
- docs/domain/search-indexing-and-global-search.md
- docs/domain/saved-views-dashboards-and-personalization.md
- docs/domain/reporting-metric-catalog-and-export-jobs.md
- docs/adr/ADR-0013-search-and-indexing-strategy.md
- docs/adr/ADR-0019-reporting-exports-and-metric-governance-strategy.md
- docs/test-plans/search-relevance-and-permission-trimming-tests.md
- docs/test-plans/report-reproducibility-and-export-integrity-tests.md
- docs/runbooks/fas-11-reporting-verification.md
- docs/ui/ENTERPRISE_UI_PLAN.md

Implement exactly this scope:
- P&L, balans, cashflow, reskontra, projekt
- drilldown
- rapportbyggare light
- metric catalog och exportjobb

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Rapporter är historiskt reproducerbara
- Belopp kan spåras till källdokument
- Export till Excel/PDF fungerar

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P11-02 — FAS 11 / 11.2 Byråläge och portföljhantering

```text
You are implementing FAS 11 — Rapporter, byråläge, månadsstängning och bokslut, subphase 11.2 Byråläge och portföljhantering.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/accounting-foundation.md, docs/domain/work-items-deadlines-notifications.md, docs/domain/search-indexing-and-global-search.md, docs/domain/saved-views-dashboards-and-personalization.md, docs/domain/bureau-portfolio-client-requests-and-approvals.md, docs/domain/comments-mentions-and-collaboration.md, docs/adr/ADR-0013-search-and-indexing-strategy.md, docs/adr/ADR-0014-work-items-deadlines-and-notifications-strategy.md, docs/policies/client-approval-deadline-and-escalation-policy.md, docs/ui/ENTERPRISE_UI_PLAN.md

Implement exactly this scope:
- Byråportfölj
- deadlines
- klientstatus
- massåtgärder
- klientrequester och approvals

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Byrån ser bara klienter i scope
- Deadlines härleds från bolagsinställningar
- Klientdokument kan begäras och spåras

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P11-03 — FAS 11 / 11.3 Månadsstängning och bokslutschecklistor

```text
You are implementing FAS 11 — Rapporter, byråläge, månadsstängning och bokslut, subphase 11.3 Månadsstängning och bokslutschecklistor.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/accounting-foundation.md, docs/compliance/se/reconciliation-and-close-engine.md, docs/domain/work-items-deadlines-notifications.md, docs/domain/close-checklists-blockers-and-signoff.md, docs/adr/ADR-0014-work-items-deadlines-and-notifications-strategy.md, docs/policies/client-approval-deadline-and-escalation-policy.md, docs/ui/ENTERPRISE_UI_PLAN.md

Implement exactly this scope:
- Close workbench
- avstämningslistor
- sign-off
- blockers och reopen/override

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Månad kan stängas med komplett checklista
- Öppna avvikelser blockerar sign-off där policy kräver
- Återskapad period ger samma rapport

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 12 — Årsredovisning, deklaration och myndighetskopplingar

## P12-01 — FAS 12 / 12.1 Årsredovisningsmotor

```text
You are implementing FAS 12 — Årsredovisning, deklaration och myndighetskopplingar, subphase 12.1 Årsredovisningsmotor.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/annual-reporting-engine.md, docs/compliance/se/accounting-foundation.md

Implement exactly this scope:
- K2/K3-spår
- årsredovisningspaket
- versioner och signeringsunderlag

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Årspaket låser underlag
- Signaturkedja spåras
- Rättelse skapar ny version

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P12-02 — FAS 12 / 12.2 Skatt, deklarationsunderlag och myndighetsfiler

```text
You are implementing FAS 12 — Årsredovisning, deklaration och myndighetskopplingar, subphase 12.2 Skatt, deklarationsunderlag och myndighetsfiler.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/compliance/se/annual-reporting-engine.md, docs/compliance/se/accounting-foundation.md, docs/domain/work-items-deadlines-notifications.md, docs/domain/submission-receipts-and-action-queue.md, docs/adr/ADR-0014-work-items-deadlines-and-notifications-strategy.md, docs/adr/ADR-0017-submission-receipt-and-action-queue-strategy.md, docs/runbooks/submission-operations-and-retry.md

Implement exactly this scope:
- INK/NE/SRU-underlag
- moms/AGI/HUS-översikter
- myndighetsadapterlager
- submission receipts och action queue

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Filer matchar interna siffror
- Submission loggas med kvittens
- Fel går till åtgärdskö

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 13 — API, integrationer, AI och automation

## P13-01 — FAS 13 / 13.1 Publikt API och webhooks

```text
You are implementing FAS 13 — API, integrationer, AI och automation, subphase 13.1 Publikt API och webhooks.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0003-domain-boundaries.md, docs/adr/ADR-0005-rule-engine-philosophy.md

Implement exactly this scope:
- API-spec
- OAuth/scopes
- webhooks
- sandbox

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Scopes begränsar rätt data
- Webhook events är idempotenta
- Backward compatibility bevakas

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P13-02 — FAS 13 / 13.2 Partnerintegrationer och marknadsplats

```text
You are implementing FAS 13 — API, integrationer, AI och automation, subphase 13.2 Partnerintegrationer och marknadsplats.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0003-domain-boundaries.md, docs/adr/ADR-0005-rule-engine-philosophy.md, docs/domain/async-jobs-retry-replay-and-dead-letter.md, docs/adr/ADR-0015-async-jobs-queues-and-replay-strategy.md, docs/runbooks/async-job-retry-replay-and-dead-letter.md, docs/test-plans/queue-resilience-and-replay-tests.md

Implement exactly this scope:
- Bank
- Peppol
- pension
- CRM/e-handel/ID06
- async jobs och replay-safe adapters

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Varje adapter har kontraktstest
- Fallback finns vid extern driftstörning
- Rate limits respekteras

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P13-03 — FAS 13 / 13.3 AI, automation och no-code-regler

```text
You are implementing FAS 13 — API, integrationer, AI och automation, subphase 13.3 AI, automation och no-code-regler.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/adr/ADR-0003-domain-boundaries.md, docs/adr/ADR-0005-rule-engine-philosophy.md

Implement exactly this scope:
- Konteringsförslag
- klassificering
- anomalidetektion
- regelbyggare

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Alla AI-beslut har confidence och förklaring
- Human-in-the-loop kan överstyra
- Felaktiga AI-förslag påverkar inte ledger utan granskning

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```


# FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live

## P14-01 — FAS 14 / 14.1 Säkerhet och behörighetsgranskning

```text
You are implementing FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live, subphase 14.1 Säkerhet och behörighetsgranskning.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/domain/audit-review-support-and-admin-backoffice.md, docs/adr/ADR-0021-audit-review-support-and-backoffice-strategy.md, docs/policies/support-access-and-impersonation-policy.md, docs/runbooks/support-backoffice-and-audit-review.md, docs/test-plans/audit-review-and-sod-tests.md, docs/test-plans/master-verification-gates.md, docs/runbooks/production-deploy.md

Implement exactly this scope:
- Penteståtgärder
- behörighetsgranskning
- SoD-kontroller
- audit review och supportspärrar

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Kritiska findings är åtgärdade
- Admin-spår granskas
- Secrets-hantering är verifierad

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P14-02 — FAS 14 / 14.2 Prestanda, återläsning och chaos-test

```text
You are implementing FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live, subphase 14.2 Prestanda, återläsning och chaos-test.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/domain/async-jobs-retry-replay-and-dead-letter.md, docs/adr/ADR-0015-async-jobs-queues-and-replay-strategy.md, docs/policies/feature-flag-and-emergency-disable-policy.md, docs/runbooks/async-job-retry-replay-and-dead-letter.md, docs/runbooks/feature-flag-rollout-and-emergency-disable.md, docs/test-plans/queue-resilience-and-replay-tests.md, docs/test-plans/feature-flag-rollback-and-disable-tests.md, docs/test-plans/master-verification-gates.md, docs/runbooks/production-deploy.md

Implement exactly this scope:
- Load profiler
- backup/restore-prover
- chaos-scenarier
- replay, disable och recovery

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Systemet klarar mållast
- RTO/RPO uppfylls
- Köer återhämtar sig efter fel

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

## P14-03 — FAS 14 / 14.3 Pilotkunder, datamigrering och go-live-ritual

```text
You are implementing FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live, subphase 14.3 Pilotkunder, datamigrering och go-live-ritual.

Read first:
- docs/MASTER_BUILD_PLAN.md
- docs/test-plans/master-test-strategy.md
- docs/test-plans/master-verification-gates.md
docs/domain/migration-cockpit-parallel-run-and-cutover.md, docs/adr/ADR-0020-migration-parallel-run-and-cutover-strategy.md, docs/runbooks/pilot-migration-and-cutover.md, docs/test-plans/migration-parallel-run-diff-tests.md, docs/test-plans/master-verification-gates.md, docs/runbooks/production-deploy.md

Implement exactly this scope:
- Pilotplan
- migreringschecklistor
- go-live och rollback-plan
- parallel run, diff report och cutover

Rules:
- do not skip migrations
- do not skip tests
- do not skip documentation updates
- do not move domain logic into UI
- keep module boundaries intact
- if a true blocker exists outside the repo (credentials, provider contract, legal decision), stop and clearly list the blocker
- otherwise continue until the subphase is complete

Mandatory verification before you stop:
- Parallellkörning stämmer
- Kunddata migreras utan differenser
- Support-runbook är bemannad

Return:
1) changed files
2) migrations created
3) tests run and results
4) follow-up tasks
5) any blockers requiring human action
```

