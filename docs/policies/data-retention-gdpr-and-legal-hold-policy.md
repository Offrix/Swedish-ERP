> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Data retention, GDPR and legal hold policy

Detta dokument definierar retention per objekttyp, anonymisering och radering, legal hold, loggretention, dokumentretention, råmail-retention och hur personuppgiftsbegäran hanteras.

## Scope

- personuppgifter, ekonomiska objekt, dokument, loggar, backups och legal hold
- alla miljöer, men särskilt staging och produktion där verklig eller realistisk kunddata kan förekomma

## Policy

### Retention per objekttyp

| Objekttyp | Retention | Kommentar |
| --- | --- | --- |
| Huvudbok, verifikationer, AR/AP-open items, momsunderlag, AGI/HUS-underlag, fakturor och bokföringsunderlag | Minst 7 år efter utgången av det kalenderår då räkenskapsåret avslutades | Ingen radering så länge rättslig bevarandeplikt gäller. |
| Råmail kopplat till bokföringsunderlag | Samma som bokföringsunderlag | Råmail blir del av revisionsspåret när det utgör underlag. |
| Råmail som aldrig blir bokföringsunderlag | 180 dagar | Kan kortas om spam eller policybrott identifieras. |
| Dokument i karantän | 90 dagar eller tills incident/ärende avslutas | Förlängs av legal hold eller incidentbehov. |
| Auditlogg för högriskactions | 7 år | Gäller betalningssläpp, sign-off, rolländringar, break-glass och känsliga objekt. |
| Vanliga applikationsloggar | 30 dagar hot lagring | Loggar ska vara redigerade och inte bära rå PII. |
| Security-eventloggar | 24 månader | Kan exporteras längre vid incident eller legal hold. |
| Produktanalys och feature-flag events | 14 månader | Endast redigerad eller pseudonymiserad data. |
| Supportärenden | 24 månader efter stängning | Längre vid pågående tvist eller legal hold. |
| Backupkopior | Rullande enligt DR-policy | Selektiv radering görs normalt inte i backup; hold hanteras separat. |

### GDPR, anonymisering och radering

- Begäran om registerutdrag, rättelse och radering ska tas emot i ett spårbart ärende.
- Svar ska lämnas inom lagens tidsram. Radering får nekas eller begränsas när fortsatt behandling krävs för rättslig förpliktelse, bokföringsskyldighet, rättsliga anspråk eller annan legitim grund.
- När radering inte får ske ska produkten i stället begränsa behandling, maskera onödiga fält och förklara lagstödet för fortsatt bevarande.
- Analys- och supportsystem ska i första hand använda pseudonymiserade eller minimerade data.

### Legal hold

- Legal hold kan läggas på kund, bolag, dokumentklass, period, användare eller ärende.
- När legal hold aktiveras ska automatiska raderingsjobb stoppas för berörda objekt.
- Hold ska ha ägare, orsak, startdatum, omfattning och beslut om när omprövning sker.
- Om backupmedier inte kan modifieras selektivt ska hold säkras genom förlängd bevaring eller särskild kopia i hold-lager.

### Råmail och dokument

- Råmail som bildar underlag till bokföring eller annat revisionspliktigt flöde får inte förstöras före slut på rättslig retention.
- Dokumentversioner får inte tyst gallras så att det blir omöjligt att förstå hur ett beslut eller en bokning uppstod.
- Raderade användaruppladdningar som inte blivit ekonomiskt underlag ska tas bort både från metadata och objektlagring när retention löpt ut.

## Undantag

- Incident, tvist, myndighetsförfrågan eller legal hold överstyr normal gallring.
- Gallring får skjutas upp när säker destruktion inte kan garanteras i en viss miljö, men detta måste dokumenteras.

## Obligatoriska bevis och loggar

- retention-scheman per objekttyp
- ärendeloggar för registerutdrag, rättelse och radering
- legal hold-register med beslut och omprövningsdatum
- bevis för körd gallring och eventuella fel i gallringsjobb

## Review cadence

- kvartalsvis genomgång av retention-scheman och legal holds
- månadsvis rapport över misslyckade gallringsjobb
- årlig granskning av om produktanalys och supportdata fortfarande är dataminimerade

