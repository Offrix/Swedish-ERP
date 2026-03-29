> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Ubiquitous language

Detta dokument definierar de ord som ska användas konsekvent i kod, databas, dokumentation, tester och UI. Om ett ord saknas här ska det läggas till innan större implementation fortsätter.

## Grundprinciper

- Ett begrepp ska ha ett namn.
- Samma namn ska betyda samma sak överallt.
- Synonymer i UI får förekomma, men det tekniska domännamnet ska vara ett.
- Engelska paketnamn och kodnamn får användas, men svenska affärsbegrepp ska mappas tydligt hit.

## Organisation och identitet

### Bolag / Company
Den juridiska enhet vars bokföring, rapportering och behörigheter systemet hanterar.

### Bolagsanvändare / Company User
Kopplingen mellan en användare och ett bolag inklusive roll, start/slutdatum och status.

### Roll
En rättighetsprofil, till exempel `company_admin`, `approver`, `payroll_admin`, `field_user`, `bureau_user`.

### Delegation
Tidsbegränsad överlåtelse av definierad befogenhet, till exempel attest eller sign-off.

### Attestkedja
Ordning av godkännare för ett objekt eller en handling.

## Dokument och inkommande material

### Dokument
En logisk enhet som representerar ett underlag, till exempel en faktura, ett kvitto, ett avtal eller ett läkarintyg.

### Dokumentversion
En specifik lagrad version av ett dokument eller ett derivat, till exempel originalfil, OCR-PDF eller thumbnail.

### Originalfil
Den första lagrade filen som tas emot av systemet. Får aldrig skrivas över.

### Derivat
Maskinellt skapad variant av ett dokument: OCR-text, klassificering, renderad PDF, thumbnail med mera.

### Dokumentlänk
Koppling mellan dokument och affärsobjekt, till exempel leverantörsfaktura, verifikation eller anställd.

### Företagsinbox
E-postingång eller importkanal kopplad till ett bolag och ett användningsområde, till exempel AP, kvitton eller lönedokument.

### Granskningskö
Kö där dokument med låg confidence eller konflikter väntar på mänsklig granskning.

## Redovisning och ledger

### Konto / Account
Bokföringskonto i bolagets kontoplan.

### Kontoklass
Övergripande gruppering av konton, tillgångar/skulder/intäkter/kostnader.

### Verifikationsserie / Voucher Series
Nummersekvens och bokstavskod för verifikationer av en viss typ.

### Verifikation / Journal Entry
Balanserad bokföringshändelse med journaldatum, serie, nummer och rader.

### Verifikationsrad / Journal Line
En rad i en verifikation med konto, belopp, dimensioner och källspårning.

### Posting Intent
Domänobjekt som beskriver vad som ska bokföras innan ledgern skapar den faktiska verifikationen.

### Källa / Source
Affärsobjektet som gav upphov till en bokföringshändelse, till exempel kundfaktura, leverantörsfaktura, lönekörning eller HUS-beslut.

### Period
Bokföringsperiod med start, slut och status.

### Låst period
Period där inga mutationer av redan bokförda händelser får ske.

### Rättelse
Ny bokföringshändelse som korrigerar tidigare fel, aldrig tyst ändring av gammal verifikation.

### Reversal
Spegelvänd verifikation som neutraliserar en tidigare verifikation.

### Dimension
Kompletterande kodning på bokföringsrad, till exempel projekt, kostnadsställe eller affärsområde.

## Moms

### Momskod / VAT Code
Kod som beskriver vilken momshantering en rad eller transaktion ska få.

### Momsbeslut / VAT Decision
Versionerat beslutsobjekt som förklarar varför en viss momskod och deklarationsmappning valts.

### Deklarationsbox
Fält i momsdeklarationen som summerar särskilda typer av omsättning eller skatt.

### Reverse Charge / Omvänd moms
Fall där säljaren inte lägger moms på fakturan men köparen redovisar den.

### Importmoms
Moms som uppstår vid import av varor från land utanför EU.

