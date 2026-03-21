# VAT engine

Detta dokument definierar hela momsmotorn för svenska bolag med stöd för svensk handel, EU, import, export, omvänd moms, OSS/IOSS, periodisk sammanställning och deklarationsmappning.

## Syfte

Momsmotorn ska:
- fatta ett spårbart momsbeslut för varje momsbärande transaktion
- förklara varför beslutet togs
- mappa transaktionen till rätt momsdeklarationsfält
- skapa rätt bokföringspåverkan
- stödja historisk omräkning med gamla regelpaket

## Beslutsträd som alltid körs

Varje momsbärande rad måste klassificeras genom följande frågor:

1. Är detta försäljning eller inköp?
2. Är det vara, tjänst eller blandad leverans?
3. Är motparten i Sverige, EU eller utanför EU?
4. Är motparten företag eller privatperson?
5. Är motparten momsregistrerad?
6. Gäller omvänd moms eller normal moms?
7. Är detta import eller export?
8. Är detta undantagen omsättning, 0-sats eller normal moms?
9. Ska transaktionen gå till OSS/IOSS?
10. Finns branschspecialfall, till exempel bygg eller marginalregim?
11. Vilket deklarationsfält ska påverkas?
12. Vilken bokföringsmall ska användas?

## Obligatoriska fält på varje momsbärande rad

- seller_country
- buyer_country
- buyer_type
- buyer_vat_no
- supply_type
- goods_or_services
- invoice_date
- delivery_date
- currency
- line_amount_ex_vat
- vat_rate
- vat_code_candidate
- project_id
- source_type
- source_id

## Interna beslutskoder

Momsmotorn ska returnera beslutskoder som till exempel:

- `VAT_SE_DOMESTIC_25`
- `VAT_SE_DOMESTIC_12`
- `VAT_SE_DOMESTIC_6`
- `VAT_SE_EXEMPT`
- `VAT_SE_RC_BUILD_SELL`
- `VAT_SE_EU_GOODS_B2B`
- `VAT_SE_EU_SERVICES_B2B`
- `VAT_SE_EU_B2C_OSS`
- `VAT_SE_EXPORT_GOODS_0`
- `VAT_SE_IMPORT_GOODS`
- `VAT_SE_NON_EU_SERVICE_PURCHASE_RC`

Varje beslut måste peka på:
- regelpakets-id
- deklarationsmappning
- bokföringsmall
- warnings
- human-readable explanation

## Deklarationsmappning

Momsmotorn ska kunna summera till svenska momsdeklarationens relevanta rutor, bland annat:
- omsättning inom Sverige
- utgående moms 25/12/6
- inköp där köparen redovisar moms
- unionsintern försäljning och förvärv
- importmoms
- övrig omsättning undantagen från moms
- att betala eller återfå

Det spelar ingen roll om domänen som skapade underlaget var AR, AP, lön eller manuell verifikation; motorn ska alltid kunna härleda och summera rätt.

## Kreditnotor och rättelser

- kreditnota ska spegelvända ursprunglig momslogik
- om ursprungstransaktionen saknas måste kreditnotan gå till granskningskö
- rättelse av momsperiod ska skapa ny jämförelse mot tidigare rapport
- bokföringsrader ska visa både original och rättelse

## Edge cases som måste stödjas

- blandade momssatser på samma faktura
- varurader och tjänsterader på samma faktura
- delvis avdragsgill moms
- representation
- personbil och andra inköp med avdragsbegränsning
- byggtjänster med omvänd moms
- kreditfaktura efter periodstängning
- import via speditörsfaktura
- unionsintern trepartshandel
- OSS/IOSS vid B2C-distansförsäljning
- omsättning som är undantagen från moms
- särskilda marginalregimer om de införs i produktens scope

## 26. Momsmotor — full byggspec

### 26.1 Grundidé
Momsmotorn ska inte fråga “vilken moms vill du ha?”. Den ska fråga:
1. vem säljer?
2. till vem?
3. vad säljs eller köps?
4. var finns köparen?
5. flyttas varan?
6. är köparen beskattningsbar person?
7. gäller specialregel?
8. vilken momssats eller undantag gäller?
9. hur ska detta rapporteras?
10. vilken fakturatext krävs?

