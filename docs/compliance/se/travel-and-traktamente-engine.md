> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Travel and traktamente engine

Detta dokument definierar resemotorn: tjänsteresa, utlägg, inrikes och utrikes traktamente, måltidsreduktion, nattraktamente, bilersättning, körjournal och bokförings-/lönekoppling.

## Scope

Motorn ska klara:
- reseförfrågan och förhandsgodkännande
- tjänsteresa som objekt
- utlägg med privatkort eller företagskort
- inrikes traktamente
- utrikes traktamente
- måltidsreduktion
- nattraktamente/logiersättning
- bilersättning
- körjournal
- valutor
- resor över flera länder
- reserelaterad lönepåverkan
- projektkoppling

## Datamodell

Minst:
- `travel_claims`
- `travel_days`
- `travel_meal_events`
- `travel_country_segments`
- `mileage_logs`
- `expense_receipts`
- `travel_advances`
- `travel_posting_intents`

## Beräkningsordning

1. fastställ om detta är tjänsteresa
2. fastställ om övernattning finns
3. kontrollera 50 km-regeln
4. dela upp resa i dagar och länder
5. beräkna hel/halv dag
6. beräkna långtidsreduktion efter 3 månader eller 2 år
7. applicera måltidsreduktion
8. separera skattefri och skattepliktig del
9. skapa lönedata, bokföringsdata och projektkostnad

## 29. Resor, traktamente, bilersättning och utlägg — byggspec

### 29.1 Resefält som alltid ska finnas
- trip_id
- employee_id
- purpose
- start_datetime
- end_datetime
- home_location
- regular_work_location
- first_destination
- overnight_count
- country_sequence
- meals_paid_by_employer
- lodging_paid_by_employer
- own_car_distance_km
- company_car_distance_km
- fuel_paid_by_employee_flag
- currency
- receipts
- approval_status

### 29.2 Skattefritt traktamente — grundvillkor
För skattefritt traktamente krävs att:
- den anställde gör tjänsteresa
- tjänsteresan har övernattning
- resan ligger mer än 50 km från både bostaden och den vanliga verksamhetsorten
- beloppet inte överstiger gällande schablon
- arbetsgivaren har underlag, till exempel reseräkning

Om villkoren inte är uppfyllda:
- ersättningen blir lön eller annan skattepliktig ersättning

### 29.3 Inrikes traktamente 2026
- hel dag: 300 kr
- halv dag: 150 kr
- nattraktamente om logikostnad inte styrks och arbetsgivaren inte betalat övernattning: 150 kr
- avresedag = hel dag om resan påbörjas före 12.00
- avresedag = halv dag om resan påbörjas 12.00 eller senare
- hemkomstdag = hel dag om resan avslutas efter 19.00
- hemkomstdag = halv dag om resan avslutas 19.00 eller tidigare
- nattschablon när resan pågår mellan 24.00 och 06.00

### 29.4 Långvarig tjänsteresa samma ort
- efter tre månader: 70 procent av maximibeloppet/normalbeloppet per hel dag
- i Sverige 2026 blir detta 210 kr per hel dag
- efter två år: 50 procent per hel dag, i Sverige 2026 = 150 kr
- halvdagstraktamente ska inte medges efter mer än tre månader på samma ort
- systemet ska kunna räkna periodförlängning och undantag med semester/arbetsfria dagar enligt regelmotor

### 29.5 Måltidsreduktion — inrikes 2026
Helt traktamente 300 kr:
- fri frukost: minska med 60 kr
- fri lunch eller middag: minska med 105 kr
- fri lunch och middag: minska med 210 kr
- fri frukost, lunch och middag: minska med 270 kr

Efter tre månader, 210 kr:
- fri frukost: minska med 42 kr
- fri lunch eller middag: minska med 74 kr
- fri lunch och middag: minska med 147 kr
- fri frukost, lunch och middag: minska med 189 kr

Efter två år, 150 kr:
- fri frukost: minska med 30 kr
- fri lunch eller middag: minska med 53 kr
- fri lunch och middag: minska med 105 kr
- fri frukost, lunch och middag: minska med 135 kr