### Periodisk sammanställning
Rapport över viss unionsintern försäljning.

### OSS / IOSS
Särskilda ordningar för viss B2C-försäljning till andra länder.

## Kundflöde

### Kund
Motpart på intäktssidan.

### Offert
Ej bokförd försäljningshandling med versionsnummer och giltighetstid.

### Order
Åtagande att leverera varor eller tjänster efter godkänd offert eller direktbeställning.

### Fakturaplan
Reglerad plan för när och hur en kund ska faktureras.

### Kundfaktura
Utgående faktura som skapar kundfordran och normalt bokföring.

### Kreditfaktura
Negativ kundfaktura som minskar kundfordran och spegelvänder intäkt/moms.

### Kundreskontra
Samling av öppna och stängda kundposter.

### Inbetalningsmatchning
Koppling mellan bankhändelse och kundfaktura eller annan kundpost.

## Leverantörsflöde

### Leverantör
Motpart på kostnads- och inköpssidan.

### Inköpsorder / Purchase Order
Godkänd beställning till leverantör.

### Mottagning
Registrering att vara eller tjänst tagits emot.

### Leverantörsfaktura
Inkommande faktura som skapar leverantörsskuld och normalt bokföring.

### AP-matchning
Koppling mellan leverantörsfaktura, inköpsorder och mottagning.

### Betalningsförslag
Körbart urval av leverantörsskulder som föreslås för betalning.

### Leverantörsreskontra
Samling av öppna och stängda leverantörsposter.

## Bank och betalningar

### Bankhändelse
Rad från konto- eller kortutdrag.

### Avprickning
Matchning mellan bankhändelse och intern post.

### Företagskortstransaktion
Kortköp som ska kopplas till utlägg, leverantörsfaktura eller privat köp.

### Clearingkonto
Internt mellanled mellan affärshändelse och slutlig bankpost.

## HR, tid och frånvaro

### Anställd
Personobjekt kopplat till en eller flera anställningar.

### Anställning
Tidsbegränsad eller löpande relation mellan bolag och person med villkor, chef, schema och lönemodell.

### Tidrad
Registrerad arbetstid knuten till dag, aktivitet, projekt eller arbetsorder.

### Frånvarorad
Registrerad frånvaro med typ, omfattning, datumintervall och eventuella intyg.

### Schema
Förväntad arbetstidsfördelning över dagar/tider.

### Saldo
Ackumulerat värde, till exempel flex, komp eller semester.

## Lön

### Löneart
Klassificerad lönekomponent med regler för skatt, avgifter, AGI, bokföring och saldon.

### Lönekörning / Pay Run
Samlad beräkning för en viss grupp anställda och en viss löneperiod.

### Lönekörningsrad
Resultat av en löneart för en anställd i en lönekörning.

### Bruttolön
Lönebelopp före skatt och nettolöneavdrag.

### Nettolön
Belopp som ska betalas ut efter skatt och nettolöneavdrag.

### Retroaktiv korrigering
Justering i senare körning som rättar tidigare period.

### Slutlön
Särskild lönekörning i samband med avslutad anställning.

## AGI

### AGI
Arbetsgivardeklaration på individnivå.

### Huvuduppgift
Övergripande uppgift om arbetsgivarens redovisning för perioden.

### Individuppgift
Uppgift per anställd/person i AGI.

### Frånvarouppgifter
Särskilda uppgifter som lämnas tillsammans med AGI när reglerna kräver det.

### AGI-rättelse
Ny version av tidigare AGI för att rätta fel, dock inte frånvarouppgifter som redan skickats fel eller saknats.

## Förmåner och resor

### Förmån
Värde som tillfaller den anställde och som kan vara skattepliktigt, skattefritt eller delvis skattepliktigt.

### Förmånsvärde
Det belopp som ska ligga till grund för beskattning och avgifter.

### Egen betalning
Belopp som den anställde själv betalar och som kan minska eller eliminera ett förmånsvärde beroende på förmånstyp.

### Tjänsteresa
Affärsresa som kan ge rätt till traktamente, bilersättning eller utläggsersättning.

