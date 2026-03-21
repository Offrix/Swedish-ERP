# Access, attestation and sign-off policy

Detta dokument definierar vem som får attestera, betala, skicka AGI, moms och HUS, hur delegation fungerar, vilka fyrögonkrav som gäller och hur sign-off per domän ska ske.

## Scope

- alla actions som skapar, attesterar, betalar, lämnar externa rapporter eller låser perioder
- alla användare med rollerna company_admin, approver, payment_operator, payment_approver, tax_operator, tax_signatory, close_signatory, security_admin och break_glass

## Behörighetsmatris

| Förmåga | Minsta roll | Separationskrav | Step-up/MFA | Delegation |
| --- | --- | --- | --- | --- |
| Registrera leverantörsfaktura | ap_preparer eller motsvarande | Får inte ensam slutattestera högriskfaktura | Ordinarie session | Ja, upp till 30 dagar |
| Slutattestera leverantörsfaktura | approver eller budgetägare | Ska vara annan person än preparer över policygräns | Ja vid högrisk eller belopp över tröskel | Ja, tidsbegränsad |
| Skapa betalningsförslag | payment_operator | Får inte ensam också släppa samma batch till bank | Ja | Ja, tidsbegränsad |
| Frisläppa betalningsbatch | payment_approver | Måste vara annan person än batchskapare och annan än den som ändrat bankuppgift inom karensfönster | Färsk stark auth högst 5 minuter gammal | Nej, endast ersättare med särskilt beslut |
| Lämna AGI/moms/HUS | tax_signatory | Den som förberett underlaget bör inte ensam signera om policy kräver dubbla ögon | Färsk stark auth | Ja, max 30 dagar |
| Hard close sign-off | close_signatory eller finance manager | Minst två ögon om perioden innehåller waivers eller materiella differenser | Färsk stark auth | Ja, tidsbegränsad |
| Ändra leverantörs bankuppgifter | company_admin eller masterdata_admin | Förändringen måste granskas av annan person före nästa betalning | Färsk stark auth | Nej |
| Break-glass åtkomst | security_admin med incidentroll | Får inte självgodkännas | Separat stark auth och incident-id | Nej |

## Policy

### Grundregler

- Ingen användare får ha permanent rätt att ensam skapa, attestera och betala samma leverantörsbetalning.
- Ingen användare får ensam skapa och slutattestera manuell journal mot kontrollkonto över definierad beloppsgräns.
- AGI, moms, HUS och period-close sign-off ska vara explicit knutna till namngiven roll, aldrig till delad inkorg eller delat konto.
- Delegation ska vara tidsbegränsad, rollbegränsad och spårbar. Delegation får inte vara öppen utan slutdatum.
- När delegation upphör ska rättigheten återkallas automatiskt utan manuellt steg.

### Fyrögonsprincip och SoD-konflikter

- Fyrögonsprincip krävs alltid för nya leverantörsbankuppgifter, betalningsfrisläpp, hard close med differenser samt break-glass åtkomst.
- Systemet ska aktivt flagga SoD-konflikter, till exempel om samma person både registrerat leverantör och släpper dess första betalning.
- SoD-konflikt får endast överbryggas genom dokumenterad override med reason code och högre sign-off-nivå.

### Break-glass

- Break-glass används endast vid aktiv incident där ordinarie åtkomst inte räcker.
- Varje break-glass-session ska ha incidentnummer, ansvarig godkännare, start/slut och eftergranskning nästa arbetsdag.
- Break-glass-session har max 60 minuters absolut livslängd och 15 minuters idle timeout.

### Domänsign-off

- AP-sign-off kräver att attestkedjor är fullföljda och att 2450-reserver med ålder över policygräns är förklarade.
- AR-sign-off kräver att överbetalningar, tvister och write-offs är dokumenterade.
- Tax-sign-off kräver att moms-, AGI- eller HUS-underlag är låsta och att eventuella rättelser är kända.
- Close-sign-off kräver att bank, AR, AP, moms, suspense, manuella journaler och återstående waivers är synliga i close-paketet.

## Undantag

- Tillfälligt undantag från separationskrav kräver skriftligt beslut av bolagets utsedda signatory eller CFO-liknande roll.
- Undantag får vara tidsbegränsat och ska omprövas senast vid nästa close.

## Obligatoriska bevis och loggar

- attestlogg med användare, roll, delegation, tidsstämpel och MFA-recency
- auditlogg för ändring av bankuppgifter, roller, delegationer och sign-off
- SoD-konfliktlista och månatlig granskning
- break-glass-rapporter med incidentnummer och eftergranskning

## Review cadence

- veckoöversyn av högriskactions som betalningssläpp, bankändringar och break-glass
- månatlig genomgång av SoD-konflikter och roller
- kvartalsvis accessattestering per bolag och administrativ domän
