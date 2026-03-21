# Collections writeoff and bad debt engine

Detta dokument definierar inkasso-gräns, påminnelseavgift, dröjsmålsränta, osäkra kundfordringar, konstaterad kundförlust och momseffekt för svenska bolag.

## Scope

### Ingår

- påminnelsekörningar, lag- och avtalstyrda avgifter, dröjsmålsränta och senbetalningsersättning
- eskalering från förfallen fordran till inkasso, rättslig hantering eller intern write-off
- klassificering av osäkra kundfordringar, reservering, konstaterad kundförlust och senare återvinning
- momskorrigering när villkor för konstaterad kundförlust är uppfyllda

### Ingår inte

- extern inkassopartners tekniska adapter i detalj
- allmän AR-fakturering före förfallodatum

### Systemgränser

- Collections-motorn äger dunning case, collection case, doubtful debt case, bad debt confirmation och recovery event.
- AR äger ursprungsfakturan och den öppna kundposten fram till att collections-motorn eskalerar den.
- Ledgern bokar posting intents från collections-motorn, ofta i serie V eller annan policybestämd serie.

## Hårda regler

1. Påminnelseavgift får endast tas ut om rätten till avgiften avtalats senast när skulden uppkom.
2. Skriftlig påminnelseersättning får högst vara 60 kronor, inkassokrav 180 kronor och amorteringsplan 170 kronor enligt gällande lagregler.
3. Senbetalningsersättning om 450 kronor för näringsidkare och offentliga organ får bara användas när dröjsmålsränta får tas ut, och andra förseningsersättningar får då bara tas ut i den del de överstiger 450 kronor totalt.
4. Lagstadgad dröjsmålsränta ska beräknas enligt referensränta plus åtta procentenheter när inget annat avtalats.
5. Tvistad faktura får inte gå till påminnelse, inkasso eller kundförlust utan separat handläggning.
6. Osäker kundfordran och konstaterad kundförlust är olika tillstånd och ska bokföras olika.
7. Moms får reduceras som kundförlust först när villkoren för konstaterad förlust är uppfyllda och underlag finns.
8. Små administrative write-offs får inte blandas ihop med konstaterad kundförlust.

## Begrepp och entiteter

- **Dunning case** — Påminnelseärende för en eller flera förfallna kundposter.
- **Påminnelseavgift** — Lag- eller avtalsstyrd avgift för skriftlig betalningspåminnelse.
- **Dröjsmålsränta** — Ränta som löper efter förfallodatum på obetald skuld.
- **Senbetalningsersättning** — Schablonersättning på 450 kronor i vissa B2B/offentliga fall.
- **Osäker kundfordran** — Fordran där kreditrisken ökat men förlust ännu inte är definitiv.
- **Konstaterad kundförlust** — Fordran där förlust bedömts definitiv och eventuell moms får justeras.
- **Återvinning** — Senare betalning på tidigare konstaterad kundförlust.

## State machines

### Dunning case

- `open -> reminded -> escalated -> hold -> closed`

- `hold` används vid tvist, dödsbo, konkursobservation eller annan policyorsak.
- `closed` nås när skulden reglerats, krediterats eller lämnats över till annat flöde.

### Doubtful debt case

- `identified -> reviewed -> reserved -> confirmed_bad_debt -> recovered -> closed`

- `reserved` betyder att fordran flyttats eller reserverats som osäker men inte definitivt förlorad.
- `confirmed_bad_debt` kräver underlag som styrker att förlusten är definitiv eller i vart fall klar enligt bolagets regelpaket.

### Write-off

- `proposed -> approved -> posted -> reversed`

- Administrativ write-off får bara användas inom liten policygräns.
- Write-off som egentligen är kundförlust ska gå via bad debt-spåret.

## Inputfält och valideringar

### Påminnelse- och inkassoregler

#### Fält

- karenstid, max antal påminnelser, tillåtelse för avgift, tillåtelse för ränta, B2B/B2C-flagga, inkassogräns och senbetalningsersättning

#### Valideringar

- avgift och ränta får inte aktiveras om avtal eller lagstöd saknas för kundtypen
- senbetalningsersättning får inte kombineras felaktigt med andra lagreglerade ersättningar

### Bad debt underlag

#### Fält

- orsakskod, inkassoresultat, konkursbevis, indrivningsbedömning, datum för definitiv förlust, tidigare reservering, momsandel

#### Valideringar

- konstaterad kundförlust kräver underlag och godkänd beslutsnivå
- momskorrigering kräver att fakturan tidigare har redovisat moms

### Återvinning

#### Fält

- återvunnet belopp, datum, betalningssätt, ursprunglig förlustpost, momsandel

#### Valideringar

- återvinning får inte ske utan länk till tidigare bad debt case
- återvunnen moms ska återföras proportionellt mot återvunnet belopp

## Beslutsträd/regler

### Påminnelse och ränta