### 26.2 Fält som alltid måste finnas på momsbärande transaktion
- seller_country
- seller_vat_registration_country
- buyer_country
- buyer_is_taxable_person
- buyer_vat_number
- buyer_vat_number_status
- supply_type: goods/service
- supply_subtype
- property_related_flag
- construction_service_flag
- transport_end_country
- import_flag
- export_flag
- reverse_charge_flag
- oss_flag
- ioss_flag
- currency
- tax_date
- invoice_date
- delivery_date
- prepayment_date
- line_amount_ex_vat
- line_discount
- line_quantity
- line_uom
- tax_rate_candidate
- exemption_reason
- invoice_text_code
- report_box_code

### 26.3 Svensk standardmoms
- 25 procent: normalregel
- 12 procent: exempelvis vissa livsmedel, hotell, restaurang i relevanta fall
- 6 procent: exempelvis vissa kulturella/mediala kategorier
- 0 procent eller undantagen omsättning: när lagens undantag gäller eller export/EU-transaktioner beskattas annorstädes
- systemet ska stödja blandade satser på samma faktura

### 26.4 Sverige — försäljning
#### Standardregler
- svensk säljare till svensk kund, standard vara/tjänst: svensk moms enligt rätt sats
- pris kan anges inklusive eller exklusive moms men bokning ska alltid spara båda
- rabatter påverkar beskattningsunderlaget före moms
- avgifter som hör till leveransen följer samma momssats som huvudleveransen om de inte utgör egen prestation
- förskott ska momsbehandlas i den period då betalningen erhålls om reglerna kräver det
- kreditnota ska reducera samma typ av omsättning som ursprungsfakturan

#### Sverige — blandad faktura
- varje rad ska ha egen momskod
- fakturan ska summera per skattesats
- rapporten ska bryta ut rätt utgående moms per skattesats

#### Sverige — undantag och specialfall som måste kunna modelleras
- helt momsfri omsättning
- delvis undantagen verksamhet
- frivillig skattskyldighet där sådan modell används
- representation med begränsad avdragsrätt
- personbil med begränsad avdragsrätt
- internfakturering inom samma juridiska enhet ska normalt inte skapa extern moms
- intercompany mellan separata juridiska enheter ska behandlas enligt vanliga regler

### 26.5 Sverige — omvänd betalningsskyldighet
Systemet ska stödja:
- inköp av varor från annat EU-land
- inköp av tjänster från annat EU-land
- inköp av tjänster från land utanför EU
- inköp av varor i Sverige där köparen är skattskyldig
- övriga inköp av tjänster i Sverige där köparen är skattskyldig
- omvänd moms inom byggsektorn
- omvänd moms på andra varu-/tjänstkategorier som omfattas av nationella regler

Regler:
- köpare redovisar beskattningsunderlaget i rätt ruta
- köpare beräknar utgående moms i ruta 30/31/32 enligt skattesats
- avdragsgill ingående moms hanteras samtidigt enligt verksamhetens avdragsrätt
- om säljare felaktigt debiterat moms när omvänd moms gäller ska köparen ändå beräkna utgående moms på fakturans totala belopp inklusive felaktigt debiterad moms och får inte lyfta den felaktigt debiterade ingående momsen
- för byggtjänster ska systemet avgöra både:
  - om tjänsten är en bygg-/anläggningstjänst på fastighet
  - om köparen är ett företag inom byggsektorn eller säljer byggtjänsten vidare

### 26.6 Sverige — omvänd moms bygg, detaljer
Transaktion faller inom byggspåret när:
- arbete sker på fastighet
- arbetet är bygg-, anläggnings-, installations-, reparations-, underhålls-, ombyggnads-, rivnings- eller liknande tjänst
- montering/installation av vara på sådant sätt att den blir fastighet ska behandlas som byggtjänst
- uthyrning av bygg- och anläggningsmaskin med förare omfattas
- rena konsulttjänster utan sådant byggutförande ska normalt inte in i byggomvänd moms om de inte ingår i sådan leverans enligt rättsligt upplägg

Systemet ska spara:
- varför reverse_charge_construction = true
- vilken underregel som träffade
- om köparen intygat byggstatus
- om köparen säljer vidare byggtjänsten
- vilken fakturatext som sattes

