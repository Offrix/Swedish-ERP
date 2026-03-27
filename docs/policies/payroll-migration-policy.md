> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-007
- Title: Payroll Migration Policy
- Status: Binding
- Owner: Payroll compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated payroll migration policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - payroll
  - balances
  - migration
- Related code areas:
  - `packages/domain-payroll/*`
  - `packages/domain-balances/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/payroll-migration-and-balances-engine.md`
  - `docs/runbooks/payroll-migration-cutover.md`

# Purpose

Styra hur lönehistorik, YTD och saldon får migreras till systemet.

# Scope

Policyn gäller alla bolag som ska gå live på lön.

# Why it exists

Felaktig lönemigrering ger fel nettolön, fel skuld, fel AGI och fel semester-/balansstatus.

# Non-negotiable rules

1. Ingen skarp payroll cutover utan godkänd diff.
2. YTD och saldon måste vara explicit importerade eller explicit bekräftade som noll.
3. Alla avvikelser måste klassas som blockerande eller accepterade med motivering.
4. Rollback-plan måste finnas före skarp cutover.

# Allowed actions

- testmigrering
- diffkörning
- godkänd skarp cutover
- korrigerande batch

# Forbidden actions

- dold manuell justering utan audit
- skarp lönekörning på halvfärdig migrering
- radering av historiskt migrationsunderlag

# Approval model

- payroll owner
- tenant representant
- vid hög risk även compliance owner

# Segregation of duties where relevant

- den som importerat batchen ska inte ensam godkänna blockerande diff som acceptabel

# Audit and evidence requirements

Audit ska visa:

- källsystem
- importomfång
- diff
- godkännanden
- cutover-tidpunkt

# Exceptions handling

Akut undantag får endast användas om bolaget uttryckligen accepterat risk och särskild post-cutover-kontroll sker.

# Backoffice/support restrictions where relevant

- support får inte ensam köra skarp cutover

# Runtime enforcement expectations

- cutover blockeras tills approvals och diffstatus är gröna
- varje batch får egen identitet och egen historik

# Test/control points

- diffmotor testas
- rollbackövning testas
- skarp och testmode separeras

# Exit gate

- [ ] skarp cutover kan inte ske utan grön policykedja
- [ ] alla diffar är klassade
- [ ] rollback-plan finns

