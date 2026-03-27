> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Fixed assets and depreciation engine

Detta dokument definierar anläggningsregister, anskaffning, aktivering, avskrivningsplaner, utrangering och exakt bokföringspåverkan för svenska bolag.

## Scope

### Ingår

- anläggningsregister för immateriella och materiella tillgångar
- aktivering från leverantörsfaktura, manuell reklass eller historisk import
- avskrivningsplaner, nyttjandeperioder, restvärde, komponentindelning och avskrivningskörningar
- utrangering, försäljning, delutrangering och restvärdeshantering

### Ingår inte

- leasingredovisning i full detalj om den kräver separat standardmotor
- lager och små förbrukningsinventarier som ska kostnadsföras direkt

### Systemgränser

- Anläggningsmotorn äger asset card, asset class, depreciation schedule, disposal och impairment-/restvärdeshändelser när sådana stöds.
- AP levererar underlag från leverantörsfaktura men anläggningsmotorn avgör om raden ska kapitaliseras.
- Ledgern bokar enbart posting intents från anläggningsmotorn.

## Hårda regler

1. En tillgång får inte börja skrivas av före sitt in-service-datum.
2. Kostnader under bolagets kapitaliseringströskel ska som huvudregel kostnadsföras direkt och får inte autoaktiveras.
3. Postade avskrivningar får inte redigeras; korrigering sker genom reversal eller extra avskrivning.
4. Tillgångens anskaffningsvärde, nyttjandeperiod, metod och koppling till underlag ska vara versionsstyrda.
5. Utrangering ska stänga tillgångens kvarvarande bokförda värde och tydligt visa eventuell vinst eller förlust.
6. Samma leverantörsfakturarad får inte skapa två anläggningar utan uttrycklig split-regel.
7. Anläggningsregister och ledger ska kunna tie-outa anskaffningsvärde, ackumulerad avskrivning och nettobokfört värde.

## Begrepp och entiteter

- **Asset class** — Klass som styr konto, avskrivningsmetod, standardlivslängd och tröskel.
- **Asset card** — Den individuella tillgångens masterdata och livscykel.
- **In-service-datum** — Datum då tillgången börjar användas i verksamheten.
- **Avskrivningsplan** — Planerad fördelning av avskrivningsbelopp per period.
- **Nettobokfört värde** — Anskaffningsvärde minus ackumulerad avskrivning och eventuella nedskrivningar.
- **Utrangering** — Borttag av tillgång från registret genom skrotning, försäljning eller annan avveckling.

## State machines

### Asset card

- `draft -> capitalized -> in_service -> depreciating -> fully_depreciated -> disposed -> archived`

- `capitalized` betyder att anskaffningsvärdet bokats men avskrivning ännu inte startat.
- `in_service` aktiverar avskrivningsplanen enligt vald metod.
- `disposed` låser fortsatt avskrivning.

### Depreciation run

- `draft -> approved -> posted -> reversed`

- Samma tillgång och period får bara få en aktiv avskrivningspost per bokföringsbok.
- Reversal ska länkas till ursprunglig run och kräva orsak.

### Disposal

- `planned -> approved -> posted -> reversed`

- Disposal kräver datum, orsak och hantering av eventuellt försäljningspris.
- Efter `posted` ska tillgången inte längre kunna få nya avskrivningar.

## Inputfält och valideringar

### Asset class och masterdata

#### Fält

- asset_class_id, tillgångstyp, aktiveringskonto, ackumulerad-avskrivningskonto, avskrivningskostnadskonto, standardlivslängd, restvärdepolicy, kapitaliseringströskel

#### Valideringar

- konto-mapping måste finnas innan första tillgång kan aktiveras
- kapitaliseringströskel får inte vara negativ
- standardlivslängd måste vara större än noll när klassen är avskrivningsbar

### Asset card

#### Fält

- asset_no, beskrivning, anskaffningsdatum, in-service-datum, anskaffningsvärde, valuta, leverantörsfakturalänk, projekt, kostnadsställe, metod, nyttjandeperiod, restvärde

#### Valideringar

- in-service-datum får inte ligga före anskaffningsdatum utan särskild importflagga
- anskaffningsvärde måste vara positivt för ny tillgång
- nyttjandeperiod och metod måste vara definierade innan tillgången går till `capitalized`

### Avskrivning och disposal

#### Fält

- period, planerat belopp, ackumulerat belopp, kvarvarande bokfört värde, disposal-datum, försäljningspris, köpare eller motpart

#### Valideringar

- summa planerade avskrivningar plus restvärde får inte överstiga anskaffningsvärdet
- disposal-datum får inte ligga före sista postade avskrivning utan att avskrivningsplanen räknas om eller reverseras
- försäljningspris i annan valuta kräver valutamotor

## Beslutsträd/regler

### Kapitalisera eller kostnadsför

