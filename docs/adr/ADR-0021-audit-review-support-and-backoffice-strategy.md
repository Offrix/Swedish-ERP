> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0021 — Audit review, support and backoffice strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Support och administration behöver kunna felsöka komplexa reglerade flöden.
- Samtidigt är supportåtkomst, impersonation och break-glass högriskfunktioner som måste styras hårt.
- Revision, incidenthantering och access reviews kräver en sammanhållen backoffice-modell.

## Decision

- Vi bygger ett separat admin backoffice med audit explorer, support cases, access review, impersonation och kontrollerad diagnostics.
- Alla skrivande supportåtgärder ska gå via officiella domänkommandon, aldrig via dolda direktingrepp.
- Impersonation och break-glass ska vara tidsbegränsade, godkända och fullt auditerade.
- Access review ska ske som snapshot-batcher med findings, remediation och sign-off.
- Feature toggles, replay/retry och känsliga operatörsåtgärder ska vara synliga men policybundna i backoffice.

## Alternatives considered

- Spridda adminvyer i varje domän avvisades eftersom det ger ojämn kontroll och svag SoD.
- Full read/write-databasåtkomst för support avvisades eftersom det är oförenligt med auditkraven.
- Frånvaro av impersonation avvisades eftersom vissa supportfall då inte kan felsökas, men obegränsad impersonation avvisades av säkerhetsskäl.

## Consequences

- Policies för supportåtkomst, impersonation och break-glass blir obligatoriska.
- Testplan för audit review och SoD måste genomföras före pilot.
- Backoffice får eget ansvar för loggning, moderering av actions och eftergranskning.

## Verification

- [ ] supportåtgärder begränsas till tillåten allowlist
- [ ] impersonation och break-glass kräver rätt godkännanden och tidsgränser
- [ ] audit explorer kan följa incident, supportcase och adminactions
- [ ] access reviews kan genereras, granskas och signeras
- [ ] replay/retry från backoffice följer domänpolicy och SoD

