# ROT / RUT / HUS engine

Detta dokument definierar HUS-motorn. HUS används här som intern domänbeteckning för det statliga flödet där utföraren ger kunden preliminär skattereduktion och sedan ansöker om utbetalning. ROT och RUT är två olika stödspår inom samma motor.

## Scope

Motorn ska hantera:
- klassificering av arbete som ROT, RUT eller ej stödberättigat
- arbetskostnad kontra material, resa, utrustning, administration
- kundandel och preliminär skattereduktion på faktura
- krav på köpare, bostad och utförare
- HUS-ansökan efter betalning
- helt eller delvis godkännande
- avslag
- delkreditering och kreditnota
- återkrav
- omfördelning mellan flera köpare
- JSON/XML-snapshots, revisionskedja och bokföring

## Hårda grundregler

1. HUS är en **skattereduktion**, inte ett prisavdrag i egentlig mening.
2. Det är bara **arbetskostnaden** som får ligga till grund för reduktion.
3. Material, resor, administration, maskinhyra och liknande ska inte ingå i underlaget.
4. Kunden måste betala sin andel elektroniskt där reglerna kräver det.
5. Utföraren ansöker först **efter att arbetet utförts och kunden betalat sin del**.
6. Utföraren ska vara godkänd för F-skatt.
7. Köparen ska vara berättigad person för bostaden eller hushållet enligt aktuell regeltyp.
8. ROT och RUT får aldrig blandas ihop i samma rad utan explicit klassning per rad eller per arbetsmoment.
9. Motorn ska kunna visa exakt varför en rad är godkänd, delvis godkänd eller inte stödberättigad.

## Procentsatser och tak

För 2026 ska regelpaketet minst klara:

- **ROT**: 30 % av arbetskostnaden
- **RUT**: 50 % av arbetskostnaden
- **Totalt tak ROT + RUT**: 75 000 kr per person och år
- **ROT-del av taket**: högst 50 000 kr per person och år

Motorn ska inte bara lagra procentsatsen. Den ska också lagra:
- beskattningsår
- person
- hur mycket av utrymmet som redan använts
- om kunden fått andra närliggande reduktioner som påverkar slutlig skatt utanför systemet

## Krav på köparen

- köparen ska vara en fysisk person
- köparen ska ha rätt relation till bostaden eller hushållet enligt stödtypen
- köparen ska ha tillräcklig slutlig skatt för att kunna nyttja reduktionen fullt ut
- köparen får inte vara den som utför arbetet eller närstående till utföraren där reglerna blockerar
- köparen ska stå som betalare för sin del
- flera köpare ska kunna dela arbetskostnad och preliminär reduktion

## Krav på utföraren

- F-skatt
- organisationsnummer/personnummer
- korrekt faktura med arbetskostnad separat
- korrekt HUS-ansökan efter betalning
- full dokumentation av utfört arbete och arbetsmoment
- stöd för att hantera beslut, avslag och återkrav

## ROT-katalog

ROT gäller arbete på godkända bostäder som avser:
- reparation
- underhåll
- ombyggnad
- tillbyggnad

ROT gäller inte för:
- nybyggnation av helt ny bostad
- arbete som i huvudsak avser materialleverans
- arbete som fått försäkringsersättning eller vissa bidrag när detta blockerar stödet
- kostnader som inte är arbetskostnad

Systemet ska därför lagra:
- bostadstyp
- ägarrelation
- om arbetet gäller nybyggnation eller befintlig bostad
- arbetsmomentstyp
- procentandel arbetskostnad

## RUT-katalog

RUT gäller hushållsnära tjänster inom en versionsstyrd tjänstekatalog. Startkatalogen ska minst kunna märka följande huvudgrupper:

- städning och rengöring i bostad
- tvätt, strykning, kläd- och textilvård
- flyttjänster, packning, lastning, lossning och flyttrelaterade tjänster
- trädgårdsarbete
- snöskottning
- barnpassning
- personlig omsorg och tillsyn i hemmet
- IT-tjänster i bostaden, till exempel rådgivning, installation, igångsättning, felsökning och support på plats
- reparation och underhåll av vitvaror när regelpaketet tillåter detta
- andra godkända ruttjänster som läggs i regelpaketets servicekatalog

