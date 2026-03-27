> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0020 — Migration, parallel run and cutover strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Pilot- och go-live-faser kräver kontrollerad migrering från tidigare system.
- Kunder och interna team behöver kunna se differenser och förstå varför go-live anses säkert.
- Rollback måste vara planerad innan switch, inte improviserad efter fel.

## Decision

- Vi inför en migration cockpit med importbatch, mapping set, diff report, cutover plan och go-live evidence.
- Parallellkörning ska vara default för kunder där historiskt jämförelseunderlag finns.
- Differenser klassas efter materialitet och måste granskas per domän.
- Cutover får bara ske när accept gate är grön och verifierad rollback point finns.
- Manuella korrigeringar ska vara separata, versionsstyrda och auditerade.

## Alternatives considered

- Direkt cutover utan parallellkörning avvisades för de flesta kundsegment eftersom differenser då upptäcks för sent.
- Ostrukturerad filimport utan mapping governance avvisades eftersom spårbarhet och återkörbarhet blir för svag.
- Rollback via ad hoc-databasingrepp avvisades eftersom det inte är reproducerbart.

## Consequences

- FAS 14 behöver egna runbooks och testplaner för migrering.
- Kunder måste acceptera vissa beviskrav innan go-live.
- Objekt-för-objekt-spårning blir ett grundkrav för importdomäner.

## Verification

- [ ] batcher, mappings och diff reports kan reproduceras
- [ ] materiella differenser blockerar cutover
- [ ] rollback point finns före switch
- [ ] cutover och rollback är övade i runbook och testplan
- [ ] go-live evidence kan granskas i efterhand

