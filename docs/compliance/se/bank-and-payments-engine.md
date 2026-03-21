# Bank and payments engine

Detta dokument definierar bank- och betalningsmotorn för svenska bolag: bankkonton, statement/import/feed, inbetalningar, utbetalningar, betalningsförslag, bankavgifter, returer, felmatchningar, clearingkonton, suspense-fall, idempotens och avprickning mot AR, AP och ledger.

## Scope

### Ingår

- bankkonto- och bankkopplingsregister per bolag, konto och valuta
- import av banktransaktioner via feed, fil eller manuell statement-import
- klassificering och avprickning av inbetalningar, utbetalningar, avgifter, räntor, interna överföringar och okända poster
- betalningsförslag för leverantörsskulder, export av betalordrar, acceptansstatus och slutlig bankmatchning
- hantering av bankavgifter, returer, chargebacks, felmatchningar, suspensetransaktioner och clearing
- avprickning mot kundreskontra, leverantörsreskontra, förskott, clearingkonto och bankbok
- idempotent import, webhook-hantering och full auditkedja från extern bankhändelse till ledger

### Ingår inte

- detaljerad AP-fakturalogik före betalningsförslag; den ägs av AP-motorn
- detaljerad AR-fakturalogik före inbetalningsmatchning; den ägs av AR-motorn
- kortinlösen och merchant settlement; den ägs av cash-card-and-clearing-dokumentet

### Systemgränser

- Bankmotorn äger bankkonto, statement batch, statement line, payment proposal, payment order och bankmatchning.
- AR och AP äger öppna poster och returnerar matchningsbara målobjekt till bankmotorn.
- Ledgern skapar verifikationer från bankmotorns posting intents men ändras aldrig direkt av adapterkod.
- Öppna bankkopplingar, feed-events och manuella importfiler behandlas som externa källor med egna idempotensnycklar.

## Hårda regler

1. Varje externt bankkonto ska vara mappat till exakt ett ledgerkonto och en funktionell valuta innan första import eller betalningsfil körs.
2. Samma banktransaktion får aldrig skapa dubbelbokning, även om den kommer både som webhook, feed och filimport.
3. Payment order får aldrig skickas två gånger till banken med samma affärssyfte. Export och submit måste använda deterministisk betalordernyckel.
4. Utgående leverantörsbetalningar ska reserveras mot 2450 Ej utbetalda leverantörsbetalningar när betalningen lämnar systemet och först därefter bokas mot bank när banken faktiskt bokar posten.
5. Inkommande pengar utan säker motpost är aldrig intäkt. De ska ligga som ej allokerad inbetalning eller annan definierad suspenskapost tills de förklaras.
6. Okända utbetalningar får inte kostnadsföras automatiskt. De ska gå till utredningskonto eller granskningskö tills motparten identifierats.
7. Intern överföring mellan egna konton ska identifieras så att samma pengar inte kostnads- eller intäktsförs av misstag.
8. Bankmotorn får inte stänga AR- eller AP-poster utan spårbar allokering mot exakt statement line eller betalorderevent.
9. Bankstämning ska kunna reproduceras för varje dag med både bokfört saldo och externt kontosaldo.
10. Alla bank- och betalflöden ska vara idempotenta och fullständigt auditerade.

## Begrepp och entiteter

- **Bankkonto** — Externt företagskonto eller valutakonto som avprickas mot ledgern.
- **Statement batch** — Samlad import eller feed-synk för en period eller ett intervall.
- **Statement line** — Den minsta externa bankhändelsen som kan klassificeras, matchas och bokföras.
- **Payment proposal** — Urval av öppna skulder som systemet föreslår för betalning.
- **Payment order** — Den exakta instruktion som lämnar systemet mot bank eller bankportal.
- **Clearingkonto** — Internt konto som används mellan två steg, till exempel 2450 mellan AP och bankbokning.
- **Suspense-fall** — Bankhändelse som bokats till utredning eftersom motpart eller orsak ännu inte kunnat fastställas.
- **Returnerad betalning** — Tidigare initierad betalning som avvisats, återgått eller kommit tillbaka in på bankkontot.
- **Avprickning** — Kopplingen mellan bankhändelse och intern reskontra- eller ledgerpost.
- **Idempotensnyckel** — Stabil nyckel som hindrar att samma externa händelse bokförs fler än en gång.