### Traktamente
Ersättning för ökade levnadskostnader under tjänsteresa.

### Bilersättning
Ersättning per mil eller faktisk kostnad för tjänsteresa enligt särskilda regler.

### Körjournal
Detaljerad logg över resor med datum, syfte, mätarställning och körd sträcka.

## Pension och löneväxling

### Pensionsmedförande lön
Lönesumma enligt respektive avtal eller regelpaket som ligger till grund för pensionspremie.

### Extra pension
Arbetsgivartillägg utöver ordinarie tjänstepension.

### Löneväxling
Avtalad sänkning av kontant lön mot högre pensionsavsättning.

### Premiebefrielse
Regel där premie helt eller delvis täcks vid viss frånvaro, exempelvis längre sjukdom.

## Projekt, bygg och fält

### Projekt
Ekonomiskt och operativt objekt för uppföljning av intäkt, kostnad, tid och material.

### Arbetsorder
Operativ instruktion för ett utförande mot kund eller internt behov.

### Serviceorder
Arbetsorder med servicekaraktär, ofta återkommande eller SLA-styrd.

### ÄTA
Ändrings-, tilläggs- eller avgående arbete.

### Fältaktivitet
Händelse i mobilappen, till exempel check-in, tid, materialuttag eller kundsignatur.

### Materialuttag
Förbrukning av lager eller inköpt material till projekt eller arbetsorder.

### Personalliggare
Tidsstämplad närvarologg för personer verksamma på byggarbetsplats eller annan reglerad plats.

### Dispatch assignment
Planerad eller aktiv tilldelning av arbetsorder till en specifik anstallning.

### Lagerplats
Fysisk plats for material, till exempel huvudlager, servicebil eller projektsite.

### Lagerartikel
Fakturerbar eller intern artikel som kan uttas i faltflode och kopplas till arbetsorder.

### Lagerbalans
Summering av tillganglig, reserverad och uttagen kvantitet per artikel och lagerplats.

### Kundsignatur
Kundens explicita godkannande av utfort arbetsmoment innan avslut och fakturering.

### Field sync envelope
Versionsmedveten offline-mutation med idempotensnyckel, basversion och synkstatus.

### Synkstatus
Status for offline envelope, till exempel `pending`, `synced`, `conflicted` eller `failed_terminal`.

## HUS / ROT / RUT

### HUS
Domännamn för hushållsnära avdrag, där ROT och RUT är två olika stödspår.

### ROT
Skattereduktion för vissa reparationer, ombyggnader och tillbyggnader i godkända bostäder.

### RUT
Skattereduktion för vissa hushållsnära tjänster enligt godkända kategorier.

### HUS-ansökan
Ansökan från utförare till Skatteverket efter att kunden betalat sin del.

### Delgodkännande
Myndighetsbeslut där bara viss del av ansökan godkänns.

### Återkrav
Myndighetsbeslut som kräver återbetalning av tidigare utbetalt HUS-belopp.

## Rapporter och årsflöden

### Månadsstängning
Samlad process för att avstämma, korrigera och låsa en månad.

### Bokslut
Årsvis eller periodvis stängning med särskilda justeringar och dokumentation.

### Årsredovisningspaket
Versionsstämplad samling underlag, texter, siffror och signeringsobjekt för årsredovisning.

### Inlämningskvittens
Mottagningsbevis från myndighet eller extern operatör.


## Kompletterande begrepp för reskontra, betalning och stängning

### Påminnelse
Formell kommunikation om förfallen skuld som kan ligga till grund för nästa collections-steg.

### Påminnelseavgift
Avgift som får tas ut när villkoren för sådan avgift är uppfyllda.

### Dröjsmålsränta
Ränta som löper efter förfallodag på obetald skuld.

### OCR-referens / Betalreferens
Maskinläsbar eller fri referens som används för att matcha inbetalning mot öppen post.

### Överbetalning
Betalning som överstiger den skuld som allokerats vid betalningstillfället.