- Efter förfallodag och eventuell karenstid kan påminnelseärende skapas.
- Påminnelseavgift bokas bara om villkor finns från skuldens uppkomst.
- Dröjsmålsränta beräknas dag för dag på förfallet restbelopp med avtalad ränta eller lagmodell.
- B2B/offentliga ärenden kan få senbetalningsersättning om lagens villkor är uppfyllda.

### Osäker kundfordran och konstaterad förlust

- Fördjupad kreditrisk eller misslyckat inkassospår kan leda till osäker kundfordran och eventuell reservering.
- Definitiv förlust kräver tydligt underlag såsom konkurs, fastställd obeståndssituation, resultatlöst indrivningsförsök eller annan godkänd orsak.
- Först vid konstaterad kundförlust får tidigare redovisad moms justeras enligt motorns regelpaket.

### Återvinning och smådifferenser

- Senare betalning på tidigare kundförlust ska delas upp i återvunnen intäkt och återredovisad moms.
- Små restbelopp under policygräns får avslutas via write-off utan att klassas som kundförlust om lagvillkoren för kundförlust inte är uppfyllda.
- Tvistade poster får varken skrivas av administrativt eller klassas som definitiv kundförlust utan särskilt beslut.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Påminnelseavgift | V | 1210/1220/1230 Kundfordringar | 3520 Påminnelseavgifter | Ingen moms när avgiften är ren förseningsersättning. |
| Dröjsmålsränta | V | 1210/1220/1230 Kundfordringar | 3530 Ränteintäkter kundreskontra | Ingen moms på ren dröjsmålsränta. |
| Senbetalningsersättning 450 kr | V | 1210/1220/1230 Kundfordringar | 3590 Övriga rörelseintäkter | Används bara när lagens villkor är uppfyllda. |
| Omklassning till osäker kundfordran | V | 1240 Osäkra kundfordringar | 1210/1220/1230 Kundfordringar | Flyttar fordran till särskild balanspost. |
| Reservering för osäker kundfordran | V | Konfigurerat kostnadskonto för befarad kundförlust, default 6900 | 1250 Nedskrivning kundfordringar | Skapar nedskrivningsreserv utan att ännu justera moms. |
| Konstaterad kundförlust utan tidigare reservering | V | Kostnadskonto för kundförlust, 2610/2620/2630 eller relevant momskonto i debet | 1210/1220/1230 Kundfordringar | Nettobelopp blir kostnad och tidigare redovisad moms återförs. |
| Konstaterad kundförlust efter reservering | V | 1250 Nedskrivning kundfordringar, relevant momskonto i debet | 1240 Osäkra kundfordringar | Förbrukar tidigare reserv och återför moms. |
| Återvinning av tidigare kundförlust | V | 1110 Bankkonto | 3590 Återvunnen kundförlust/intäkt, relevant utgående moms | Bokas proportionellt mot återvunnet belopp. |
| Administrativ liten write-off | V | Konfigurerat smådifferenskonto | 1210/1220/1230 Kundfordringar | Ingen momsjustering om det inte är konstaterad kundförlust. |

## Fel- och granskningsköer

- **dunning_hold** — Tvist, policyspärr eller oklar juridisk status.
- **interest_fee_conflict** — Regler för avgift, ränta och senbetalningsersättning krockar.
- **bad_debt_evidence_missing** — Underlag för definitiv kundförlust saknas.
- **vat_correction_review** — Kundförlust kräver kontroll av momseffekt.
- **recovery_review** — Återvinning måste fördelas mot tidigare förlust och moms.

## Idempotens, spårbarhet och audit

- Påminnelsehändelser ska låsas på `invoice_id + stage + calculation_window`.
- Ränteberäkning ska spara räntedagar, basbelopp och använd räntesats så att samma körning kan återspelas.
- Bad debt case ska bära `case_id`, underlagsversion och beslutsversion.
- Återvinning ska kopplas till tidigare case och betalningshändelse för att undvika dubbelintäkt.

## Golden tests

1. **Påminnelseavgift tillåten**

- Skapa förfallen B2C-faktura där villkor tillåter avgift.
- Förväntat utfall: 3520 bokas utan moms.

2. **Senbetalningsersättning B2B**

- Skapa förfallen B2B-faktura med rätt villkor.
- Förväntat utfall: 450 kr på 3590 och rätt spärr mot otillåten dubbeldebitering.

3. **Osäker kundfordran**

- Eskalerad fordran klassas som osäker.
- Förväntat utfall: 1240 och eventuell 1250 används.

4. **Konstaterad kundförlust med momsjustering**

- Definitiv förlust fastställs.
- Förväntat utfall: kundfordran stängs, kostnad bokas och moms återförs.

5. **Återvinning efter kundförlust**

- Kunden betalar del av tidigare förlust.
- Förväntat utfall: bank debiteras och intäkt plus moms återredovisas.

## Exit gate

- [ ] påminnelse, ränta och senbetalningsersättning följer regelpaket och policy
- [ ] osäker kundfordran och konstaterad kundförlust hålls isär
- [ ] momsjustering sker bara när villkoren är uppfyllda
- [ ] återvinning kan knytas till tidigare förlustfall
- [ ] smådifferenser blandas inte ihop med verklig kundförlust