## State machines

### Bankkoppling

- `planned -> active -> degraded -> revoked`

- `degraded` betyder att feed finns men inte är komplett eller att återautentisering krävs.
- `revoked` stoppar ny synk men påverkar inte historiska bankkonton eller tidigare importer.

### Statement batch

- `received -> parsed -> deduplicated -> classified -> posted -> reconciled -> failed`

- Batch får gå till `posted` först när varje rad antingen bokförts, markerats som intern motpost eller explicit lagts i review.
- Om en batch körs om ska redan bokförda rader återupptäckas via idempotensnycklar och markeras som duplicates.

### Statement line

- `new -> classified -> matched -> posted -> reversed -> ignored`

- `matched` betyder att motpart hittats men ännu inte nödvändigtvis bokförts om bokföringen sker i batchsteg.
- `ignored` får bara användas för tekniska dubbletter eller ren informationsrad som bankens källa själv inte påverkar saldo.

### Payment proposal

- `draft -> approved -> exported -> submitted -> accepted_by_bank -> partially_executed -> settled -> failed -> cancelled`

- `exported` betyder att betalfil skapats och AP-poster reserverats.
- `submitted` används när fil eller API-instruktion faktiskt lämnat systemgränsen.
- `accepted_by_bank` är operativ status och ersätter inte slutlig bankbokning.
- `settled` kräver att bankhändelse eller bankstatus visar att pengar lämnat kontot.

### Payment order line

- `prepared -> reserved -> sent -> accepted -> booked -> returned -> rejected`

- `reserved` innebär att skuld flyttats från 2410/2420/2430 till 2450.
- `returned` efter tidigare `booked` ska öppna skuld igen eller skapa särskilt återflöde beroende på affärsregel.

## Inputfält och valideringar

### Bankkonto och koppling

#### Fält

- konto-id, banknamn, bankens externa kontoid, bankgiro/plusgiro/IBAN, valuta, ledgerkonto, startdatum, öppningssaldo, feedtyp
- kopplingsmetadata: provider, samtyckes-id, scopes, webhook secret, senast lyckade synk, balansfönster och failover-läge

#### Valideringar

- ett bankkonto får inte ha två aktiva mappingar till olika ledgerkonton samma period
- kontots valuta ska matcha eller uttryckligen tillåta FX-bokning enligt valutamotorn
- nya konton måste ha öppningssaldo eller första fullständiga statement-intervall definierat

### Statement line

#### Fält

- bank transaction id, booked date, value date, amount, currency, running balance när banken levererar det, referensnummer, remittance text, motpartsnamn och motpartskonto
- line direction, bankens kod/transaktionstyp, källa (feed, file, webhook), batch-id, originalpayload-hash

#### Valideringar

- datum och belopp får inte vara tomma
- samma externa bank transaction id på samma konto ska normalt bara förekomma en gång; om banken saknar id måste hash av väsentliga fält användas
- belopp noll får bara accepteras för informationsrad som inte påverkar saldo
- transaktionsvaluta ska vara definierad även om bankkontot är i annan funktionell valuta

### Payment proposal och order

#### Fält

- förslagsdatum, betalningskonto, urvalsregler, betalningsdag, valuta, prioritet, likviditetsregel, mottagare, referens, totalbelopp
- orderrad med öppen AP-post, mottagarens bankuppgift, belopp, referens, bankkonto, batch-id och exportfil-id

#### Valideringar

- samma AP-post får inte förekomma i två öppna betalningsförslag samtidigt om de overlappar i tid
- betalningsdag får inte ligga i låst period om reserveringsbokning sker på skapelsedagen
- saknade eller nyligen ändrade bankuppgifter ska stoppa ordern från export

### Matchning och klassificering

#### Fält

- klassificeringskod, föreslagen motpost, sannolikhetsvärde, kopplad reskontrapost, eventuell FX- eller fee-komponent, kommentar
- auto-matchningsfält såsom OCR/referens, belopp, fakturanummer, leverantörsnamn, kundnamn och tidigare relationer

#### Valideringar

