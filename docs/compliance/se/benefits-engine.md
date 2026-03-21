# Benefits engine

Detta dokument definierar förmånsmotorn. Den ska kunna värdera, bokföra, rapportera och förklara både skattepliktiga och skattefria förmåner, med stöd för egen betalning, nettolöneavdrag och AGI.

## Scope

Förmånsmotorn ska hantera minst:
- bilförmån
- drivmedelsförmån
- trängselskatt
- infrastrukturavgifter
- parkering
- kostförmån
- telefon och internet
- sjukvårdsförsäkring
- friskvårdsbidrag
- gåvor
- personalrabatter
- cykelförmån
- bostadsförmån
- ränteförmån
- privata köp på företagskort

## Datamodell

Minst:
- `benefit_catalog`
- `benefit_events`
- `benefit_valuations`
- `benefit_deductions`
- `benefit_documents`
- `benefit_posting_intents`
- `benefit_agi_mappings`

## Grundprinciper

1. En förmånshändelse ska kunna knytas till anställd, period och underlag.
2. En förmån kan vara:
   - skattepliktig
   - skattefri
   - delvis skattepliktig
3. Värdering ska kunna baseras på:
   - schablon
   - marknadsvärde
   - särskild specialregel
4. Egen betalning och nettolöneavdrag ska kunna minska förmånsvärde när reglerna tillåter.
5. Förmånsvärde ska kunna rapporteras även om ingen kontant lön betalas ut.
6. Förmån ska kunna börja eller sluta mitt i månad, men värderingsregeln kan ändå ge helt månadsbelopp beroende på förmånstyp.
7. Alla förmånsbeslut ska kunna förklaras.

## 28. Förmåner — byggspec

### 28.1 Allmän modell
Varje förmånshändelse ska ha:
- benefit_type
- valuation_method
- start_date
- end_date
- tax_year
- market_value
- taxable_value
- employer_paid_value
- employee_paid_value
- net_deduction_value
- payroll_run_id
- agi_mapping_code
- supporting_document_id

### 28.2 Förmånstyper som måste stödjas
- bilförmån
- drivmedelsförmån
- trängselskatt
- infrastrukturavgifter
- parkering
- kostförmån
- telefon
- internet
- sjukvårdsförsäkring
- friskvårdsbidrag
- gåvor
- personalrabatt
- cykelförmån
- bostadsförmån
- ränteförmån
- privata köp på företagskort

### 28.3 Bilförmån
- privat användning i mer än ringa omfattning ger bilförmån
- ringa omfattning = högst tio tillfällen och högst 100 mil per år
- körjournal krävs som bevis om ringa omfattning åberopas
- arbetsgivaren ska betala arbetsgivaravgifter på förmånsvärdet
- arbetsgivaren ska göra skatteavdrag på förmånsvärdet och kontant ersättning; om ingen kontant ersättning finns kan inget skatteavdrag göras
- bilförmån beräknas schablonmässigt utifrån nybilspris, extrautrustning och fordonsskatt samt specialregler
- förmån några dagar i månaden utlöser normalt förmånsvärde för hela månaden
- fritt drivmedel, trängselskatt och infrastrukturavgifter ingår inte i bilförmånsvärdet utan hanteras separat
- omfattande tjänstekörning ska kunna sänka förmånsvärdet när reglerna medger det
- taxibilar, servicebilar och vissa lätta lastbilar kan ha särskild hantering

### 28.4 Drivmedelsförmån
- om arbetsgivaren betalar privat drivmedel ska separat drivmedelsförmån beräknas
- gäller även el
- privat och tjänstekörning måste kunna särskiljas via körjournal
- om anställd med förmånsbil enligt avtal betalar privat drivmedel själv till utomstående ska ingen drivmedelsförmån uppkomma
- vid laddning på arbetsgivarens bekostnad som inte omfattas av skattefrihet ska skattepliktig drivmedelsförmån kunna uppstå

### 28.5 Kostförmån
- helt fri kost 2026: 310 kr per dag
- fri lunch eller middag 2026: 124 kr per dag
- fri frukost 2026: 62 kr per dag
- om den anställde betalar själv via nettolöneavdrag eller direktbetalning ska förmånsvärdet minskas med motsvarande belopp
- intern representation, personalfester och vissa konferenssituationer kan vara skattefria
- om arbetsgivaren inte betalar någon kontant lön vid sidan av kostförmån kan inget skatteavdrag göras

### 28.6 Friskvård
- friskvårdsbidrag ska erbjudas hela personalen på lika villkor
- beloppet får inte överstiga 5 000 kr per anställd och år för skattefrihet
- avser enklare motion och friskvård
- presentkort som sådant är inte skattefri friskvård
- bidraget ska avse innevarande år
- kvitto/underlag ska visa vilken aktivitet som köpts
- systemet ska blockera carry-over mellan år om policyn kräver skattefri hantering

### 28.7 Gåvor till anställda
- huvudregel: gåvor från arbetsgivaren är skattepliktiga
- undantag: julgåva, jubileumsgåva, minnesgåva under villkor
- julgåva 2026 skattefri upp till 600 kr inkl moms
- jubileumsgåva 2026 skattefri upp till 1 800 kr inkl moms
- minnesgåva skattefri upp till 15 000 kr inkl moms
- minnesgåva ges till varaktigt anställda i samband med jämna födelsedagar från 50 år, minst 20 års anställning eller när anställning upphör
- gåvobeloppen är gränsbelopp: överskrids de beskattas hela gåvan från första kronan
- frakt/administration ska inte ingå i gåvans värde om de hålls separat enligt reglerna

## Ytterligare regler som ska modelleras

### Bilförmån
- Körjournal krävs för påstådd ringa privat användning.
- Del av månad kan ändå utlösa helt månadsbelopp.
- Omfattande tjänstekörning och specialfordon måste kunna flaggas för särskild hantering.
- Om ingen kontant ersättning betalas ut ska systemet visa att skatteavdrag inte kan göras på vanligt sätt.

### Friskvård
- Policy ska kunna kräva lika villkor för hela personalen.
- Carry-over mellan år ska kunna blockeras.
- Presentkort ska inte behandlas som skattefri friskvård.
- Underlag måste visa aktivitet, datum och leverantör.

### Gåvor
- Gåvotyp måste lagras.
- Gränsbelopp ska behandlas som “allt eller inget”.
- Minnesgåva ska bara tillåtas när de materiella villkoren är uppfyllda.

## Output till andra domäner

Förmånsmotorn ska producera:
- lönerader eller benefit-to-payroll events
- AGI-mappning
- bokföringshändelser
- kostnadsfördelning per dimension
- audit trail och beslutsförklaring

## Golden tests

- bilförmån hel månad
- bilförmån start mitt i månad
- drivmedelsförmån med korrekt körjournal
- kostförmån med egen betalning
- friskvård inom gräns
- friskvård över gräns
- julgåva under och över gräns
- privat kortköp på företagskort
- förmån utan kontant lön

## Codex-prompt

```text
Read docs/compliance/se/benefits-engine.md, docs/compliance/se/payroll-engine.md and docs/compliance/se/agi-engine.md.

Implement the benefits engine with:
- benefit catalog
- benefit events
- valuation rules
- employee payment offsets
- payroll integration
- AGI mapping
- accounting intents
- golden tests

Show the explanation object for every valuation.
```

## Exit gate

- [ ] Alla förmånstyper i scope går att registrera.
- [ ] Värdering kan förklaras per event.
- [ ] Förmåner mappas korrekt till lön, AGI och bokföring.
- [ ] Egen betalning och nettolöneavdrag hanteras korrekt.
