# Master metadata

- Document ID: POL-011
- Title: HUS Signing and Submission Policy
- Status: Binding
- Owner: Finance compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated HUS submission policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - HUS
  - AR
  - integrations
- Related code areas:
  - `packages/domain-hus/*`
  - `packages/domain-integrations/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/compliance/se/hus-invoice-and-claim-gates.md`
  - `docs/runbooks/hus-submission-replay-and-recovery.md`

# Purpose

Styra vem som får förbereda, signera, skicka, rätta och återöppna HUS-claims.

# Scope

Policyn gäller:

- claim readiness
- signoff
- submission
- correction and replay
- recovery decisions

# Why it exists

HUS är ett reglerat flöde där felaktig submission, för tidig submission eller otillåten ändring kan ge felaktig skattereduktion, kundkrav eller återkrav mot bolaget.

# Non-negotiable rules

1. Ingen HUS-claim får skickas utan att HUS-gates är gröna.
2. Signoff ska ske på låst claim-version, inte på levande draftdata.
3. Samma person får inte ensam både förbereda och slutgodkänna högrisk-claim där SoD-policy kräver separering.
4. Replay eller rättelse får inte användas för att dölja tidigare felaktig submission.
5. Efter utbetalning kräver beloppsreducerande ändring recovery-bedömning.
6. Manuella override av köparidentitet, arbetsandel eller betalningsbevis kräver förklaringskod och audit.

# Allowed actions

- förbereda claim-version
- granska blockerlistor
- godkänna claim för submission
- skicka claim genom ordinarie submissionkedja
- öppna recovery när reglerna kräver det

# Forbidden actions

- skicka claim från UI utan server-side gates
- ändra tidigare submissionpayload i efterhand
- markera claim som betald utan receipt eller beslutshändelse

# Approval model

- normal risk: operator plus godkännare
- hög risk eller avvikelse: dual signoff med domänansvarig eller utsedd compliance-roll

# Segregation of duties where relevant

- claim preparation och final signoff ska separeras för delgodkännande, recovery, höga belopp eller manuella override

# Audit and evidence requirements

Spara:

- claim-version
- signoff chain
- blockerlistor vid signoff
- payload hash
- receipts och myndighetsbeslut
- recovery-beslut

# Exceptions handling

Akuta undantag får bara ske via backoffice och ska omedelbart följas av post-review och särskild incidentlogg.

# Backoffice/support restrictions where relevant

- support får inte signera eller skicka claim som ordinarie operatör
- backoffice får bara replaya eller återöppna enligt runbook och policy

# Runtime enforcement expectations

- signoff måste binda till payload hash
- submission måste nekas om claim-version inte längre matchar låst data
- recoverytrigger ska skapas automatiskt vid efterföljande kredit eller differens

# Test/control points

- signoff på gammal payload nekas
- claim utan komplett betalningsbevis blockeras
- dual signoff krävs i högriskfall
- recovery öppnas automatiskt vid senare kredit

# Exit gate

- [ ] claim-signoff är hashbundet och auditbart
- [ ] submission kan inte kringgå blockerande HUS-gates
- [ ] correction, replay och recovery följer tydlig ansvarskedja
