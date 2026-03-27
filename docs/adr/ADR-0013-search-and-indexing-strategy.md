> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0013 — Search and indexing strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Produkten behöver snabb global sökning över många objekttyper utan att göra källdomänerna beroende av tung ad hoc-frågelogik.
- Samma objekt måste kunna visas olika beroende på bolagsscope, objekträttigheter och sekretessklass.
- Indexet får inte bli sanningskälla för ekonomiska beslut, men måste vara tillräckligt färskt för operativ användning.

## Decision

- Vi inför ett separat, asynkront sökindex byggt från outbox- och projektionsevents från källdomänerna.
- Varje indexdokument ska bära objekttyp, versionsnummer, permission-scope, filterpayload och tillåtna snippetfält.
- Global search ska kombinera fritext och strukturerade filter men alltid tillämpa permissions trimming innan resultat och snippets returneras.
- Saved searches och saved views ska vara egna domänobjekt med kompatibilitetskontroll mot schemaversioner.
- Full reindex, delreindex och tombstone-semantik ska vara förstaklassiga operativa funktioner.

## Alternatives considered

- Direkt sökning mot primärdatabasen avvisades eftersom det skulle ge sämre prestanda, sämre isolering mellan domäner och svårare ranking.
- Per-domänsök utan globalt lager avvisades eftersom användaren då skulle behöva veta var varje objekt bor innan sökning.
- Klientside-cache som huvudlösning avvisades eftersom den inte kan ge säker permissions trimming eller stabil reproducerbarhet.

## Consequences

- Domänerna måste publicera versions- och permissionsrelevanta events när sökbara objekt ändras.
- Search blir eventual consistent och måste därför ha tydliga stale-data-regler.
- Administrativa reindex- och reparationsrunbooks blir obligatoriska.
- Säkerhetsgranskning av indexerade fält och snippets blir en egen styrd aktivitet.

## Verification

- [ ] sökindex kan återskapas fullständigt från källdomänernas projektioner
- [ ] permissions trimming blockerar otillåten dataexponering
- [ ] exakta id-träffar rankas före generell fritext
- [ ] saved searches och views överlever schemauppgraderingar eller markeras trasiga
- [ ] reindex kan köras per bolag, objekttyp och globalt utan datakorruption