### Underbetalning
Betalning som understiger det öppna belopp som skulle regleras.

### Write-off
Kontrollerad avslutshändelse för liten rest eller särskilt beslutad differens utan att historik skrivs över.

### Tvistad faktura
Faktura eller del av faktura som invänts och därför stoppas från vissa automatiska uppföljningsflöden.

### Supplier credit note / Leverantörskreditnota
Negativ leverantörsfaktura som minskar leverantörsskuld eller tidigare bokad kostnad/tillgång.

### Statement line
En enskild rad från bankens transaktionsflöde eller kontoutdrag.

### Payment order
Den exakta betalningsinstruktion som lämnar systemet mot bank eller bankportal.

### Settlement
Ekonomiskt slutsteg där kort-, bank- eller annan transaktion faktiskt likvideras och kan stämmas av mot clearingkonto.

### Reconciliation difference
Dokumenterad skillnad mellan två källor som måste lösas, bokas eller waivas.

### Close checklist
Versionsstyrd lista över kontrollpunkter som måste slutföras inför sign-off och periodstängning.

### Legal hold
Beslut som stoppar ordinarie gallring eller destruktion för definierade objekt på grund av tvist, myndighetskrav eller intern utredning.

### Suspense-post
Temporärt bokad post under utredning där slutlig motpart eller klassificering ännu inte är fastställd.

### Osäker kundfordran
Fordran som inte längre bedöms fullt säker men ännu inte är definitiv kundförlust.

### Konstaterad kundförlust
Fordran där förlusten bedömts definitiv och där eventuell momseffekt kan hanteras enligt regelpaketet.

## Språkpolicy i kod

- Paketnamn i kod skrivs på engelska.
- Affärstermer i UI får vara svenska.
- Databasnamn ska vara konsekventa och helst engelska snake_case.
- Utskriftsrubriker och kundvänd text får vara svenska, men ska referera till dessa domänbegrepp i dokumentationen.


## Arbetsobjekt, deadlines och notifieringar

### Arbetsobjekt / Work Item
Spårbar uppgift som skapas manuellt eller automatiskt och som måste ägas, följas upp och avslutas.

### Arbetsvarning / Warning
Systemskapat informations- eller riskmeddelande som kan ligga till grund för ett arbetsobjekt men som inte alltid kräver manuell action.

### Deadline
Det senaste tillåtna datumet eller datum/tid-fönstret för att en uppgift, ett godkännande eller en submission ska vara klar.

### Reminder / Påminnelse
Tidsstyrd notifiering före eller efter deadline enligt fast regel eller policyprofil.

### Assignment
Koppling mellan arbetsobjekt och ansvarig användare, grupp eller rollkö.

### Owner
Den användare eller roll som för tillfället ansvarar för nästa action på ett objekt.

### Acknowledgement / Kvittens
Explicit markering att mottagaren har sett och accepterat ansvar för en notifiering, varning eller uppgift.

### Snooze
Tidsbegränsad uppskjutning av synlighet eller nästa påminnelse utan att ägarskap eller historik försvinner.

### Escalation / Eskalering
Automatisk eller manuell höjning av synlighet, prioritet eller mottagarkrets när en uppgift inte hanteras i tid.

### Blocker
Tillstånd eller objekt som hindrar nästa steg, sign-off, close eller submission tills blockerande villkor är löst eller godkänt undantag finns.

### Reopen
Öppning av tidigare avslutad uppgift, checklista, period eller review-kedja med ny arbetscykel men bevarad historik.

## Sök, index, vyer och personalisering

### Sökindex / Search Index
Sekundär, sökoptimerad projektion av behörighetsstyrda objekt.

### Global sökning / Global Search
Gemensamt sökgränssnitt över flera objektkategorier med fritext, filter och facets.

### Permissions trimming
Regel som säkerställer att sökresultat, snippets och facets bara visar det användaren får se.

### Sparad sökning / Saved Search
Namngiven, versionsstyrd uppsättning filter, sortering och eventuell fritextfråga.