Halvt traktamente 150 kr:
- fri frukost: minska med 30 kr
- fri lunch eller middag: minska med 53 kr
- fri lunch och middag: minska med 105 kr
- fri frukost, lunch och middag: minska med 135 kr

Not:
- hotellfrukost som ingår i rumspriset minskar traktamentet men ska normalt inte förmånsbeskattas som kostförmån
- om måltid bara delvis betalats av den anställde ska reduktion ändå kunna göras

### 29.6 Utlandstraktamente
- normalbelopp per land måste lagras tabellstyrt för varje inkomstår
- avrese- och hemkomstdagar följer halv/hel dagslogik utifrån klockslag och det land där längsta tiden av dagen tillbringats
- måltidsreduktion utomlands:
  - helt fri kost: reducera 85 %
  - lunch och middag: reducera 70 %
  - lunch eller middag: reducera 35 %
  - frukost: reducera 15 %
- efter tre månader: 70 % av landets normalbelopp
- efter två år: 50 % av landets normalbelopp
- systemet ska stödja flera länder på samma resa
- omräkning ska lagra både landets normalbelopp och vald valutakurs

### 29.7 Bilersättning
Nuvarande schablon för inkomstår 2025 och 2026:
- egen bil: 25 kr per mil
- förmånsbil utom helt eldriven: 12 kr per mil
- förmånsbil helt eldriven: 9,50 kr per mil

Regler:
- högre ersättning än schablon => överskjutande del hanteras som lön
- med förmånsbil får skattefri milersättning bara betalas om den anställde själv betalat allt drivmedel
- om den anställde bara delvis betalat drivmedlet kan arbetsgivaren inte betala skattefri milersättning; eventuell ersättning blir lön
- allmänna kommunikationer, taxi och hyrbil hanteras som faktiska kostnader/utlägg, inte milersättning

### 29.8 Körjournal
Körjournal ska stödja:
- datum
- start/slut-tid
- startplats/slutplats
- syfte
- mätarställning start/slut
- körd sträcka
- privat/tjänst
- förare
- projekt/kund
- laddning/bränslekostnad
- trängselskatt/infrastrukturavgift
- kvitton och stödbevis

## Output till andra domäner

Resemotorn ska kunna skapa:
- skattefria ersättningar
- skattepliktiga lönearter för överskjutande del
- bokföringshändelser
- projektkostnader
- körjournalsrapporter
- beslutsförklaring

## Edge cases

- resa börjar i Sverige och fortsätter utomlands samma dag
- flera länder samma kalenderdygn
- hotellfrukost ingår i rumspris
- företaget betalar vissa måltider men inte alla
- förmånsbil där drivmedel bara delvis betalats av den anställde
- resa över månadsskifte
- retroaktiv reseräkning
- reseförskott som över- eller underavräknas

## Golden tests

- inrikes heldag
- inrikes halvdag
- avresa före 12 och hemkomst efter 19
- långtidsresa efter 3 månader
- långtidsresa efter 2 år
- hotellfrukost
- lunch och middag betald av arbetsgivare
- utlandstraktamente ett land
- utlandstraktamente flera länder
- egen bil 25 kr/mil
- förmånsbil 12 kr/mil
- helt eldriven förmånsbil 9,50 kr/mil
- överskjutande ersättning blir lön

## Codex-prompt

```text
Read docs/compliance/se/travel-and-traktamente-engine.md and docs/compliance/se/payroll-engine.md.

Implement the travel engine with:
- trip object
- per-day classification
- domestic and foreign traktamente
- meal reduction logic
- mileage logs
- expense receipts
- payroll and accounting outputs
- golden tests

Store both decision codes and explanations for every claim.
```

## Exit gate

- [ ] Traktamente delas upp i skattefri och skattepliktig del korrekt.
- [ ] Långtidsreduktion fungerar.
- [ ] Flera länder och måltidsreduktion fungerar.
- [ ] Bilersättning och körjournal kan granskas i efterhand.

