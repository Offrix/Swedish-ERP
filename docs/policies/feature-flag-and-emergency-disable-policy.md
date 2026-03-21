# Feature flag and emergency disable policy

## Syfte

Detta dokument definierar hur feature flags, rollout-flaggor och nödbrytare får skapas, ändras, godkännas, övervakas och avvecklas. Policyn ska säkerställa att flaggor används som styrd driftmekanism och inte som dold permanent affärslogik.

## Gäller för

- alla feature flags, rolloutflaggor, ops-flaggor, entitlement-flaggor och kill switches
- alla miljöer, men med skärpta krav i staging och produktion
- alla användare med roller som kan skapa, ändra eller godkänna flaggar

## Hårda regler

1. Varje flagga ska ha namngiven ägare, tydligt syfte, scope, riskklass och planerat slutdatum.
2. Produktionsflaggor får inte ändras utan auditlogg och dokumenterad motivering.
3. Kill switches för riskfyllda flöden ska finnas för betalningar, submissions, externa integrationer och andra definierade högriskområden.
4. Feature flags får styra åtkomst till kodväg eller integration men får inte ersätta lagrad affärsregel i data.
5. Högriskändringar i produktion kräver fyrögonsgodkännande, utom vid aktiv incident där emergency disable får utföras enligt denna policy.
6. Utgångna eller övergivna flaggor ska städas bort; permanenta affärsbeslut ska föras in i ordinarie konfiguration eller kod.
7. Flagga får inte aktivera experiment som exponerar känslig data för fel målgrupp.

## Roller och ansvar

- **Flag owner** ansvarar för syfte, rolloutplan, avveckling och testbevis.
- **Product/admin operator** får skapa och ändra låg- och medelriskflaggor inom sitt scope.
- **Security admin** godkänner högriskflaggor och alla kill switches i produktion.
- **Incident commander** får aktivera emergency disable under pågående incident.
- **Reviewer** genomför fyrögonsgranskning när policyn kräver det.

## Tillåtna actions

- skapa ny flagga med komplett metadata
- aktivera flagga i dev eller lokal miljö utan extra godkännande
- stegvis rollout mot definierade bolag, team eller procentandel i icke-reglerade ytor
- omedelbar avstängning med kill switch enligt runbook när incident eller allvarlig regressionsrisk finns
- läsa flaggstatus och flagghistorik i admin backoffice

## Förbjudna actions

- dold flagga utan ägare eller utgångsdatum
- tyst ändring i produktion utan auditpost
- användning av flagga för att kringgå behörighet, sign-off eller bokföringsinvarians
- evig experimentflagga som aldrig städas
- massaktivering i produktion av högriskflagga utan förtest eller godkännande

## Undantag

- emergency disable under aktiv incident får göras utan föregående fyrögonsgodkännande, men måste eftergranskas samma dag eller nästa arbetsdag
- i isolerad sandbox får flagga användas mer fritt, men metadata och städning krävs ändå om flaggan senare ska flyttas till staging eller produktion

## Godkännanden

- låg risk: flag owner
- medelrisk: flag owner plus reviewer
- hög risk: flag owner plus security admin
- kill switch i normaldrift: flag owner plus security admin
- kill switch under incident: incident commander, med eftergranskning av security admin och flag owner

## Audit

- skapande, ändring, aktivering, deaktivering, emergency disable och avveckling ska auditloggas
- auditpost ska innehålla flaggnamn, gammalt och nytt värde, scope, motivering, ärende- eller incident-id och godkännare
- systemet ska kunna visa vilka bolag eller användare som påverkades av en flaggändring

## Kontrollpunkter

- veckovis rapport över högriskflaggor, utgångna flaggor och aktiva kill switches
- krav på testbevis före rollout i staging och produktion
- kontroll att rollback- eller disable-runbook finns för varje högriskflagga
- månadsvis städning av föråldrade flaggor

## Exit gate

- [ ] alla flaggor har ägare, scope och slutdatum
- [ ] högriskflaggor och kill switches följer godkännandekedja
- [ ] emergency disable kan köras snabbt men granskas i efterhand
- [ ] flagghistorik kan granskas i audit explorer
- [ ] övergivna flaggor fångas och avvecklas