### Sparad vy / Saved View
Återanvändbar kombination av kolumner, filter, sortering, gruppering och presentation för en lista eller arbetsyta.

### Standardvy / Default View
Den vy som öppnas automatiskt för en yta, roll eller bolag när ingen personlig preferens finns.

### Dashboard-kort
Konfigurerbart presentationsblock som visar ett mått, en lista, en varning eller en länkad arbetsyta.

### Favoritvy
Sparad vy som en användare markerat för snabb åtkomst.

### Stale data
Tillstånd där sök- eller dashboardprojektion ännu inte hunnit ikapp källobjektets senaste godkända version.

## Byrå, close och godkännanden

### Byråportfölj / Bureau Portfolio
Den mängd klientbolag, uppgifter, deadlines och risker som en redovisningsbyrå ansvarar för.

### Klientstatus
Sammanfattat tillstånd för ett klientbolag, till exempel `onboarded`, `waiting_for_client`, `ready_for_close` eller `blocked`.

### Klientbegäran / Client Request
Spårbar begäran från byrå till klient om uppgift, dokument eller godkännande.

### Dokumentbegäran / Document Request
Klientbegäran där leveransen består av ett eller flera specifika dokument eller datakällor.

### Klientgodkännande / Client Approval
Verifierat svar från klient att underlag, rapport eller submission får användas, skickas eller stängas.

### Sign-off evidence
Det bevispaket som visar vem som godkänt, vad som godkänts, när det skett och vilket underlag som gällde då.

### Override
Kontrollerat undantag där ett normalt blockerande villkor tillåts passeras med extra motivering och högre behörighet.

### Waiver
Tidsbegränsat accepterad avvikelse som får finnas kvar utan att vara löst, men som måste vara synlig och ägd.

## Submissions, köer och asynkrona jobb

### Submission
Versionsstämplat försök att lämna uppgifter, filer eller deklarationer till extern mottagare.

### Kvittenser / Receipt
Mottagnings-, fel- eller slutstatusmeddelande från extern part eller intern transportkedja kopplat till en submission.

### Action queue
Operativ kö med ärenden som kräver mänsklig hantering, komplettering eller beslut efter ett fel eller ett avvikande svar.

### Transportfel
Fel i nätverk, autentisering, timeout, rate limit eller leveranskanal före affärsvalidering hos mottagaren.

### Domänfel
Fel där mottagaren tekniskt tagit emot meddelandet men underkänner innehållet eller affärsregeln.

### Async-jobb / Async Job
Bakgrundsjobb med eget livscykelobjekt, idempotensnyckel, retry-policy och korrelationsspår.

### Dead-letter
Slutstation för jobb eller meddelande som inte längre får återförsökas automatiskt.

### Replay
Kontrollerad omkörning av en tidigare händelse, köpost eller batch med bevarad historik.

### Korrelations-id / Correlation ID
Gemensam identifierare som binder samman användaraction, domänhändelse, jobb, submission och externa kvittenser.

## Support, administration och säker drift

### Audit explorer
Backofficevy för att söka och filtrera auditspår över användare, objekt, domänhändelser och adminåtgärder.

### Access review
Regelbunden granskning av roller, delegationer, impersonation-rätter och andra behörigheter.

### Supportärende / Support Case
Spårbar intern post för felsökning, kundkontakt, tillfällig åtkomst eller operativ åtgärd.

### Impersonation
Teknisk möjlighet för särskilt behörig användare att se eller tillfälligt agera i annan användares kontext under hårda spärrar.

### Break-glass
Tidsbegränsad nödförhöjd åtkomst vid incident där ordinarie flöden inte räcker.

### Feature flag
Versionsstyrd och auditerad styrsignal som slår på, av eller begränsar beteende utan kodändring i produktionsmiljö.

### Kill switch
Feature flag eller separat nödbrytare som omedelbart stänger av riskfyllt flöde eller integration.

## Offline, migrering och export

### Offlinekö / Offline Queue
Lokal kö av ännu ej synkade skapanden, ändringar eller kvittenser från klientenhet.