Varje RUT-tjänst måste klassas i regelpaketet med:
- service_code
- service_group
- allowed_location
- allowed_scope
- excluded_subtasks
- labor_share_policy

## Fakturamodellen

När en kundfaktura innehåller HUS ska systemet göra följande:

1. klassificera varje rad eller arbetsmoment som ROT, RUT eller ej stöd
2. räkna arbetskostnad
3. räkna preliminär reduktion
4. skapa fakturarader som tydligt visar:
   - total arbetskostnad
   - kundens del
   - preliminär HUS-del
5. låsa ansökningsunderlaget när fakturan bokförts
6. vänta på kundens betalning
7. tillåta ansökan först när kunden betalat sin del

## Datamodell

Minst:
- `hus_cases`
- `hus_case_buyers`
- `hus_service_lines`
- `hus_classification_decisions`
- `hus_claims`
- `hus_claim_versions`
- `hus_claim_status_events`
- `hus_decisions`
- `hus_payouts`
- `hus_recoveries`
- `hus_credit_adjustments`

## Statusmodell

- `draft`
- `classified`
- `invoiced`
- `customer_partially_paid`
- `customer_paid`
- `claim_draft`
- `claim_submitted`
- `claim_accepted`
- `claim_partially_accepted`
- `claim_rejected`
- `paid_out`
- `credit_pending`
- `recovery_pending`
- `closed`

## XML- och JSON-spår

Systemet ska internt kunna skapa:

- normaliserad `hus_claim.json`
- revisionssnapshot av payload
- XML-payload om vald transport kräver XML
- JSON-payload om vald transport kräver JSON
- kvittensobjekt
- differensobjekt mot tidigare inskickad eller beslutad version

Internmodellen ska vara **transportneutral**. Motorn ska inte hårdkodas mot en viss transport.

## Delkreditering och kreditflöden

Det här är kritiskt och måste modelleras explicit.

### A. Kredit innan kunden betalat
- faktura ändras eller krediteras
- HUS-underlaget räknas om
- ingen ansökan får skickas på gammalt underlag

### B. Kredit efter kundbetalning men före HUS-ansökan
- kundens betalning finns
- HUS-ansökan ännu ej skickad
- systemet skapar kreditjustering
- nytt ansökningsbart belopp räknas fram
- gammalt utkast makuleras eller ersätts

### C. Kredit efter skickad HUS-ansökan men före beslut
- gammal claim-version markeras som ersatt eller korrigerad
- ny claim-version skapas med diff
- all historik sparas
- operatör ser tydligt att myndigheten kan behandla gammal och ny version olika beroende på kanal

### D. Kredit efter beslut men före utbetalning
- beslutet ligger fast, men slutligt utfall kan kräva korrigering
- systemet ska markera att avvikelse finns mellan beslutad och aktuell fakturastatus
- åtgärdskö skapas för operatör

### E. Kredit efter utbetalning
- detta är den svåraste vägen
- systemet ska skapa `hus_recovery_candidate`
- skillnaden mellan utbetalt HUS-belopp och nytt korrekt HUS-belopp räknas fram
- bokföring för skuld eller återbetalningsbehov skapas
- ärendet får inte stängas förrän återkravs- eller korrigeringsflöde hanterats

## Delgodkännande

Vid delgodkännande ska systemet lagra:

- ansökt belopp
- godkänt belopp
- avslaget belopp
- orsakskod
- per köpare om stödet fördelats
- differens mot fakturans preliminära avdrag

Operativ effekt:
- kundfordran eller intern fordran måste kunna justeras
- operatören ska kunna välja om kunden ska efterdebiteras eller om bolaget tar kostnaden
- bokföringsmallar ska finnas för båda utfallet

## Bokföringsprinciper

Minst följande steg ska kunna bokföras:

1. kundfaktura med preliminär HUS-del
2. kundens betalning av sin andel
3. ansökan skickad (ingen bokning eller endast intern status beroende policy)
4. beslut om godkänd utbetalning
5. utbetalning mottagen
6. delvis avslag
7. återkrav
8. kreditjustering efter utbetalning

