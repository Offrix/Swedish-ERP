# Incident response and production hotfix

Detta runbook beskriver incidentnummer, ansvar, kommunikationsväg, freeze-regler, databasingrepp, eftertest och dokumentuppdatering efter incident.

## Förutsättningar

- incidentpolicy och kontaktlista är beslutad
- monitoring, alerting och deploypipeline finns
- break-glass-rutin finns om ordinarie åtkomst inte räcker

## Berörda system

- incidentkanal i kommunikationsverktyg
- observability-stacken
- deploypipeline
- produktens databaser och objektlagring

## Steg för steg

### Initiera incident

1. Skapa incidentnummer och öppna dedikerad incidentkanal.
2. Utse incidentledare, tekniskt ansvarig, kommunikationsansvarig och scribe.
3. Bedöm preliminär severity och om deploy freeze ska aktiveras.

### Stabilisera

1. Stoppa eller begränsa felande automationer via feature flag eller maintenance mode.
2. Samla första fakta: starttid, omfattning, påverkade kunder, datatyper och aktiva fel.
3. Avgör om det är säkerhetsincident, driftincident eller båda.

### Hotfix i prod

1. Skapa hotfix-branch med incidentnummer i namnet.
2. Begränsa ändringen till minsta möjliga fix.
3. Kör riktade tester och minst en review om inte absolut nödläge dokumenterats.
4. Deploya till staging om tid finns, annars direkt till prod med explicit incidentgodkännande och tydlig rollback-plan.

### Databasingrepp

1. Manuella databasingrepp i prod kräver särskilt godkännande av incidentledare och finance/security owner när ekonomidata påverkas.
2. All SQL eller manuellt ingrepp ska loggas och sparas i incidentartefakter.
3. Stäng av konkurrerande workers innan direkta datakorrigeringar görs.

### Eftertest och avslut

1. Kör smoke tests på påverkade flöden och kontrollera metrics, logs, traces och felgrad.
2. Verifiera om externa rapporter, betalningar eller dokumentflöden påverkats och behöver efterkorrigeras.
3. När incidenten stängs ska postmortem, regressionstest och dokumentuppdatering planeras eller genomföras.

## Verifiering

- incidentnummer och roller är satta
- freeze-status är tydlig
- hotfix eller mitigering kan kopplas till observability-data
- alla manuella prod-ingrepp finns i incidentloggen
- eftertest och uppföljning är dokumenterade

## Rollback och återställning

- rulla tillbaka senaste deploy eller stäng feature flag om hotfixen gör läget sämre
- om databasingrepp misslyckas, återgå till senaste verifierade tillstånd eller använd definierad datarollback enligt DR-runbook
- håll maintenance mode aktivt tills användartrafik kan släppas säkert

## Vanliga fel och felsökning

### Kommunikationsfel

- incidentnummer saknas eller blandas ihop mellan ärenden
- oklar ansvarsfördelning gör att samtidiga fixar körs utan samordning

### Tekniska fel under hotfix

- hotfix ändrar för mycket scope och introducerar nya fel
- rollback-plan är inte förberedd
- workers kör samtidigt som databasingrepp och skapar nya inkonsistenser

## Exit gate

- [ ] incidentteam och kommunikationsväg kan startas snabbt
- [ ] freeze och hotfix har tydlig process
- [ ] manuella prod-ingrepp dokumenteras
- [ ] eftertest och postmortem är obligatoriska
- [ ] relevanta docs, runbooks och tester uppdateras efter incident