- klassificering med låg säkerhet ska gå till review i stället för autoposting
- intern överföring kräver identifiering av både utgående och inkommande sida eller tydlig suspenselogik
- fee, ränta och huvudbetalning får inte blandas i en enda rad utan stöd för bankens verkliga underlag

## Beslutsträd/regler

### Inkommande betalningar

- Om OCR eller referens exakt matchar en öppen kundfaktura och beloppet stämmer ska kundfordran stängas direkt.
- Om beloppet täcker flera öppna fakturor från samma kund får kombinationsmatchning föreslås men ska vara förklarbar.
- Om motpart är okänd eller beloppet inte går att förklara ska posten bokas som ej allokerad inbetalning eller review, aldrig som intäkt.
- Kundförskott före faktura ska kunna särskiljas från överbetalning efter faktura.

### Utgående betalningar

- Godkänt betalningsförslag skapar reservering mot 2450 innan fil exporteras eller API-submit sker.
- Bankens tekniska acceptans är inte samma sak som bokförd betalning; slutlig stängning sker först när statement line visar utflödet eller banken lämnar definitiv booked-status enligt adapterprofil.
- Rejection före bankbokning ska föra skuld tillbaka från 2450 till 2410/2420/2430 utan att bankkonto påverkas.
- Returnerad betalning efter bokning ska återöppna leverantörsskulden eller skapa särskilt återflöde enligt returorsak.

### Klassificering av avgifter, räntor och interna överföringar

- Bankavgifter bokas mot 6060 om de är rena bankavgifter och mot 6070 om de är betalnings- eller kortrelaterade avgifter.
- Ränteintäkter och räntekostnader klassificeras separat från avgifter.
- Intern överföring mellan egna konton ska i första hand nettas mot annat bankkonto, i andra hand till utredningskonto tills motpost finns.
- Negativa bankräntor eller justeringar ska inte maskeras som avgift om banken uttryckligen markerat dem som ränta.

### Suspense och felmatchningar

- Okänd utbetalning går till 1190 Utbetalningar under utredning tills ansvarig roll bestämmer motkonto.
- Okänd inbetalning går till 2950 Ej allokerade inbetalningar eller annan definierad kundskuld om motparten ännu inte identifierats.
- Felmatchad bankhändelse ska kunna reverseras med full historik över vem som gjorde matchningen och varför den backades.
- Stora eller gamla suspense-poster ska ingå i close-checklistan och får inte lämnas obehandlade utan sign-off.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Kundinbetalning exakt matchad | D | 1110 / 1140 / 1150 Bankkonto | 1210 / 1220 / 1230 Kundfordringar | Stänger AR-post och statement line länkas till allokeringen. |
| Okänd eller ej allokerad inbetalning | D | 1110 / 1140 / 1150 Bankkonto | 2950 Ej allokerade inbetalningar | Används tills motpart kan identifieras. |
| Skapa betalningsreserv för leverantörspost | F | 2410 / 2420 / 2430 Leverantörsskulder | 2450 Ej utbetalda leverantörsbetalningar | Sker när betalningsfil exporteras eller order skickas. |
| Bankbokad leverantörsbetalning | F | 2450 Ej utbetalda leverantörsbetalningar | 1110 / 1140 / 1150 Bankkonto | Stänger banksteget när utbetalningen verkligen lämnat kontot. |
| Rejection före bankbokning | F | 2450 Ej utbetalda leverantörsbetalningar | 2410 / 2420 / 2430 Leverantörsskulder | Återöppnar skuld utan att bankkonto påverkas. |
| Returnerad tidigare bankbokad betalning | F | 1110 / 1140 / 1150 Bankkonto | 2410 / 2420 / 2430 Leverantörsskulder | Pengarna kommer tillbaka och skulden öppnas igen. |
| Bankavgift | U | 6060 Bankavgifter | 1110 / 1140 / 1150 Bankkonto | Använd separat motkonto om avgiften är betalningsrelaterad. |
| Betalningsavgift | U | 6070 Betalningsavgifter | 1110 / 1140 / 1150 Bankkonto | För transaktions- eller filavgifter. |
| Ränteintäkt bank | U | 1110 / 1140 / 1150 Bankkonto | 7950 Bankräntor | Positiv ränta eller bankersättning. |
| Dröjsmålsränta eller bankränta kostnad | U | 7960 Dröjsmålsräntor / 7910 Räntekostnader | 1110 / 1140 / 1150 Bankkonto | Väljs utifrån transaktionstyp och policy. |
| Okänd utbetalning under utredning | U | 1190 Utbetalningar under utredning | 1110 / 1140 / 1150 Bankkonto | Måste följas upp i reconciliation/close. |
| Intern överföring mellan egna konton, tvåstegsmodell | U | 1190 Utbetalningar under utredning eller destinationskonto | 1110 Källkonto | När motposten kommer in debiteras destinationskonto och 1190 krediteras om clearing användes. |