## Relevanta basregler från tidigare byggspec

## 31. ROT och RUT — byggspec

### 31.1 Grundregler
- ROT och RUT är skattereduktioner, inte momsavdrag
- ROT 2026: 30 % av arbetskostnaden
- RUT: 50 % av arbetskostnaden
- totalt tak för ROT + RUT: 75 000 kr per person och år
- av detta får högst 50 000 kr avse ROT
- kunden måste ha tillräckligt med skatt för att kunna utnyttja reduktionen
- företaget ansöker om utbetalning från Skatteverket
- begäran om utbetalning ska ha kommit in senast 31 januari året efter betalningsåret
- fakturamodellen kräver att utföraren har F-skatt
- betalning ska vara elektronisk
- underlaget får bara avse arbetskostnad inklusive moms på arbetskostnaden enligt modellen, inte material, resor eller administration i normalfallet
- arbete som finansierats med försäkringsersättning eller bidrag ska inte ge reduktion för samma del
- ROT kan inte kombineras med skattereduktion för grön teknik för samma arbete

### 31.2 Krav på kunden
- ska vara privatperson med rätt till skattereduktion
- ska ha rätt bostad och rätt relation till bostaden för ROT
- arbetet ska utföras i eller i anslutning till bostad enligt reglerna
- i vissa fall kan arbete i förälders hushåll ge rätt
- kunden ska bara betala den reducerade delen till utföraren när fakturamodellen används
- systemet ska lagra personnummer, ägarandel, andel av underlag, fördelning mellan flera köpare

### 31.3 Krav på utföraren
- F-skatt
- inte närstående där reglerna förbjuder det
- måste kunna visa mottagen betalning
- måste kunna visa att arbetskostnadsandelen är skälig

### 31.4 ROT — vad systemet måste kunna
- skilja arbetskostnad från material, utrustning, resor, administration
- hantera småhus, bostadsrätt, ägarlägenhet
- blockera nybyggnation där reduktion inte gäller
- stödja flera delägare på samma faktura
- stödja delbetalningar, förskott och a conto
- generera ansökningsunderlag per kund
- hantera avslag, delavslag och återkrav
- bokföra fordran/skuld mot Skatteverket

### 31.5 RUT — vad systemet måste kunna
- skilja arbetskostnad från övriga kostnader
- stödja godkända tjänstekategorier
- blockera arbete åt nära familj/släkt där reglerna förbjuder
- stödja flera köpare och fördelning
- generera ansökningsunderlag

### 31.6 Operativ modell för faktura med ROT/RUT
Varje rad ska ha:
- line_type: labor/material/travel/admin/other
- eligible_for_rot
- eligible_for_rut
- customer_person_id
- reduction_rate
- requested_reduction_amount
- approved_reduction_amount
- paid_amount_by_customer
- claim_status

## Golden tests

- enkel ROT-faktura en köpare
- enkel RUT-faktura en köpare
- två köpare med delad arbetskostnad
- kund betalar inte sin del fullt ut
- delgodkännande
- fullständigt avslag
- kredit före ansökan
- kredit efter ansökan
- kredit efter utbetalning
- återkrav
- omfördelning mellan köpare
- blandad faktura med HUS och ej HUS-berättigade rader

## Codex-prompt

```text
Read docs/compliance/se/rot-rut-engine.md, docs/compliance/se/accounting-foundation.md and docs/compliance/se/einvoice-peppol-engine.md.

Implement the HUS engine with:
- ROT/RUT classification catalog
- labor-cost isolation
- buyer allocation
- invoice integration
- claim versioning
- JSON/XML payload snapshots
- decision, payout, partial approval and recovery flows
- accounting intents
- golden tests for all credit scenarios

Never hide delkreditering inside invoice logic. It must be its own domain event stream.
```

## Exit gate

- [ ] Arbetskostnad isoleras korrekt.
- [ ] Faktura visar kundandel och preliminär HUS-del tydligt.
- [ ] Ansökan kan bara skickas efter kundbetalning.
- [ ] Delgodkännande, avslag och kredit efter utbetalning fungerar spårbart.
- [ ] Bokföring för utbetalning och återkrav går att avstämma.