### Pending state
Lokal preliminär status som gäller innan servern slutligt accepterat en mutation.

### Synkkonflikt / Sync Conflict
Tillstånd där lokal och serverbaserad version inte kan förenas utan definierad merge-regel eller manuell lösning.

### Importbatch
Versionerad samling importerade poster inom en migrering eller historisk laddning.

### Mapping review
Kontrollsteg där importerade fält, koder och dimensioner mappas mot intern modell innan godkänd migrering.

### Diff report
Rapport som förklarar skillnader mellan källsystem och målmodell per objekt, totalsumma eller regelklass.

### Parallel run / Parallellkörning
Period då källsystem och målsystem körs samtidigt för att jämföra utfall innan cutover.

### Cutover
Kontrollerat byte från gammalt system till nytt system för ett bolag eller en kundgrupp.

### Måttkatalog / Metric Catalog
Styrd samling definitioner av alla officiella mått, KPI:er och summeringar i rapporter och dashboards.

### Rapportdefinition / Report Definition
Versionerad specifikation av ett reports innehåll, filter, gruppering, drilldown och exporterbar form.

### Exportjobb / Export Job
Asynkront jobb som materialiserar rapport- eller objektdata till filformat som Excel eller PDF.

### Watermark
Tydlig markering i export eller preview som anger att underlaget är preliminärt, omöjligt att signera eller ersatt av nyare version.

### Projektbudget / Project Budget
Versionerad plan fÃ¶r projektets framtida kostnader och intÃ¤kter uppdelad per period, kategori och vid behov resurs eller aktivitet.

### Budgetversion / Budget Version
GodkÃ¤nd och immutabel version av projektbudget som gÃ¤ller frÃ¥n ett visst datum och anvÃ¤nds i forecast och uppfÃ¶ljning.

### ResursbelÃ¤ggning / Resource Allocation
Planerad kapacitet fÃ¶r en viss anstÃ¤llning eller resurs i ett projekt fÃ¶r en period, inklusive planerade minuter, bill rate och cost rate.

### GodkÃ¤nt vÃ¤rde / Approved Value
Det vÃ¤rde som fÃ¥r anvÃ¤ndas fÃ¶r WIP-berÃ¤kning vid cutoffdatum baserat pÃ¥ fakturerbar tid eller godkÃ¤nd intÃ¤ktsbudget enligt projektets modell.

### WIP-snapshot
Materialiserad och hashad bild av projektets work in progress fÃ¶r ett givet cutoffdatum med approved value, fakturerat belopp och fÃ¶rklaringskoder.

### Uppskjuten projektintÃ¤kt / Deferred Revenue in Projects
Den del av redan fakturerat projektbelopp som Ã¤nnu inte fÃ¥r redovisas som intÃ¤kt enligt projektets aktuella modell.

### Forecast at Completion
BerÃ¤knat slututfall fÃ¶r projektets totala kostnad, intÃ¤kt och marginal givet faktiskt utfall till cutoffdatum och Ã¥terstÃ¥ende budget.

### Resurslast / Resource Load
Andel faktiskt arbetad eller bokad kapacitet mot planerad kapacitet fÃ¶r resurs eller projekt under en period, uttryckt i procent.

## Kommentarer och samarbete

### Kommentar
Tidsstämplad textnotering knuten till ett affärsobjekt, ett checklistesteg eller en supportpost.

### Mention
Direkt hänvisning till användare eller grupp i kommentar som skapar notifiering och eventuellt arbetsobjekt.

### Tråd / Thread
Hierarkisk kedja av huvudkommentar och svar inom samma kontext.

### Lässtatus / Read state
Användarspecifikt tillstånd som visar om kommentar eller tråd är läst, oläst eller kvitterad.

### Intern synlighet
Kommentar eller tråd som bara får visas för interna användare hos byrå eller leverantörens supportorganisation enligt policy.

### Extern synlighet
Kommentar eller tråd som uttryckligen får delas med kund, klient eller annan extern part.

