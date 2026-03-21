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

## Språkpolicy i kod

- Paketnamn i kod skrivs på engelska.
- Affärstermer i UI får vara svenska.
- Databasnamn ska vara konsekventa och helst engelska snake_case.
- Utskriftsrubriker och kundvänd text får vara svenska, men ska referera till dessa domänbegrepp i dokumentationen.
