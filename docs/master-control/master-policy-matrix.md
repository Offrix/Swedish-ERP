> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-008
- Title: Master Policy Matrix
- Status: Binding control baseline
- Owner: Compliance architecture, security architecture and product governance
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master policy matrix
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-document-manifest.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - all domains with emphasis on AI, review, ledger, payroll, HUS, personalliggare, close, auth, backoffice and feature flags
- Related code areas:
  - packages/domain-*
  - packages/auth-core/*
  - packages/rule-engine/*
  - apps/api/*
  - apps/backoffice/*
  - apps/desktop-web/*
  - tests/*
- Related future documents:
  - docs/policies/ai-decision-boundary-policy.md
  - docs/policies/module-activation-and-tenant-setup-policy.md
  - docs/policies/document-review-and-economic-decision-policy.md
  - docs/policies/capitalization-policy.md
  - docs/policies/invoice-issuance-and-credit-policy.md
  - docs/policies/signoff-and-segregation-of-duties-policy.md

# Purpose

Detta dokument låser vilka policies som måste finnas, varför de krävs, vilka kodområden de styr och exakt vilka avsnitt varje policy senare måste innehålla.

Detta dokument ska förhindra att senare policyförfattning blir fri tolkning.

# Policy model

## Policy classes

- **Class A — Safety and legal control**  
  Måste godkännas före implementation av kritisk funktion. Exempel: AI boundary, signoff, HUS submission.

- **Class B — Operational control**  
  Måste finnas före pilotdrift. Exempel: payroll migration, personalliggare corrections, close reopen.

- **Class C — Product governance and tenant control**  
  Måste finnas före bred aktivering. Exempel: module activation, emergency disable, support access.

## Policy rules

1. Policy får aldrig vara marknads- eller visionsspråk.
2. Policy ska styra kod, UI, runbooks och tester.
3. Policy ska ha versionsnummer och approval records.
4. Policy ska vara mer detaljerad än en ADR men mindre implementationstät än domänkod.
5. Policy ska beskriva förbjudna handlingar uttryckligt.
6. Policy ska beskriva approval model, exceptions och audit requirements.

# Full policy inventory matrix

| Policy name | Purpose | Scope | Why it is required | Code consumers | UI consumers | Test consumers | Runbook dependencies | Required sections |
|---|---|---|---|---|---|---|---|---|
| AI decision boundary policy | Låsa vad AI får och inte får göra | rule-engine, documents, automation, review, finance, payroll | Hindrar att AI blir ekonomisk eller juridisk beslutsmotor | rule-engine, document-engine, review center, API automation routes | review center, document review UI, automation ops | AI boundary tests, document classification tests, review tests | async jobs, support/backoffice, incident | Purpose; Scope; Allowed AI actions; Forbidden AI actions; Confidence thresholds; Review triggers; Logging and explainability; Cost controls; Kill switches; Exception handling; Audit; Test obligations |
| Module activation and tenant setup policy | Styra kärna kontra valbara moduler och tenant-setup | org-auth, feature flags, onboarding, backoffice | Hindrar inkonsekventa tenantlägen och olagliga modulkombinationer | org-auth, domain-core, feature flags, onboarding routes | onboarding UI, backoffice tenant setup, admin settings | tenant setup tests, feature flag tests | onboarding, feature-flag rollout, emergency disable | Purpose; Scope; Core modules; Optional modules; Dependency matrix; Activation order; Irreversible states; Disable rules; Tenant profiles; Audit; Test obligations |
| Document review and economic decision policy | Styra när dokument kräver mänsklig review och vem som får besluta | document classification, AP, benefits, payroll, VAT | Hindrar OCR/AI/operatör från att fatta fel ekonomiska beslut | document-engine, document classification, AP, benefits, payroll, VAT | document review, AP workbench, review center | document-person-payroll tests, VAT tests | OCR operations, review center operations | Purpose; Scope; Decision classes; Auto-suggest vs auto-approve; Mandatory review scenarios; Decision authority; SoD rules; Override reasons; Audit evidence; Duplicate handling; Test obligations |
| Capitalization policy | Låsa tillgång kontra kostnad, nyttjandeperiod och naturligt samband | AP, documents, ledger, assets | Hindrar felaktig direktkostnadsföring eller felaktig kapitalisering | document classification, AP, ledger, asset logic | AP review UI, document review UI | capitalization tests, AP tests | close and fixed asset runbooks | Purpose; Scope; Threshold model; Useful life rules; Natural connection rules; Split rules; Review triggers; Posting rules; Correction rules; Audit |
| Invoice issuance and credit policy | Styra issue, legal fields, credits och invoice state changes | AR, VAT, HUS, integrations | Felaktiga fakturor måste blockeras innan issue | AR, VAT, HUS, integrations | billing workbench, invoice form, customer views | invoice legality tests, VAT tests, HUS tests | invoice ops, submission ops | Purpose; Scope; Mandatory field classes; Issue blockers; Credit note rules; Original reference rules; Delivery rules; Correction rules; Audit; Test obligations |
| Signoff and segregation of duties policy | Styra vem som får godkänna, attestera, signera och override:a | ledger, payroll, HUS, close, annual, backoffice | Utan SoD urholkas hela kontrollmiljön | auth-core, org-auth, domain-core close, payroll, annual reporting, HUS | signoff UIs, approval panels, backoffice | audit-review-and-sod tests | support access, close runbooks, annual filing runbooks | Purpose; Scope; Role matrix; Approval classes; Forbidden combinations; Delegation rules; Step-up auth requirements; Support restrictions; Audit |
| Personalliggare correction policy | Styra korrigeringar av attendance och offline-repair | personalliggare, field, backoffice | Personalliggare kräver append-only correction model | personalliggare domain, backoffice, mobile sync | kiosk admin UI, backoffice correction UI | personalliggare tests, mobile offline tests | kiosk/device trust, mobile conflict repair | Purpose; Scope; Allowed correction actors; Forbidden edits; Correction chain; Offline rules; Employer snapshot rules; Audit; Export obligations |
| Payroll migration policy | Styra import, diff, signoff och cutover för lön | payroll, HR, balances, agreements, migration | Verkliga kunder kräver säker lönemigrering | payroll migration engine, balances, migration cockpit | migration cockpit, payroll admin UI | migration diff tests, payroll migration tests | payroll cutover, pilot migration | Purpose; Scope; Required imports; Required diffs; Approval gates; Cutover sequence; Rollback rules; Audit; Support actions |
| HUS signing and submission policy | Styra claim readiness, signing, submit, decision and recovery handling | HUS, AR, integrations | HUS är reglerat och kräver hårda blockeringsregler | HUS engine, AR, integrations | HUS workbench, billing UI | HUS edge-case tests | HUS replay and recovery runbook | Purpose; Scope; Mandatory data; Payment readiness; Submission readiness; Signing rules; Decision handling; Recovery rules; Audit; Test obligations |
| Close correction and reopen policy | Styra close blockers, reopen, correction och override | close, ledger, VAT, tax account, annual reporting | Låsta perioder och close får inte urholkas | domain-core close, ledger, tax account, annual reporting | close workbench, ledger correction UI | close tests, locked period tests | fiscal-year change, close runbook | Purpose; Scope; Lock classes; Reopen request rules; Correction types; Override classes; Signoffs; Audit; Reporting implications |
| Emergency disable policy | Styra kill switches och driftmässig avstängning | feature flags, backoffice, runtime, integrations | Krävs för säker drift och snabb incidentkontroll | feature flags, backoffice, worker, integrations | backoffice ops UI | feature flag rollback tests, resilience tests | emergency disable, incident response | Purpose; Scope; Allowed disable classes; Approval classes; Time limits; User communication rules; Recovery steps; Audit |
| Support access and impersonation policy | Styra support case, impersonation och break glass | backoffice, auth, support | Support får inte bli bakdörr | auth-core, org-auth, domain-core backoffice | support cases, impersonation UI, backoffice | security and support tests | support-backoffice-and-audit-review, incident response | Purpose; Scope; When allowed; Approval chain; Scope restrictions; Session recording; Termination rules; Audit |
| Benefits, pension and travel company policy | Styra bolagets policyöverlägg inom laglig ram | benefits, travel, pension, payroll | Många svenska fall kräver både lagregel och bolagspolicy | benefits, travel, pension, payroll | employee settings, benefit intake, payroll exceptions | benefits/travel/pension tests | travel claims, pension ops | Purpose; Scope; Benefit categories; Company overlays; Documentation requirements; Review triggers; Payroll interaction; Audit |
| Security admin and incident policy | Styra adminåtkomst, säkerhetsincidenter, secrets och rotationsflöden | auth, backoffice, infrastructure | Säkerhetsstyrning får inte vara implicit | auth, core resilience, backoffice, worker | admin and incident UIs | security tests, resilience tests | incident response, secrets rotation, production deploy | Purpose; Scope; Admin classes; Incident severity model; Secret rotation; Break glass relation; Audit; Post-incident review |
| Data retention, GDPR and legal hold policy | Styra retention, delete barriers och legal hold | documents, HR, audit, reporting, backoffice | Krävs för datastyrning och revision | documents, backoffice, core, search | admin retention UI, document/archive UI | retention and audit tests | backup/restore, archive operations | Purpose; Scope; Retention classes; Legal hold; Deletion blockers; Search purge; Audit and evidencing |
| Rulepack release and rollback policy | Styra publicering, rollback och replay av regelpaket | rule-engine and all consumers | Regelpaket får inte ändras osynligt | rule-engine, all consumer domains | admin rulepack UI, review UIs that show rule versions | rulepack effective-dating tests | rulepack release rollback runbook | Purpose; Scope; Version lifecycle; Approval chain; Effective dating; Rollback; Replay assessment; Audit; Test obligations |

# Approval model

## Approval classes

### Class A
Gäller för:

- AI decision boundary
- signoff and segregation of duties
- HUS signing and submission
- close correction and reopen
- emergency disable
- support access and impersonation

Godkännare:

- product owner
- compliance owner
- security owner when applicable
- domain owner for affected domain

### Class B
Gäller för:

- payroll migration
- capitalization
- invoice issuance and credit
- personalliggare corrections
- rulepack release and rollback

Godkännare:

- product owner
- domain owner
- compliance owner where regulated

### Class C
Gäller för:

- module activation and tenant setup
- benefits/pension/travel company policy
- data retention
- selected operational policies

Godkännare:

- product owner
- domain owner
- operations owner where relevant

## Approval invariants

- ingen policy blir gällande utan versions- och approval-record
- alla policyändringar ska beskriva change reason
- policy som påverkar runtime blockeringslogik kräver testuppdatering samma gång
- policy som påverkar signoff, AI, HUS, close, AGI eller emergency disable kräver explicit release review

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- alla minimipolicys från användarkravet finns som rad i matrisen
- varje policyrad har tydligt syfte, scope, kodkonsumenter, UI-konsumenter, testkonsumenter och runbookberoenden
- required sections är så konkreta att senare policyförfattning inte behöver uppfinna struktur
- approval model är definierad
- inga kritiska policyområden lämnas oklara eller ospecificerade
- senare policydokument måste mappa tillbaka till denna matris och får inte utelämna required sections