### 26.7 EU — försäljning av varor B2B
- giltigt VAT-nummer krävs
- varorna ska transporteras ut från Sverige till annat EU-land
- försäljningen faktureras normalt utan svensk moms
- rapporteras som unionsintern varuförsäljning
- ska med i periodisk sammanställning
- förskott för sådan varuleverans redovisas först vid leverans, inte vid betalning

### 26.8 EU — försäljning av tjänster B2B
- huvudregeln: beskattning hos köparen om köparen är beskattningsbar person i annat EU-land
- faktureras normalt utan svensk moms
- periodisk sammanställning krävs för sådana tjänster som omfattas
- fastighetstjänster och andra undantag från huvudregeln måste kunna styras till andra regler

### 26.9 EU — B2C
- om säljaren omfattas av gemensam EU-tröskel och ligger under tröskeln används svensk moms på relevanta distansförsäljningar och elektroniska/tele-/sändningstjänster
- när tröskeln passeras ska beskattning ske i konsumtionslandet från och med den försäljning som passerar tröskeln
- OSS ska då kunna användas i stället för lokal momsregistrering i varje land där ordningen är tillämplig

### 26.10 OSS
- OSS-försäljning ska inte tas upp i den vanliga momsdeklarationen
- deklaration lämnas separat till identifieringsstaten
- om Sverige är identifieringsstat ska beloppen lämnas i OSS-flödet
- beloppen i OSS ska redovisas i euro
- om försäljning skett i annan valuta ska omräkning ske med Europeiska centralbankens kurs på sista dagen i redovisningsperioden
- ingen avrundning av momsbelopp i OSS, två decimaler ska kunna stödjas
- spara identifieringsstat, ordningstyp, landsmoms, sats, eurobelopp, ursprungsvaluta, omräkningskurs

### 26.11 IOSS
- ska stödjas för distansförsäljning av importerade varor till privatpersoner inom EU med verkligt värde högst 150 euro per försändelse
- systemet ska kunna markera transaktioner som IOSS-eligible eller inte
- underlag för IOSS får inte blandas med vanlig momsdeklaration
- verkligt värde per försändelse måste sparas
- import som inte uppfyller IOSS-villkor ska falla tillbaka till vanlig importmomsmodell

### 26.12 Utanför EU — export
- varuexport utanför EU ska kunna faktureras utan svensk moms när exportvillkor är uppfyllda
- exportbevis eller relevant underlag ska lagras
- tjänsteexport ska följa regler om omsättningsland
- systemet ska kräva dokumenttyp som styrker export när relevant

### 26.13 Import
- momsregistrerad importör ska redovisa importmoms till Skatteverket
- importunderlag ska kunna tas emot från speditör/ombud
- tullvärde, frakt, försäkring och övriga kostnader som påverkar beskattningsunderlaget ska kunna sparas
- speditörsfaktura ska inte förväxlas med själva importmomsen
- importmoms ska kunna skiljas från tullavgifter och från vanlig leverantörsfaktura
- systemet ska stödja både:
  - importvaror till lager
  - importvaror direkt till projekt
  - import till anläggningstillgång

### 26.14 Momsavdrag och begränsningar
Systemet ska kunna stödja:
- full avdragsrätt
- ingen avdragsrätt
- delvis avdragsrätt
- representationsspecifik avdragsrätt
- personbil/MC-specifika begränsningar
- leasing av personbil med 50 procents avdragsrätt på ingående moms när bilen används i mer än ringa omfattning i momspliktig verksamhet
- driftkostnader på hyrd personbil
- blandad verksamhet

### 26.15 Representation
- systemet ska skilja intern och extern representation
- systemet ska spara deltagare, syfte, datum, plats, typ av representation
- momsavdrag ska beräknas enligt representationstyp
- underlag ska gå att visa per händelse
- om underlag saknas ska momslyft blockeras enligt policy

