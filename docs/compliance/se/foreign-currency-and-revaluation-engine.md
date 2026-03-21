# Foreign currency and revaluation engine

Detta dokument definierar valutakurser, omräkning, kursdifferenser, omvärdering av AR, AP och bank samt betalning i annan valuta än fakturan.

## Scope

### Ingår

- valutakurstabeller, kurshistorik, källprioritet och manuella override-regler
- bokning av transaktioner i annan valuta än bolagets funktionella valuta
- realiserade och orealiserade kursdifferenser för kund-, leverantörs- och bankposter
- periodisk omvärdering av öppna poster och bankkonton

### Ingår inte

- komplex treasury- eller hedge-redovisning
- exotiska instrument eller derivat

### Systemgränser

- Valutamotorn äger rate set, conversion, settlement FX calculation och revaluation batch.
- AR, AP och bank levererar öppna poster och settlement-händelser i originalvaluta.
- Ledgern tar emot posting intents i serie N eller domänserie med sparad valutametadata.

## Hårda regler

1. Varje bokförd transaktion i utländsk valuta ska spara originalvaluta, originalbelopp, använd kurs och funktionellt belopp.
2. Kurs som användes vid bokföring får inte skrivas över i efterhand.
3. Realiserad kursdifferens ska beräknas när posten faktiskt regleras. Orealiserad differens ska beräknas vid periodomvärdering av öppna poster.
4. Samma öppna post och period får inte omvärderas två gånger utan reversal eller delta-logik.
5. Betalning i annan valuta än fakturan ska kunna förklaras via funktionell valuta och ge tydlig residual eller FX-effekt.
6. Manuell kursoverride ska kräva reason code och audit.
7. Om kurs saknas på bokföringsdatum ska posten stoppas eller använda godkänd fallback-regel med tydlig märkning.

## Begrepp och entiteter

- **Funktionell valuta** — Bolagets redovisningsvaluta, normalt SEK i denna produkt.
- **Transaktionsvaluta** — Valuta som faktura, betalning eller bankpost uttrycks i.
- **Bokföringskurs** — Kurs som användes när händelsen först bokfördes.
- **Settlementskurs** — Kurs som gäller när betalningen reglerar posten.
- **Realiserad FX** — Kursdifferens som uppstår när post stängs.
- **Orealiserad FX** — Kursdifferens på öppen post eller banksaldo vid periodens slut.
- **Revaluation batch** — Periodisk omvärderingskörning med version och sign-off.

## State machines

### Rate set

- `draft -> published -> superseded`

- Publicerad rate set gäller för definierat datum och källa.
- Superseded betyder att nyare kurs finns men historisk kurs ligger kvar för reproduktion.

### FX item

- `open -> revalued -> settled -> reversed`

- `revalued` kan inträffa flera gånger över tid men varje periodversion måste kunna följas.
- `settled` ska återföra tidigare orealiserad differens om sådan funnits.

### Revaluation batch

- `draft -> approved -> posted -> reversed`

- Batch ska vara låst på period och itemmängd.
- Reversal används när omvärdering gjorts på fel underlag eller när policy kräver auto-reversal nästa period.

## Inputfält och valideringar

### Kurser

#### Fält

- frånvaluta, tillvaluta, kursdatum, källa, spotkurs, precision, publicerad tidpunkt och eventuell override-orsak

#### Valideringar

- precision ska räcka för att hålla avrundningsfel under policygräns
- samma valuta och datum får bara ha en aktiv kurs per källa
- manuell override får inte ske utan användare, orsak och attest när policy kräver det

### Transaktion och settlement

#### Fält

- originalbelopp, originalvaluta, funktionellt belopp, bokföringskurs, settlementdatum, settlementkurs, betald valuta, bankkonto och eventuell avgift

#### Valideringar

- originalvaluta måste vara definierad för varje öppen post
- partial settlement ska kunna beräkna proportionell andel av bokförd funktionell summa
- betalning i annan valuta än fakturan kräver extra omräkningsspår

### Omvärdering

#### Fält

- period, cutoff, urval av öppna poster och bankkonton, tidigare revaluation balance, ny kurs, delta, auto-reversal-flagga

#### Valideringar

- stängda poster får inte revalueras
- samma post och period får inte finnas två gånger i samma batch
- omvärdering ska ignorera poster under liten materialitetsgräns endast om policy tillåter det

## Beslutsträd/regler