- Om anskaffningsvärde understiger kapitaliseringströskeln ska AP-raden normalt kostnadsföras direkt.
- Om raden gäller en tillgångsklass som alltid ska aktiveras, till exempel större programvara eller maskin, skapas asset draft i stället för ren kostnad.
- Split av en leverantörsfakturarad till flera tillgångar ska vara explicit, till exempel flera datorer på samma faktura.

### Avskrivningsstart

- Produktens standard är månadsvis linjär avskrivning från första dagen i månaden efter in-service-datum, om inte bolagets policy anger annat.
- Historiskt importerade tillgångar kan ha en särskild första period eller kvarvarande livslängd.
- Ändrad nyttjandeperiod efter start kräver ny version och omräkning framåt, aldrig retroaktiv tyst omskrivning.

### Disposal och restvärde

- Vid skrotning utan ersättning bokas kvarvarande bokfört värde som förlust.
- Vid försäljning ska anskaffningsvärde och ackumulerad avskrivning nollas och skillnaden mot försäljningspris gå till vinst eller förlust.
- Delutrangering kräver explicit procentsats eller belopp och ska justera både anskaffningsvärde och ackumulerad avskrivning proportionellt.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Aktivering från leverantörsfaktura | K | 1600/1700/1750/1760 eller annat tillgångskonto, 2640 om moms är avdragsgill | 2410/2420/2430 Leverantörsskulder | Vilket tillgångskonto som används styrs av asset class. |
| Reklass från tidigare kostnad | K | Tillgångskonto | Tidigare kostnadskonto | Sker via godkänd korrigeringsverifikation när kostnad först bokats fel. |
| Månadsavskrivning immateriell | K | 7800 Avskrivningar immateriella | 1690 Ackumulerade avskrivningar immateriella | Används för 16xx-klasser. |
| Månadsavskrivning materiell byggnad/maskin/inventarie/fordon | K | 7810/7820/7830/7840 | 1790 Ackumulerade avskrivningar materiella | Kostnadskonto väljs av asset class. |
| Utrangering utan försäljningspris | K | Ackumulerade avskrivningar, förlustkonto för kvarvarande NBV | Tillgångskonto | Nollställer tillgången. |
| Försäljning av tillgång | K | 1110 Bank eller 1210 Kundfordran, ackumulerade avskrivningar | Tillgångskonto, utgående moms vid momspliktig försäljning, vinstkonto eller motbalans via förlustkonto | Vinst/förlust beräknas som netto mellan ersättning och bokfört värde. |

## Fel- och granskningsköer

- **capitalization_review** — Tillgång ligger nära tröskel eller saknar tillräckligt underlag.
- **asset_mapping_missing** — Asset class saknar konto- eller metodmapping.
- **depreciation_conflict** — Samma tillgång riskerar dubbla avskrivningar samma period.
- **disposal_review** — Utrangering saknar försäljningspris, motpart eller korrekt restvärdesbehandling.
- **imported_asset_mismatch** — Historiskt importerad tillgång stämmer inte mot opening balance eller tidigare plan.

## Idempotens, spårbarhet och audit

- Varje asset card ska bära `asset_id`, `source_type`, `source_id` och versionsnummer.
- Avskrivningskörning ska låsas på `asset_id + period + book` för att hindra dubbla körningar.
- Disposal ska ha egen affärsnyckel så att samma försäljningshändelse inte bokas två gånger.
- Ändringar av nyttjandeperiod, restvärde och klass ska versionsspåras med användare och datum.

## Golden tests

1. **Aktivering av inventarie**

- Skapa asset från leverantörsfaktura över tröskel.
- Förväntat utfall: tillgång bokas på 17xx/1750 och registreras i anläggningsregistret.

2. **Månadsavskrivning**

- Kör avskrivning för en tillgång i aktiv klass.
- Förväntat utfall: rätt kostnadskonto i debet och ackumulerad avskrivning i kredit.

3. **Historiskt importerad tillgång**

- Importera tillgång med redan ackumulerad avskrivning.
- Förväntat utfall: kvarvarande plan räknas fram utan dubbel historik.

4. **Försäljning med vinst**

- Sälj tillgång över nettobokfört värde.
- Förväntat utfall: bank/AR bokas, tillgång nollas och vinst redovisas.

5. **Dubbla avskrivningar blockeras**

- Försök köra samma period två gånger.
- Förväntat utfall: depreciation_conflict.

## Exit gate

- [ ] anläggningsregister, kontomapping och nyttjandeperioder är definierade
- [ ] aktivering, avskrivning och disposal ger spårbara posting intents
- [ ] anläggningsregister kan stämmas av mot ledgern
- [ ] historiskt importerade tillgångar och nya tillgångar kan samexistera
- [ ] dubbla avskrivningar och otillåtna ändringar blockeras tekniskt

