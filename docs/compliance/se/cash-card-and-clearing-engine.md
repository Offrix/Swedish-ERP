> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Cash card and clearing engine

Detta dokument definierar kassa, kort, kortinlösen, anställdas utlägg, settlement, avgifter och clearing för svenska bolag.

## Scope

### Ingår

- kassa- och växelkassaflöden, kontantutlägg, dagsräkning och differenser
- företagskort, korttransaktioner, kvittolänkning, privata köp och återkrav
- anställdas privata utlägg som ska ersättas av bolaget
- merchant/acquirer-settlement, avgifter, nettoutbetalning och clearingkonton

### Ingår inte

- vanliga bankkontotransaktioner utanför kort- och kassaflöden
- full lönemotor för utlägg via löneavdrag; här definieras endast ekonomiska grundflöden

### Systemgränser

- Cash/Card-motorn äger cash session, corporate card transaction, expense claim och settlement batch.
- Dokumentmotorn äger kvitton och OCR men inte själva ekonomiska beslutet.
- Ledgern bokar posting intents från cash/card-motorn.

## Hårda regler

1. Kontantkassa ska ha utsedd ansvarig och daglig eller periodisk räkning med dokumenterat öppnings- och stängningssaldo.
2. Företagskortstransaktion får inte stängas ekonomiskt förrän den klassificerats mot kvitto, leverantörsfaktura eller privat återkrav.
3. Anställds privata utlägg får inte ersättas utan underlag och attest enligt policy.
4. Samma korttransaktion eller kvitto får inte bokas två gånger.
5. Settlement-differenser mot acquirer ska särskilja huvudbelopp, avgift, chargeback och reservhållning när sådan finns.
6. Privata köp på företagskort ska bli fordran på anställd eller löneavdrag, aldrig bolagskostnad.
7. Kassadifferenser över policygräns ska till review och får inte döljas i driftkostnad utan sign-off.

## Begrepp och entiteter

- **Cash session** — Period där en kassa öppnas, används, räknas och stängs.
- **Corporate card transaction** — Köp eller kreditering på företagets kort före slutlig settlement.
- **Expense claim** — Anställds begäran om ersättning för privat utlägg.
- **Settlement batch** — Avräkning från kortinlösare eller kortutgivare med nettoutbetalning och avgifter.
- **Card clearing** — Interimskonto som håller korttransaktioner tills bank eller settlement bekräftar slutlig likvid.
- **Chargeback** — Återförd korttransaktion som kräver separat hantering.

## State machines

### Cash session

- `open -> counted -> closed -> reconciled`

- Övergång till `counted` kräver fysisk räkning och notering av differens.
- `reconciled` kräver att differensen är noll eller godkänd.

### Corporate card transaction

- `authorized -> posted_by_provider -> matched_to_receipt -> settled -> disputed -> reversed`

- `matched_to_receipt` kräver kvitto eller annan klassificering.
- `settled` nås när bank eller kortfaktura har fångat transaktionen ekonomiskt.

### Expense claim

- `draft -> submitted -> approved -> payable -> reimbursed -> rejected`

- `payable` innebär att bolaget nu har skuld till den anställde.
- `reimbursed` kräver betalningshändelse eller lönekvittning.

### Settlement batch

- `received -> matched -> posted -> reconciled -> failed`

- Både bruttoförsäljning, avgifter och nettoutbetalning ska kunna förklaras.
- Saknad matchning mot tidigare transaktioner ska gå till review.

## Inputfält och valideringar

### Kassa

#### Fält

- cash_box_id, ansvarig, öppningssaldo, räkningsdatum, inbetalningar, utbetalningar, differens, kommentar och dokumentlänkar

#### Valideringar

- öppningssaldo och stängningssaldo måste kunna räknas fram från registrerade händelser
- negativ kassa utan override ska blockeras

### Korttransaktioner och kvitton

#### Fält

- kort-id, kortinnehavare, belopp, valuta, merchant, transaktionsdatum, provider-id, MCC/typkod, kvittolänk, klassificering

#### Valideringar

- samma provider-id får inte skapa dubbeltransaktion
- kort måste vara kopplat till anställd eller kostnadsbärare
- transaktion över policygräns utan kvitto ska gå till review

### Expense claims och settlement

#### Fält

- anställd, datum, belopp, valuta, moms, kostnadskonto, kvitto, projekt, ersättningssätt
- settlement batch-id, brutto, avgift, chargeback, nettobelopp, bankdatum

#### Valideringar

- expense claim måste ha underlag och attest före `payable`
- settlement måste kunna förklaras av tidigare korttransaktioner eller försäljningsposter

## Beslutsträd/regler

### Kassa

