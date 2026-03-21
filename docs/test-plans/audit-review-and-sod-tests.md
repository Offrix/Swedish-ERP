# Audit review and SoD tests

## Mål

Målet är att verifiera att audit explorer, access review, supportåtkomst, impersonation, break-glass och SoD-kontroller fungerar så att varje känslig åtgärd kan granskas och att otillåtna kombinationer upptäcks eller blockeras.

## Scope

- audit trail och audit explorer
- access review, rollgranskning, delegationer och SoD-matriser
- support backoffice, impersonation, break-glass och tillåtna adminåtgärder
- rapportering och incidentanvändning av granskningsspår

## Fixtures

- användaruppsättningar med interna admins, support, konsulter, attestanter, betalningsgodkännare och klientanvändare
- definierade SoD-konflikter mellan till exempel skapa/godkänna/betala/sända
- fixtures för tillåten och otillåten impersonation samt break-glass
- incident- och supportscenarier där auditspåret måste rekonstrueras

## Testlager

1. Unit tests för audit-eventformat, maskning, retentionklass och SoD-regler.
2. Integrations- och komponenttester för admin backoffice, audit explorer och access review-flöden.
3. Contract tests för exportformat, auditfiltrering och access review-artefakter.
4. E2E-tester där användare utför känsliga actions och granskningskedjan följs i efterhand.
5. Security- och policytester för supportåtkomst och tidsbegränsade sessioner.

## Golden data

- golden auditkedjor för login, delegation, godkännande, payment, submission, feature-flag-ändring och break-glass
- golden SoD-matriser med förväntade blockerande respektive tillåtna rollkombinationer
- golden access review-rapporter med spårbart granskningsutfall

## Kontraktstester

- verifiera att audit-API returnerar fullständiga och maskade poster enligt roll
- verifiera att impersonation och break-glass kräver rätt metadata, tidsgräns och godkännande
- verifiera att SoD-kontroller exponerar tydlig kod/orsak för blockerad kombination
- verifiera att supportverktyg inte kan använda dolda API-vägar för förbjudna actions

## E2E-scenarier

- utför skapa/godkänn/betala-kedja med rollseparation och verifiera auditspår samt att konfliktfall blockeras
- starta tillåten impersonation, använd läsläge, avsluta session och verifiera auditposter
- försök otillåten supportaction som skulle ändra affärsbeslut; verifiera blockering och audit
- kör access review över vald period och verifiera att alla högriskroller och delegationer presenteras
- använd auditspår under simulerad incident och verifiera att händelsekedjan kan rekonstrueras utan luckor

## Prestanda

- mäta audit explorer-sökning över stora datamängder
- verifiera att auditexport och access review-körning ryms inom driftkrav
- mäta effekten av SoD-kontroller på kritiska API-responstider

## Felvägar

- auditluckor mellan användaraction och side effect
- maskning saknas för känsliga fält
- support kan skriva där endast läsning borde vara tillåten
- break-glass kan aktiveras utan eftergranskning
- SoD-konflikt fångas inte förrän efter utförd action

## Acceptanskriterier

- alla definierade känsliga actions ger komplett auditkedja
- SoD-konflikter blockeras eller flaggas enligt policy
- supportåtkomst, impersonation och break-glass är strikt begränsade och granskningsbara
- access review kan genomföras reproducerbart och resulterar i tydligt sign-off-underlag

## Exit gate

Testplanen är klar när granskningsspår, SoD-kontroller och supportbegränsningar bevisligen stödjer både intern kontroll och incidentutredning.
