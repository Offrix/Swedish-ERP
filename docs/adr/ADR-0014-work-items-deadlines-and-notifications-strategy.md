> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0014 — Work items, deadlines and notifications strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Flera domäner genererar uppgifter, påminnelser och blockerande väntelägen.
- Utan en gemensam modell riskerar systemet dubletter, otydligt ägarskap och inkonsekvent eskalering.
- Close, submission, bank och byråflöden kräver spårbara deadlines och explicita blockers.

## Decision

- Vi inför en gemensam arbetsobjektsmotor med work item, assignment, reminder plan, escalation och blocker.
- Deadline härleds alltid från sparade regler eller källa och versionsstämplas.
- Manuella och automatiska uppgifter använder samma statusmodell och samma auditkrav.
- Blockers ska kunna kopplas till close, submission, betalning och andra högre processer.
- Notifieringar ska vara kanaloberoende men drivas av samma reminder- och eskaleringslogik.

## Alternatives considered

- Domänspecifika uppgiftslistor avvisades eftersom de skulle ge olika regler för kvittens, snooze och audit.
- Ren notifieringsmodell utan egna arbetsobjekt avvisades eftersom ansvar, blockerstatus och reopen då blir otydligt.
- E-post som primär uppgiftslista avvisades eftersom den inte kan bära deterministisk state machine.

## Consequences

- Alla domäner som kräver mänsklig action måste publicera tydliga task policies.
- Operatörs- och manager-vyer behöver byggas ovanpå gemensam task-query.
- Eskalering och blocker severity blir styrande för flera faser i master verification-gates.

## Verification

- [ ] arbetsobjekt kan skapas idempotent från flera domänhändelser
- [ ] deadlines kan härledas och reproduceras
- [ ] snooze, escalation och blockerlogik följer policy
- [ ] notifieringsleverans är skild från task-state
- [ ] reopen och close lämnar fullständig historik

