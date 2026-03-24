# Master metadata

- Document ID: MCP-011
- Title: Master Document Writing Status
- Status: Active control tracker
- Owner: Delivery control and documentation governance
- Version: 1.1.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/master-control/master-document-writing-status.md`
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - all product domains and surfaces
- Related code areas:
  - `docs/*`
  - `apps/*`
  - `packages/*`
  - `tests/*`
- Related future documents:
  - all future document inventory rows in `docs/master-control/master-document-manifest.md`

# Purpose

Detta dokument är den operativa skrivtrackern för hela dokumentprogrammet. Manifestet är fortfarande den kanoniska listan över vilka dokument som måste finnas, men denna fil visar faktiskt repo-läge.

# Source of truth

## Kanonisk inventarielista

Den enda kanoniska inventarielistan för framtida dokument är:

- `docs/master-control/master-document-manifest.md`

## Kanonisk byggordning

Den enda kanoniska byggordningen är:

- `docs/master-control/master-build-sequence.md`

## Kanonisk styrbas

Följande dokument utgör den låsta styrbasen:

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

# Current repository status

## Locked state as of 2026-03-24

- master-control-paketet finns i repo:t
- block 1-dokumenten finns i repo:t
- block 2-dokumenten finns i repo:t
- block 3-dokumenten finns i repo:t
- block 4-5 återstår
- inga blockerande block-1- eller block-2-dokument lever bara i chatten eller i `Downloads`

## Document-writing state

- MCP-001 till MCP-011: present in repo
- Future ADRs: in progress
- Future compliance docs: in progress
- Future domain/product specs: in progress
- Future policies: in progress
- Future UI specs: in progress
- Future runbooks: in progress
- Future test plans: in progress
- Existing full replacements: in progress

# Execution rules for documentation phase

1. Alla framtida dokument ska skrivas direkt i repo:t.
2. Inget framtida dokument är klart om det inte finns som faktisk fil på sin manifestpath.
3. Ingen implementation får springa före blockerande dokument för sitt område.
4. Om ett nytt dokumentbehov upptäcks ska manifestet uppdateras först.
5. Replace betyder full ersättning, inte halvuppdatering.
6. Split-replace får inte verkställas förrän alla efterträdare finns.

# Writing control by block

## Block 1

- Status: completed in repo
- Block source: binding `Future writing order` in `docs/master-control/master-document-manifest.md`
- Implementation rule: block 1 är nu låst och får användas som faktisk byggbas

## Block 2

- Status: completed in repo
- Block source: binding `Future writing order` in `docs/master-control/master-document-manifest.md`
- Implementation rule: block 2 är nu låst och får användas som grund för kärnexpansioner

## Block 3

- Status: completed in repo
- Block source: binding `Future writing order` in `docs/master-control/master-document-manifest.md`
- Implementation rule: avancerade finansiella och personrelaterade arbetsytor får nu byggas vidare endast mot de frysta block-3-dokumenten

## Block 4

- Status: not started in repo
- Block source: binding `Future writing order` in `docs/master-control/master-document-manifest.md`
- Implementation rule: inga workbenches, mobile-ytor eller backoffice-ytor får slutlåses före blockerande block-4-dokument

## Block 5

- Status: not started in repo
- Block source: binding `Future writing order` in `docs/master-control/master-document-manifest.md`
- Implementation rule: ingen pilot readiness eller annual/close-slutlåsning får ske före blockerande block-5-dokument

# Practical next step

Nästa korrekta steg är:

1. skriva hela block 3
2. därefter block 4
3. därefter block 5

# Exit gate

Detta dokument är uppfyllt först när:

- varje blockstatus speglar verkliga filer i repo:t
- inga blockerande dokument bara finns utanför repo:t
- implementation hålls tillbaka tills respektive block verkligen finns
