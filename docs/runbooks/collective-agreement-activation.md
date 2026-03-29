> Statusnotis: Detta dokument Ã¤r inte primÃ¤r sanning. Bindande styrning fÃ¶re UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument Ã¤r historiskt input- eller stÃ¶ddokument och fÃ¥r inte Ã¶verstyra dem.
# Collective agreement activation verification

## Syfte

Verifiera att aktivering av kollektivavtal till employment alltid bygger pa publicerad catalog entry eller approved local supplement och att overlay-regler slar igenom deterministiskt.

## Forkrav

- phase 11.1 och 11.2 ar verifierade
- minst en publicerad catalog entry finns
- minst en employee och employment finns i HR

## Steg for steg

1. Kor riktade agreement- och people/time-base-tester:
   - `node --test tests/unit/phase18-collective-agreements.test.mjs`
   - `node --test tests/unit/phase20-people-time-base.test.mjs`
   - `node --test tests/integration/phase20-people-time-base-api.test.mjs`
2. Verifiera publicerad assignment:
   - `POST /v1/collective-agreements/assignments` med `agreementCatalogEntryId`
3. Verifiera local supplement assignment:
   - `POST /v1/collective-agreements/assignments` med `localAgreementSupplementId`
4. Verifiera active lookup:
   - `GET /v1/collective-agreements/active`
5. Verifiera overlay:
   - supplement-overlays och assignment-overrides maste ge forvantad ruleSet i aktiv evaluation
6. Verifiera people/time base:
   - employment/time-base ska se aktiv agreement overlay for ratt datum

## Required assertions

- assignment far inte peka pa opublicerad version
- local supplement far bara anvandas for godkant employmentscope
- overlay muterar inte publicerad basversion
- active lookup visar catalog entry och local supplement nar de ar aktiva

## Exit gate

- publicerad assignment fungerar
- supplement-assignment fungerar
- active agreement-lookup ar datumstyrd och deterministisk
- people/time-base far ratt agreement overlay