### Val av kurs

- Normalfallet är att använda bolagets publicerade dagskurskälla för bokföringsdatum.
- Om kurs saknas kan fallback till närmast föregående publicerade kurs användas om bolagets policy tillåter det och detta märks upp.
- Manuell override används endast när faktiskt avtalad kurs eller bankkurs behöver ersätta standardkällan.

### Settlement och realiserad FX

- När kund- eller leverantörspost regleras jämförs bokförd funktionell summa med faktiskt funktionellt likvidbelopp på den reglerade delen.
- Partial settlement ska bara realisera FX på den andel som faktiskt regleras.
- Om betalning görs i annan valuta än fakturan ska residual i originalvaluta eller funktionell valuta tydligt dokumenteras och hanteras som ny öppen post eller avvikelse.

### Orealiserad omvärdering

- Periodisk omvärdering räknar om öppna AR-, AP- och bankposter till ny kurs per cutoff.
- Motorn ska kunna köra delta mot tidigare carrying value eller skapa auto-reversal vid nästa periodstart beroende på policyprofil.
- När posten senare regleras ska tidigare orealiserad differens återföras eller neutraliseras så att endast realiserad effekt återstår.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Utländsk kundfaktura eller leverantörsfaktura | B/E | AR/AP med funktionellt belopp enligt bokföringskurs | Intäkts-/kostnads- och momskonton | Originalvaluta sparas på raden. |
| Realiserad FX-vinst vid settlement | N eller domänserie | Bank eller skuld/fordran | 7940 Valutakursvinster | Används när faktiskt funktionellt likvidbelopp är gynnsammare än bokfört belopp. |
| Realiserad FX-förlust vid settlement | N eller domänserie | 7930 Valutakursförluster | Bank eller skuld/fordran | Används när faktiskt funktionellt likvidbelopp är sämre än bokfört belopp. |
| Orealiserad omvärdering av öppen fordran eller skuld | N | AR/AP/bank eller 7930 beroende på riktning | 7940 eller AR/AP/bank beroende på riktning | Delta mellan gammalt och nytt carrying value. |
| Auto-reversal av tidigare omvärdering | N | Tidigare kreditkonto | Tidigare debetkonto | Används om policyprofil kräver reversering nästa period. |

## Fel- och granskningsköer

- **missing_rate** — Ingen giltig kurs finns för datumet.
- **fx_settlement_review** — Betalning i annan valuta eller oklart bankbelopp kräver manuell kontroll.
- **revaluation_conflict** — Samma post försöker omvärderas flera gånger i samma period.
- **manual_rate_override_review** — Override kräver attest eller kontroll.
- **rounding_residual** — Liten rest i funktionell valuta kräver policybaserad avrundning.

## Idempotens, spårbarhet och audit

- Rate sets ska vara versionsstyrda och publiceras med `source + date + currency_pair` som unik nyckel.
- Settlement-beräkning ska låsas på `open_item_id + settlement_event_id + settled_portion`.
- Revaluation batch ska ha `company + period + scope + version` och item-level hashes.
- Alla använda kurser ska kunna återspelas i rapporter även efter att nyare kurs publicerats.

## Golden tests

1. **Utländsk kundfaktura betald i samma valuta**

- Boka faktura i EUR och betala senare i EUR med annan kurs.
- Förväntat utfall: realiserad FX i 7930/7940.

2. **Delbetalning**

- Stäng 40 procent av posten och lämna resten öppen.
- Förväntat utfall: FX realiseras bara på reglerad del.

3. **Periodisk omvärdering**

- Omvärdera öppen EUR-fordran vid månadsslut.
- Förväntat utfall: serie N med orealiserad differens.

4. **Betalning i annan valuta än fakturan**

- USD-betalning reglerar EUR-faktura.
- Förväntat utfall: tydlig omräkning via funktionell valuta och eventuellt residualspår.

5. **Saknad kurs**

- Försök boka transaktion utan publicerad kurs.
- Förväntat utfall: missing_rate.

## Exit gate

- [ ] alla flöden sparar originalvaluta, bokföringskurs och funktionellt belopp
- [ ] realiserad och orealiserad FX kan skiljas åt och återspelas historiskt
- [ ] periodisk omvärdering går att köra idempotent med tydlig sign-off
- [ ] betalning i annan valuta än fakturan kan förklaras utan glapp
- [ ] kursovernrides är sällsynta och fullt auditerade
