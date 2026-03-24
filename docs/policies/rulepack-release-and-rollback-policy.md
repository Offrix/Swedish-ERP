# Master metadata

- Document ID: POL-002
- Title: Rulepack Release and Rollback Policy
- Status: Binding
- Owner: Compliance architecture and platform governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: Informal rule-engine release practice
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - rule-engine
  - all rulepack consumers
- Related code areas:
  - `packages/rule-engine/*`
  - `packages/domain-*/*`
  - `tests/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/runbooks/rulepack-release-rollback-and-hotfix.md`
  - `docs/test-plans/rulepack-effective-dating-tests.md`

# Purpose

Styra hur regelpaket publiceras, aktiveras, rollbackas och replayas utan att historik förloras eller tidigare bedömningar skrivs om.

# Scope

Policyn gäller alla rulepacks som används av:

- accounting method
- fiscal year
- VAT
- payroll
- benefits
- HUS
- personalliggare
- tax account
- annual reporting

# Why it exists

Rulepacks är produktens huvudsakliga bärare av datumstyrda regler. Om publicering och rollback sker odisciplinerat förloras reproducerbarhet och historiska beslut blir opålitliga.

# Non-negotiable rules

1. Rulepacks är append-only versioner; äldre version får inte muteras.
2. Ny regelversion får inte ändra historiskt utfall för redan bedömda objekt utan explicit replay- eller correctionkedja.
3. Varje release måste ha effective-from och om relevant effective-to.
4. Rollback betyder ny aktiv version eller kontrollerad avaktivering, aldrig radering av redan publicerad version.
5. Alla releases ska vara kopplade till godkända testresultat och change reference.
6. Högpåverkande rulepacks kräver fyrögonsgodkännande.

# Allowed actions

- publicera ny version
- schemalägga framtida aktivering
- stoppa framtida aktivering
- aktivera rollback-version
- kräva replayanalys för framtida objekt

# Forbidden actions

- skriva över redan publicerad regelversion
- ändra effective date i efterhand utan spårbar ersättningsversion
- köra massreplay utan förhandsgodkänd impact assessment
- publicera till produktion utan grön testplan

# Approval model

- låg risk: domänägare + teknisk ägare
- hög risk: domänägare + compliance owner + operativ godkännare
- kritisk risk: dessutom incident/change manager när release sker som hotfix

# Segregation of duties where relevant

- samma person får inte både skriva, godkänna och aktivera högrisk-rulepack ensam
- backoffice-aktivering måste logga separat aktör från den som producerade versionen om riskklass kräver det

# Audit and evidence requirements

För varje release ska följande finnas:

- rulepack code
- version id
- affected domains
- effective dates
- change reason
- test evidence
- approvers
- rollback plan
- replay assessment

# Exceptions handling

Nödhotfix får endast användas vid kritisk incident och måste följas av efterkontroll, dokumenterad motivering och post-incident review.

# Backoffice/support restrictions where relevant

- support får inte själv publicera eller rollbacka högrisk-rulepacks
- backoffice får endast exponera aktiverings- och rollbackfunktioner enligt behörighetsklass

# Runtime enforcement expectations

- aktiva rulepacks ska väljas via effective dating och version pinning
- historiska objekt ska bära rulepack-version eller beslutspunkt som gör replay möjlig
- systemet ska kunna visa vilken regelversion som låg bakom ett beslut

# Test/control points

- effektiva datum testas före release
- rollback-scenarier testas före högriskrelease
- golden scenarios måste matcha förväntat utfall för både gammal och ny version där relevant

# Exit gate

- [ ] append-only release discipline är på plats
- [ ] effektiva datum, approvers och testbevis krävs för release
- [ ] rollback går utan att historik skrivs om
- [ ] replayanalys är definierad för högriskregeländringar