- Kontantköp bokas direkt mot kassa när ekonomisk händelse uppstår.
- Kassadifferens inom liten policygräns kan bokas mot definierat differenskonto; över gränsen krävs review.
- Påfyllning och uttag till bank ska behandlas som intern överföring mellan 1000/1030 och 1110.

### Företagskort och privata köp

- Företagskortsköp bokas initialt mot kortclearing tills bank eller kortfaktura träffar bankkontot.
- Om transaktionen klassas som privat ska clearingen gå mot fordran på anställd i stället för kostnad.
- Kredit/refund på kort ska spegelvända ursprunglig kostnad eller fordran.

### Anställdas utlägg och settlement

- Privata utlägg skapar skuld till anställd först när claim godkänns.
- Nettoutbetalning från acquirer får inte bokas som ren försäljning; avgifter och reserver måste särredovisas.
- Chargebacks ska kunna återöppna försäljnings- eller kundposition beroende på ursprungsflöde.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Kontant påfyllning av kassa | G | 1000/1030 Kassa | 1110 Bankkonto | Intern överföring. |
| Kontant köp/kostnad | G | Kostnadskonto och eventuell 2640 | 1000/1030 Kassa | Bokas när utbetalningen sker. |
| Kassadifferens underskott | G | Konfigurerat differenskonto, default 6900 | 1000/1030 Kassa | Kräver reason code. |
| Kassadifferens överskott | G | 1000/1030 Kassa | Konfigurerat differenskonto, default 3590 | Kräver reason code. |
| Företagskortsköp | G | Kostnad/tillgång och eventuell 2640 | 1170 Kortkonto clearing | Slutlig bankpåverkan kommer senare. |
| Bank- eller kortfakturalikvid för företagskort | G | 1170 Kortkonto clearing | 1110 Bankkonto | Stänger clearingen mot bank. |
| Privat köp på företagskort | G | 1310 Fordran kortutlägg anställda | 1170 Kortkonto clearing | Ska senare återbetalas eller löneavräknas. |
| Godkänd expense claim | G | Kostnad/tillgång och eventuell 2640 | 2990 Övriga kortfristiga skulder | Bolaget blir skyldigt den anställde pengar. |
| Utbetalning av expense claim | G | 2990 Övriga kortfristiga skulder | 1110 Bankkonto | Kan även kvittas i lön i separat flöde. |
| Acquirer-settlement av försäljning | G | 1110 Bankkonto, 6070 Avgifter vid behov | 1330 Fordran Swish/kortinlösen | Förutsätter att ursprunglig försäljning redan bokat 1330 som fordran. |

## Fel- och granskningsköer

- **cash_difference_review** — Kassadifferens över policygräns.
- **missing_receipt** — Korttransaktion eller utlägg saknar kvitto.
- **private_spend_review** — Korttransaktion misstänks vara privat.
- **settlement_mismatch** — Nettoutbetalning stämmer inte mot transaktioner och avgifter.
- **chargeback_review** — Chargeback eller återföring kräver manuell klassning.
- **employee_recovery_pending** — Fordran på anställd är inte återbetald inom policyfönster.

## Idempotens, spårbarhet och audit

- Korttransaktion ska använda provider-id och kort-id som primär nyckel.
- Expense claim ska bära dokumenthash på kvitto och `claim_id`.
- Settlement batch ska ha `provider_batch_id` och radhash för att undvika dubbelposting.
- Privata köp och återkrav ska kunna följas från originaltransaktion till slutlig återbetalning eller löneavdrag.

## Golden tests

1. **Företagskortsköp**

- Boka kortköp och senare banklikvid.
- Förväntat utfall: 1170 används som clearing mellan köp och bank.

2. **Privat köp på företagskort**

- Klassa köp som privat.
- Förväntat utfall: 1310 fordran på anställd i stället för kostnad.

3. **Expense claim**

- Godkänn anställds privata utlägg och betala ut.
- Förväntat utfall: 2990 skuld uppstår och nollas vid utbetalning.

4. **Kontantdifferens**

- Stäng kassa med underskott.
- Förväntat utfall: differenskonto bokas och review skapas om gräns överskrids.

5. **Acquirer-settlement med avgift**

- Matcha nettoutbetalning mot tidigare kortfordran.
- Förväntat utfall: 1330 minskar och avgift bokas separat.

## Exit gate

- [ ] kassa, företagskort, utlägg och settlement kan följas med tydliga clearingkonton
- [ ] privata köp och saknade kvitton hamnar i egna köer
- [ ] ingen kort- eller kassahändelse dubbelbokas
- [ ] fordran på anställd och skuld till anställd särskiljs korrekt
- [ ] settlement och banklikvid går att stämma av mot ledgern

