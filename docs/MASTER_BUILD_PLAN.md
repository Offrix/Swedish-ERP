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

Detta dokument är nu ett historiskt basdokument.

Bindande genomförandeordning och bindande implementationssanning ligger i:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`

Detta dokument får endast användas som historiskt inputmaterial när det inte krockar med dokumenten ovan.

# Purpose

Detta dokument var den bindande genomförandeplanen för omtaget av produkten. Det är nu ersatt som huvuddokument för faktisk leveransordning, exit gates och dokumentberoenden.

Planen ska användas för att:

- styra exakt i vilken ordning Codex får bygga
- förhindra att UI, automation eller integrationslager springer före kärnmotorerna
- låsa sambandet mellan dokumentation, implementation, tester, runbooks och verifiering
- säkerställa att reglerade flöden inte implementeras på gissning

# Binding precedence

Vid konflikt gäller följande prioritetsordning:

1. användarens uttryckliga krav i den aktiva tråden
2. `docs/master-control/master-rebuild-control.md`
3. övriga master-control-dokument
4. detta dokument
5. verifierad repo-verklighet
6. äldre dokument som ännu inte ersatts

Den tidigare UI-planen är inte längre styrande för slutlig design eller ytstruktur. Den får endast användas som historiskt underlag tills dess ersättningsdokument i UI-spåret har frysts.

# Repo reality and target state

## Current reality

Repo:t är ett starkt dokumenterat och delvis brett kodat ERP-byggprogram, men inte en färdig produkt. De största styrkorna finns i ledger, momsmodellering, AR/AP-bredd, submission/receipt-tänk och teststrategi. De största luckorna finns i accounting method, fiscal year, tax account, person-linked document classification, payroll migration, balances, agreements, review center, worker runtime och den slutliga UI-ytan.

## Target state

Slutläget är ett svenskt premium-ERP där:

- desktop-web är den enda fulla arbetsytan för alla roller
- field-mobile är en tumvänlig stödprodukt för fältarbete
- backoffice är en separat operatörs- och supportyta
- ledger är enda källan till bokföring
- payroll är enda källan till AGI-objekt
- VAT äger momsbeslut
- HUS äger claim-lifecycle
- fiscal year äger periodkalender och year-change-kontroll
- accounting method äger timinglogik för kontantmetod kontra faktureringsmetod
- search aldrig blir source of truth

# Non-negotiable delivery rules

1. Inget område får implementeras före sina blockerande W1- eller W2-dokument.
2. Alla nya bounded contexts ska ha dokument, tester, migrationspåverkan och runbook-spår innan de räknas som införda.
3. UI får aldrig bära domänregler.
4. AI får aldrig vara slutlig ekonomisk beslutsmotor.
5. Alla reglerade beslut ska vara deterministiska, versionerade, spårbara och reproducerbara.
6. Alla kritiska objekt ska ha explicit state machine och correction model.
7. Alla asynkrona flöden med reglerad påverkan ska använda persistent jobs, attempts, replay och dead-letter.
8. Pilot readiness får inte påstås förrän block 5 är uppfyllt.

# Reading order before implementation

För varje område gäller följande läsordning:

1. relevant master-control-dokument
2. detta dokument
3. relevant ADR
4. relevant compliance doc
5. relevant policy
6. relevant domain/product spec
7. relevant runbook
8. relevant test plan

Om konflikt kvarstår efter detta ska Codex stanna och eskalera konflikten som blockerare.

# Phase structure

## Phase 0 - Documentation and control freeze

Syfte:

- frysa styrbasen
- skriva blockerande dokument
- skapa nya bounded-context-beslut innan implementation

Exit gate:

- master-control-paketet finns
- block 1-dokumenten finns
- implementation har inte sprungit före dokumenten

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

Ingen implementation får börja i ett område om dess blockerande dokument i manifestet fortfarande saknas.

# Verification and completion model

Ett område får bara markeras klart när följande är sant:

- relevant dokumentation finns
- implementation finns
- tester finns och är gröna
- runbook finns där drift eller recovery krävs
- ändringen kan spåras tillbaka till manifestet, gap-registret och build sequence

# Human dependency model

Codex får endast stanna för användarfrågor när blockeraren faktiskt kräver mänsklig handling, till exempel:

- köp eller avtal med extern leverantör
- certifikat, hemligheter eller myndighetsåtkomst
- bolagsspecifik policy som dokumenten uttryckligen lämnar öppen

Allt annat ska lösas inom dokumentens ramar.

# Exit gate

Denna plan är uppfylld först när:

- hela dokumentinventariet i manifestet finns i repo:t
- byggordningen i master-build-sequence är genomförbar utan motsägelser
- äldre huvudplanering som strider mot master-control har tagits bort
- inget område längre styrs av utkast, chattsvar eller `Downloads`-filer
