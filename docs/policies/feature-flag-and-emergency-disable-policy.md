> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-BRIDGE-003
- Title: Feature Flag and Emergency Disable Policy
- Status: Superseded compatibility bridge
- Owner: Platform governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior primary `docs/policies/feature-flag-and-emergency-disable-policy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-rebuild-control.md`
- Related domains:
  - feature flags
  - tenant setup
  - emergency disable
  - operations
- Related code areas:
  - `packages/domain-core/*`
  - `apps/backoffice/*`
  - `apps/worker/*`
- Related future documents:
  - `docs/policies/module-activation-and-tenant-setup-policy.md`
  - `docs/policies/emergency-disable-policy.md`

# Purpose

Denna fil finns kvar endast som kompatibilitetsbrygga mellan äldre samlad feature-flag-policy och de två nya primära policydokumenten.

# Scope

Omfattar:

- ompekning från gammal samlad policy
- tydlig separering mellan module activation och emergency disable

Omfattar inte:

- ny rollout-governance
- ny incidentstyrning

# Why it exists

Repo:t hade tidigare en samlad policy för feature flags och nödbrytare. Efter master-control-omtaget ligger bindande regler i:

- `docs/policies/module-activation-and-tenant-setup-policy.md`
- `docs/policies/emergency-disable-policy.md`

# Non-negotiable rules

1. Modulaktivering, tenant setup och feature-flag governance ägs nu av `docs/policies/module-activation-and-tenant-setup-policy.md`.
2. Kill switches och incidentavstängning ägs nu av `docs/policies/emergency-disable-policy.md`.
3. Denna fil får inte användas som primär källa för ny implementation.
4. Historiska referenser ska tolkas genom uppdelningen ovan.

# Allowed actions

- använda filen för att förstå äldre referenser
- ompeka historiskt språkbruk till rätt ny policy

# Forbidden actions

- införa nya flaggregler här
- implementera kill switches direkt från denna fil
- låta backoffice eller UI använda denna fil som enda policykälla

# Approval model

Godkännandemodell hämtas från de två nya primära policydokumenten.

# Segregation of duties where relevant

SoD för riskfyllda flaggändringar och emergency disable ligger nu i de nya policydokumenten tillsammans med SoD-policyn.

# Audit and evidence requirements

- alla nya auditposter ska peka på rätt primärpolicy
- gamla referenser får finnas kvar som historisk kontext

# Exceptions handling

Inga nya undantag får definieras här.

# Backoffice/support restrictions where relevant

Backoffice får inte kringgå primärpolicydokumenten genom att hänvisa till denna bryggfil.

# Runtime enforcement expectations

Runtime enforcement ska implementeras via module activation-, feature-flag- och emergency-disable-motorerna enligt primärpolicydokumenten.

# Test/control points

- verifiera att nya flagg- och disableflöden använder rätt primärpolicy
- verifiera att denna fil inte längre används som enda källa i ny dokumentation

# Exit gate

- [ ] denna fil används endast som brygga
- [ ] ny implementation använder de två primära policydokumenten