## Fel- och granskningsköer

- **unmatched_bank_line** — Ingen säker klassificering eller reskontramatch kunde göras.
- **duplicate_bank_line** — Samma bankhändelse återimporterad eller återlevererad av provider.
- **payment_rejected** — Betalorder nekad av bank eller bankportal.
- **payment_returned** — Tidigare bokad betalning kom tillbaka och kräver återöppning eller utredning.
- **balance_gap** — Yttre kontosaldo går inte att få att stämma mot importerade linjer och öppningssaldo.
- **internal_transfer_pairing** — En sida av intern överföring saknas eller kan inte paras ihop.
- **fx_or_fee_split_required** — Banken levererade nettobelopp som behöver brytas upp i huvudbelopp, avgift eller FX-differens.
- **old_suspense_item** — Utredningspost ligger kvar över policygräns och måste tas upp i close.

## Idempotens, spårbarhet och audit

- Statement line ska få en stabil `external_txn_uid` byggd av bankens id eller, om det saknas, hash av konto, datum, belopp, saldo och textfält.
- Samma line-id får inte postas två gånger även om den levereras via flera källor.
- Payment order använder `company + bank_account + payee + amount + due_date + source_open_item_set` som affärsnyckel.
- Exportfil, API-submit, bank-ack och statement line ska länkas till samma payment order lineage.
- Alla manuella omklassificeringar, ommatchningar och reverseringar ska auditeras med reason code.
- Daglig bankavstämning ska kunna återskapa hur varje saldo beräknades, inklusive suspense och ännu ej bokade betalningsreserver.

## Golden tests

1. **Exakt kundmatchning via OCR-referens**

- Importera inbetalning med exakt OCR-referens.
- Förväntat utfall: bankkonto debiteras och kundfordran krediteras utan manuell review.

2. **Överbetalning från kund**

- Inbetalning överstiger fakturans restbelopp.
- Förväntat utfall: fakturan stängs och överskottet läggs i 2950.

3. **Betalningsförslag till bankbokning**

- Välj två öppna AP-fakturor, exportera betalfil och importera därefter bankutflöde.
- Förväntat utfall: 2410 flyttas till 2450 vid export och 2450 till bank vid bokning.

4. **Bankrejection före bokning**

- Exportera betalning och markera den sedan som avvisad.
- Förväntat utfall: 2450 nollas tillbaka till leverantörsskuld utan bankpåverkan.

5. **Returnerad betalning efter bokning**

- Importera bankutflöde och därefter returinsättning.
- Förväntat utfall: skuld öppnas igen och pengarna återförs till bankkontot.

6. **Bankavgift och separat huvudbelopp**

- Statement innehåller utbetalning och avgiftsrad.
- Förväntat utfall: avgift går till 6060/6070 och inte in i leverantörspostens belopp.

7. **Intern överföring mellan två egna konton**

- Utgående rad på konto A och inkommande rad på konto B.
- Förväntat utfall: ingen kostnad eller intäkt uppstår.

8. **Idempotent återimport**

- Kör samma statement-fil två gånger.
- Förväntat utfall: inga dubbla verifikationer och batch två markeras som duplicate på radnivå.

## Exit gate

- [ ] varje bankkonto har definierat öppningssaldo, mapping och feedstrategi
- [ ] inbetalningar, utbetalningar, avgifter, räntor och suspense kan klassificeras och förklaras
- [ ] betalningsförslag använder 2450-reserv och går att följa fram till bankbokning eller retur
- [ ] daglig bankavstämning kan återskapas och visar skillnad mellan boksaldo och externt saldo
- [ ] alla importer och webhookflöden tål återkörning utan dubbelbokning
