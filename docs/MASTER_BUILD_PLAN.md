> Statusnotis: Detta dokument Ã¤r inte primÃ¤r sanning. Bindande styrning fÃ¶re UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument Ã¤r historiskt input- eller stÃ¶ddokument och fÃ¥r inte Ã¶verstyra dem.
# Master metadata

- Document ID: MBP-001
- Title: Master Build Plan
- Status: Historical implementation baseline superseded by go-live roadmap and implementation bible
- Owner: Product architecture, compliance architecture and engineering delivery
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/MASTER_BUILD_PLAN.md` and all earlier informal build sequencing
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-gap-register.md`
  - `docs/master-control/master-code-impact-map.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - all product domains and surfaces
- Related code areas:
  - `apps/*`
  - `packages/*`
  - `packages/db/migrations/*`
  - `tests/*`
  - `docs/*`
- Related future documents:
  - all W1-W5 documents in `docs/master-control/master-document-manifest.md`

# Supersession Notice

Detta dokument Ã¤r nu ett historiskt basdokument.

Bindande genomfÃ¶randeordning och bindande implementationssanning ligger i:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

Detta dokument fÃ¥r endast anvÃ¤ndas som historiskt inputmaterial nÃ¤r det inte krockar med dokumenten ovan.

# Purpose

Detta dokument var den bindande genomfÃ¶randeplanen fÃ¶r omtaget av produkten. Det Ã¤r nu ersatt som huvuddokument fÃ¶r faktisk leveransordning, exit gates och dokumentberoenden.

Planen ska anvÃ¤ndas fÃ¶r att:

- styra exakt i vilken ordning Codex fÃ¥r bygga
- fÃ¶rhindra att UI, automation eller integrationslager springer fÃ¶re kÃ¤rnmotorerna
- lÃ¥sa sambandet mellan dokumentation, implementation, tester, runbooks och verifiering
- sÃ¤kerstÃ¤lla att reglerade flÃ¶den inte implementeras pÃ¥ gissning

# Binding precedence

Vid konflikt gÃ¤ller fÃ¶ljande prioritetsordning:

1. anvÃ¤ndarens uttryckliga krav i den aktiva trÃ¥den
2. `docs/master-control/master-rebuild-control.md`
3. Ã¶vriga master-control-dokument
4. detta dokument
5. verifierad repo-verklighet
6. Ã¤ldre dokument som Ã¤nnu inte ersatts

Den tidigare UI-planen Ã¤r inte lÃ¤ngre styrande fÃ¶r slutlig design eller ytstruktur. Den fÃ¥r endast anvÃ¤ndas som historiskt underlag tills dess ersÃ¤ttningsdokument i UI-spÃ¥ret har frysts.

# Repo reality and target state

## Current reality

Repo:t Ã¤r ett starkt dokumenterat och delvis brett kodat ERP-byggprogram, men inte en fÃ¤rdig produkt. De stÃ¶rsta styrkorna finns i ledger, momsmodellering, AR/AP-bredd, submission/receipt-tÃ¤nk och teststrategi. De stÃ¶rsta luckorna finns i accounting method, fiscal year, tax account, person-linked document classification, payroll migration, balances, agreements, review center, worker runtime och den slutliga UI-ytan.

## Target state

SlutlÃ¤get Ã¤r ett svenskt premium-ERP dÃ¤r:

- desktop-web Ã¤r den enda fulla arbetsytan fÃ¶r alla roller
- field-mobile Ã¤r en tumvÃ¤nlig stÃ¶dprodukt fÃ¶r fÃ¤ltarbete
- backoffice Ã¤r en separat operatÃ¶rs- och supportyta
- ledger Ã¤r enda kÃ¤llan till bokfÃ¶ring
- payroll Ã¤r enda kÃ¤llan till AGI-objekt
- VAT Ã¤ger momsbeslut
- HUS Ã¤ger claim-lifecycle
- fiscal year Ã¤ger periodkalender och year-change-kontroll
- accounting method Ã¤ger timinglogik fÃ¶r kontantmetod kontra faktureringsmetod
- search aldrig blir source of truth

# Non-negotiable delivery rules

1. Inget omrÃ¥de fÃ¥r implementeras fÃ¶re sina blockerande W1- eller W2-dokument.
2. Alla nya bounded contexts ska ha dokument, tester, migrationspÃ¥verkan och runbook-spÃ¥r innan de rÃ¤knas som infÃ¶rda.
3. UI fÃ¥r aldrig bÃ¤ra domÃ¤nregler.
4. AI fÃ¥r aldrig vara slutlig ekonomisk beslutsmotor.
5. Alla reglerade beslut ska vara deterministiska, versionerade, spÃ¥rbara och reproducerbara.
6. Alla kritiska objekt ska ha explicit state machine och correction model.
7. Alla asynkrona flÃ¶den med reglerad pÃ¥verkan ska anvÃ¤nda persistent jobs, attempts, replay och dead-letter.
8. Pilot readiness fÃ¥r inte pÃ¥stÃ¥s fÃ¶rrÃ¤n block 5 Ã¤r uppfyllt.

# Reading order before implementation

FÃ¶r varje omrÃ¥de gÃ¤ller fÃ¶ljande lÃ¤sordning:

1. relevant master-control-dokument
2. detta dokument
3. relevant ADR
4. relevant compliance doc
5. relevant policy
6. relevant domain/product spec
7. relevant runbook
8. relevant test plan

Om konflikt kvarstÃ¥r efter detta ska Codex stanna och eskalera konflikten som blockerare.

# Phase structure

## Phase 0 - Documentation and control freeze

Syfte:

- frysa styrbasen
- skriva blockerande dokument
- skapa nya bounded-context-beslut innan implementation

Exit gate:

- master-control-paketet finns
- block 1-dokumenten finns
- implementation har inte sprungit fÃ¶re dokumenten

## Phase 1 - Shared runtime hardening

Omfattar:

- composition root
- persistent jobs
- outbox
- attempts
- dead-letter
- replay
- audit correlation
- resilience

Blockerande dokument:

- `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
- `docs/runbooks/async-job-retry-replay-and-dead-letter.md`
- `docs/runbooks/backup-restore-and-disaster-recovery.md`
- `docs/runbooks/incident-response-and-production-hotfix.md`
- `docs/policies/emergency-disable-policy.md`
- `docs/policies/rulepack-release-and-rollback-policy.md`

## Phase 2 - Foundational finance and time authority

Omfattar:

- accounting method bounded context
- fiscal year bounded context
- ledger integration
- configurable voucher and invoice series
- rulepack runtime hardening

Blockerande dokument:

- `docs/adr/ADR-0022-accounting-method-and-fiscal-year-architecture.md`
- `docs/compliance/se/accounting-method-engine.md`
- `docs/compliance/se/fiscal-year-and-period-engine.md`
- `docs/test-plans/accounting-method-tests.md`
- `docs/test-plans/fiscal-year-and-broken-year-tests.md`
- `docs/test-plans/rulepack-effective-dating-tests.md`

## Phase 3 - Cross-domain control and review backbone

Omfattar:

- review center
- work items separation
- notifications
- activity
- person-linked document classification
- tax account

Blockerande dokument:

- `docs/adr/ADR-0023-review-center-notification-and-activity-separation.md`
- `docs/adr/ADR-0024-document-person-payroll-chain-architecture.md`
- `docs/adr/ADR-0025-tax-account-and-offset-architecture.md`
- `docs/compliance/se/person-linked-document-classification-engine.md`
- `docs/compliance/se/tax-account-and-offset-engine.md`
- `docs/domain/review-center.md`

## Phase 4 - Payroll foundations and people control

Omfattar:

- payroll migration
- balances
- collective agreements
- payroll/benefits bridge
- AGI-safe operations

Blockerande dokument:

- `docs/adr/ADR-0026-payroll-migration-balances-and-agreements-architecture.md`
- `docs/compliance/se/payroll-migration-and-balances-engine.md`
- `docs/compliance/se/collective-agreements-engine.md`
- `docs/policies/payroll-migration-policy.md`
- `docs/test-plans/payroll-migration-and-balance-tests.md`

## Phase 5 - Import, VAT and HUS hardening

Omfattar:

- import cases
- AP/VAT hardening
- invoice legal field rules
- HUS gates

Blockerande dokument:

- `docs/adr/ADR-0027-import-case-and-multi-document-linkage-architecture.md`
- `docs/compliance/se/import-case-engine.md`
- `docs/compliance/se/invoice-legal-field-rules-engine.md`
- `docs/compliance/se/hus-invoice-and-claim-gates.md`
- `docs/policies/invoice-issuance-and-credit-policy.md`
- `docs/policies/hus-signing-and-submission-policy.md`

## Phase 6 - Surface reset

Omfattar:

- public site
- auth and onboarding
- desktop information architecture
- design system
- workbench catalog
- field mobile
- backoffice

Blockerande dokument:

- `docs/adr/ADR-0029-ui-reset-and-surface-strategy-refresh.md`
- `docs/ui/ENTERPRISE_UI_RESET.md`
- `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
- `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
- `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`

## Phase 7 - Operational domain modules

Omfattar:

- projects workspace
- payroll workbench
- tax-account workspace
- personalliggare industry packs
- egenkontroll
- kalkyl
- field flow

## Phase 8 - Annual reporting and pilot readiness

Omfattar:

- legal-form engine
- annual reporting hardening
- annual filing packages
- pilot-readiness verifiering

Ingen implementation fÃ¥r bÃ¶rja i ett omrÃ¥de om dess blockerande dokument i manifestet fortfarande saknas.

# Verification and completion model

Ett omrÃ¥de fÃ¥r bara markeras klart nÃ¤r fÃ¶ljande Ã¤r sant:

- relevant dokumentation finns
- implementation finns
- tester finns och Ã¤r grÃ¶na
- runbook finns dÃ¤r drift eller recovery krÃ¤vs
- Ã¤ndringen kan spÃ¥ras tillbaka till manifestet, gap-registret och build sequence

# Human dependency model

Codex fÃ¥r endast stanna fÃ¶r anvÃ¤ndarfrÃ¥gor nÃ¤r blockeraren faktiskt krÃ¤ver mÃ¤nsklig handling, till exempel:

- kÃ¶p eller avtal med extern leverantÃ¶r
- certifikat, hemligheter eller myndighetsÃ¥tkomst
- bolagsspecifik policy som dokumenten uttryckligen lÃ¤mnar Ã¶ppen

Allt annat ska lÃ¶sas inom dokumentens ramar.

# Exit gate

Denna plan Ã¤r uppfylld fÃ¶rst nÃ¤r:

- hela dokumentinventariet i manifestet finns i repo:t
- byggordningen i master-build-sequence Ã¤r genomfÃ¶rbar utan motsÃ¤gelser
- Ã¤ldre huvudplanering som strider mot master-control har tagits bort
- inget omrÃ¥de lÃ¤ngre styrs av utkast, chattsvar eller `Downloads`-filer

