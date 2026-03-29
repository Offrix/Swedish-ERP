> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0016 — Feature flags, rollout and kill-switch strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Produkten behöver kunna rulla ut eller stänga av funktioner utan kodrollback, särskilt för externa integrationer, pilotkunder och reglerade flöden.
- Samtidigt får feature flags inte bli dold affärslogik utan ägare eller audit.
- Vissa flöden kräver omedelbar nödbrytare vid incident.

## Decision

- Vi inför central feature-flag-modell med tydlig ägare, scope, typ, ändringshistorik och utgångsdatum.
- Flags delas in i release flags, ops flags, entitlement flags och kill switches.
- Kill switches ska kunna stänga av riskfyllt beteende omedelbart och vara synliga i admin backoffice.
- Alla flaggändringar i produktion ska auditloggas och vissa klasser kräver fyrögonsgodkännande.
- Flags får styra åtkomst till kodväg eller integration men inte ersätta domänregler i data.

## Alternatives considered

- Miljövariabler som enda mekanism avvisades eftersom de saknar granulärt scope, audit och snabb återställning.
- Klientkodade experimentflaggor utan serverstöd avvisades för reglerade flöden.
- Hård branching per kund avvisades eftersom det ökar långsiktig komplexitet.

## Consequences

- Vi behöver policy för livslängd, godkännande och städning av flags.
- Admin backoffice och runbooks måste kunna visa flaggstatus, ägare och påverkat scope.
- Testplaner måste omfatta rollback och emergency disable.

## Verification

- [ ] flags har typ, ägare, scope och utgångsdatum
- [ ] kill switch kan stänga av definierat flöde utan deploy
- [ ] produktionsändringar är auditloggade och godkända enligt policy
- [ ] flaggberoende funktioner kan testas i rollout- och rollback-scenarier
- [ ] utgångna eller övergivna flags kan identifieras och avvecklas

