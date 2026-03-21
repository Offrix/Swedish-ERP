# Support access and impersonation policy

## Syfte

Detta dokument definierar när supportåtkomst, impersonation och break-glass får användas, vilka spärrar som gäller och vilka supportåtgärder som är tillåtna. Policyn ska skydda kunddata, SoD och revisionsspår samtidigt som support kan lösa legitima problem.

## Gäller för

- support admins, support leads, security admins, incident command och övriga administratörer
- alla supportärenden, impersonation-sessioner, break-glass-sessioner och diagnostiska adminåtgärder
- alla miljöer med särskilt fokus på staging och produktion

## Hårda regler

1. All supportåtkomst ska vara knuten till ett supportärende med tydligt syfte och scope.
2. Support får endast använda fördefinierade tillåtna actions och officiella domänkommandon.
3. Impersonation får vara read-only som standard; skrivande impersonation kräver särskild motivering och högre godkännande.
4. Break-glass får endast användas vid aktiv incident där ordinarie åtkomst inte räcker.
5. Support får aldrig använda kundens eller annan användares delade credentials.
6. Support får inte godkänna betalningar, sign-offs eller submissions i stället för kundens ordinarie beslutsroller.
7. Alla känsliga supportåtgärder ska vara fullt auditloggade och eftergranskade.

## Roller och ansvar

- **Support admin** hanterar normala supportärenden inom allowlist.
- **Support lead** godkänner högre riskåtgärder och eskalerade ärenden.
- **Security admin** godkänner impersonation med write-mode, break-glass och access-relaterad remediation.
- **Incident commander** initierar break-glass under incident.
- **Compliance reviewer** granskar i efterhand att policy följts.

## Tillåtna actions

- läsa systemstatus, auditspår, jobbhistorik och tekniska fel inom case-scope
- köra godkända diagnoskommandon
- initiera teknisk retry eller replay via officiell runbook
- starta read-only impersonation efter godkännande där policy kräver det
- avsluta och dokumentera supportärenden

## Förbjudna actions

- direkt databasändring som inte går via styrda procedurer
- skrivande impersonation utan godkännande
- användning av supportåtkomst för nyfikenhetsläsning eller generell övervakning
- att maskera eller radera auditspår
- att utföra affärsgodkännanden i kundens namn

## Undantag

- break-glass vid incident får temporärt ge utökad åtkomst, men sessionen måste vara tidsbegränsad och eftergranskas
- i testmiljö kan viss bredare åtkomst tillåtas för felsökning, men produktionens impersonation- och auditkrav ska efterliknas så långt möjligt

## Godkännanden

- vanlig read-only diagnostics: support admin inom case-scope
- känslig diagnostics eller read-only impersonation: support lead
- write-capable impersonation: support lead plus security admin
- break-glass: incident commander plus separat godkännare enligt policy

## Audit

- varje supportärende, godkännande, diagnostics-kommando, impersonation-session och break-glass-session ska auditloggas
- audit ska innehålla syfte, ärende-id, målidentitet, tidsfönster, godkännare och utförda actions
- eftergranskning ska dokumenteras för alla högriskåtgärder

## Kontrollpunkter

- daglig genomgång av aktiva impersonation- och break-glass-sessioner
- veckovis genomgång av högrisk-supportärenden
- kvartalsvis access review av support- och adminroller
- stickprovskontroll av att supportärenden har korrekt scope och avslutsnotering

## Exit gate

- [ ] supportåtkomst kräver spårbart ärende och definierat scope
- [ ] impersonation och break-glass följer godkännanderegler
- [ ] förbjudna actions kan inte utföras via vanliga supportverktyg
- [ ] alla högriskåtgärder eftergranskas
- [ ] auditkedjan räcker för incident, revision och internkontroll