### 26.16 Momsdeklarationsfält som måste stödjas
Miniminivå:
- 05 Momspliktig försäljning som inte ingår i annan ruta nedan
- 06 Uttag
- 07 Beskattningsunderlag vid vinstmarginalbeskattning
- 08 Hyresinkomster vid frivillig skattskyldighet
- 10 Utgående moms 25 %
- 11 Utgående moms 12 %
- 12 Utgående moms 6 %
- 20 Inköp av varor från annat EU-land
- 21 Inköp av tjänster från annat EU-land
- 22 Inköp av tjänster från land utanför EU
- 23 Inköp av varor i Sverige som köparen är betalningsskyldig för
- 24 Övriga inköp av tjänster i Sverige som köparen är betalningsskyldig för
- 30 Utgående moms 25 % på inköp i fält 20–24
- 31 Utgående moms 12 % på inköp i fält 20–24
- 32 Utgående moms 6 % på inköp i fält 20–24
- 35 Försäljning av varor till annat EU-land
- 36 Försäljning av varor utanför EU
- 37 Mellanmans inköp av varor vid trepartshandel
- 38 Försäljning av tjänster till beskattningsbar person i annat EU-land
- 39 Övrig försäljning av tjänster omsatta utom landet
- 40 Övrig försäljning m.m.
- 41 Inköp där köparen inte har avdragsrätt eller med särskild hantering
- 42 Övriga inköp för vilka köparen är skattskyldig eller särskild hantering
- 48 Ingående moms att dra av
- 49 Moms att betala eller få tillbaka

Not: systemet ska ha möjlighet att versionsstyra deklarationsrutor om Skatteverket ändrar layout eller API.

### 26.17 Periodisk sammanställning
- ska genereras för momsfri försäljning av varor och vissa tjänster till momsregistrerade köpare i andra EU-länder
- systemet ska kunna lämna många poster via filformat om det behövs
- varor och tjänster ska kunna särredovisas
- rättelse av periodisk sammanställning ska stödjas
- EU-kundens VAT-nummer ska valideras och status sparas

### 26.18 Rättelse av momsdeklaration
- om fel upptäcks ska hela momsdeklarationen göras om och lämnas på nytt
- systemet ska därför versionera deklarationer
- varje rättad deklaration ska ha:
  - previous_submission_id
  - correction_reason
  - changed_boxes
  - changed_amounts
  - signer
  - submitted_at

### 26.19 Avancerade momsregimer som måste finnas i backloggen innan bred lansering
Dessa måste antingen byggas eller vara tydligt “inte stöds”:
- Vinstmarginalbeskattning för begagnade varor
- Vinstmarginalbeskattning för resebyråverksamhet / researrangemang
- Finansiella tjänster undantagna från moms
- Försäkringstjänster
- Sjukvård och tandvård
- Social omsorg
- Utbildning
- Uthyrning av fastighet och frivillig skattskyldighet
- Investeringguld
- Kultur- och idrottstjänster
- Särskilda regler för el, gas, värme, kyla
- Call-off stock / triangulering specialfall
- Dålig fordran / kundförlust och momskorrigering
- Förskott och a conto i specialregimer

## Submission and output

För myndighetsintegration ska momsmotorn kunna leverera:

- deklarationsdataset för vald period
- mänskligt granskningsunderlag
- diff mot tidigare inlämning
- intern XML/JSON snapshot för revision
- adapterpayload till faktisk inlämningskanal
- kvittensobjekt med status, signeringstid och referens

## Golden test-bibliotek

Minimikatalog:

- svensk B2B 25 %
- svensk B2C 25 %
- svensk 12 %
- svensk 6 %
- undantagen omsättning
- export vara utanför EU
- export tjänst utanför EU
- EU-varuförsäljning B2B med giltigt VAT-nummer
- EU-tjänsteförsäljning B2B
- EU B2C med OSS
- inköp av tjänst från EU med omvänd moms
- inköp av vara från EU
- import vara från tredje land
- speditörsfaktura och importmoms
- bygg-omvänd moms
- kreditnota i efterföljande period
- representation med begränsat avdrag

## Codex-prompt

```text
Read docs/compliance/se/vat-engine.md and ADR-0005-rule-engine-philosophy.md.

Implement the VAT engine as a rule-based system:
- VAT codes
- decision objects
- declaration mapping
- booking templates
- credit note reversal logic
- import/export
- EU, OSS/IOSS, reverse charge
- historical rule packs

Create:
1) schema and migrations
2) rule-pack loader
3) API/service interfaces
4) golden tests
5) example fixtures
```

## Exit gate

- [ ] Varje transaktion får exakt ett spårbart momsbeslut.
- [ ] Momsrapport kan jämföras mot ledger per ruta.
- [ ] Kreditnotor spegelvänder moms korrekt.
- [ ] Historisk regeluppspelning fungerar.
- [ ] Oklara fall går till granskningskö i stället för att auto-bokas fel.
