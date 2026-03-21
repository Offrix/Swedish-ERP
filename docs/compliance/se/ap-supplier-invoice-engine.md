# AP supplier invoice engine

Detta dokument definierar hela leverantörsfakturamotorn för svenska bolag: leverantörsregister, inköpsorder, mottagning, leverantörsfaktura in, dubblettskydd, tolkning, kontering, momsunderlag, attest, 2-way/3-way-matchning, kreditnotor, avvikelseflöden och exakt bokföringspåverkan.

## Scope

### Ingår

- leverantörsregister med juridiska uppgifter, betalningsuppgifter, standardkontering, betalningsvillkor och spärrstatus
- inköpsorder med orderrader, pris, kvantitet, attest och länk till projekt, lager eller kostnadsställe
- mottagning av vara eller tjänst inklusive optional receipt-accrual när bolaget använder sådan modell
- inkommande leverantörsfaktura från inbox, Peppol, fil eller manuell registrering
- OCR- eller XML-tolkning, dubblettkontroll, kodning, momsbeslut, attest, matchning och avvikelseköer
- leverantörskreditnotor, förskott till leverantör och återföring av förskott
- öppen leverantörsreskontra fram till betalningsförslag och slutlig avprickning

### Ingår inte

- själva bankexekveringen av betalningen; den ägs av bank- och betalningsmotorn
- korttransaktioner och anställdas utlägg; de ägs av cash-card-and-clearing-dokumentet
- projektbunden WIP-intäktslogik; den ägs av projektfaktureringsdokumentet

### Systemgränser

- AP äger leverantör, PO, receipt, supplier invoice, supplier credit note och öppna AP-poster.
- Dokumentmotorn levererar dokument, OCR-fält och klassificering men får inte bokföra leverantörsfakturan själv.
- Momsmotorn avgör ingående moms, omvänd moms och deklarationsmappning för varje rad.
- Ledgern bokför bara godkända posting intents från AP.
- Bankmotorn äger betalordern, bankbekräftelsen och den slutliga bankhändelsen.

## Hårda regler

1. En leverantörsfaktura får inte postas utan leverantörsidentitet, fakturanummer eller alternativ extern referens, fakturadatum, förfallodatum, valuta och minst en konteringsrad.
2. Dubblettskydd ska köras före attest och före bokföring. Systemet ska minst jämföra leverantör, fakturanummer, belopp, datum och dokumenthash.
3. En postad leverantörsfaktura får aldrig redigeras. Korrigering sker med kreditnota, reversal eller ny faktura.
4. 2-way-matchning ska användas för rena tjänste- eller icke-mottagningspliktiga inköp. 3-way-matchning ska användas när bolaget kräver receipt mot PO.
5. Avvikelse över tolerans får inte autopostas. Den måste gå till granskningskö eller explicit godkännas av behörig roll.
6. Leverantörsbankuppgifter och betalningsmottagare är högriskfält. Ändringar kräver stark autentisering, audit och tvåstegsgranskning enligt policy.
7. Leverantörskreditnota ska alltid kunna kopplas till ursprungsfaktura eller ha ett uttryckligt fristående skäl.
8. Förskottsbetalning till leverantör är inte kostnad förrän faktura eller annan ekonomisk händelse dokumenterar vad förskottet avser.
9. Kontrollkonton för leverantörsskulder får inte bokas manuellt utanför definierade undantag i manual journals-policyn.
10. Alla adapterflöden ska vara idempotenta och tåla återimport av samma dokument eller samma webhook.

## Begrepp och entiteter

- **Leverantör** — Motpart på inköpssidan med juridisk identitet, betalningsuppgifter och standardregler.
- **Inköpsorder / PO** — Beställning som definierar vad som får faktureras, till vilket pris och med vilka dimensioner.
- **Mottagning / Receipt** — Bekräftelse att vara eller tjänst har tagits emot, helt eller delvis.
- **Leverantörsfaktura** — Inkommande faktura som normalt skapar skuld, kostnad eller tillgång samt ingående moms eller omvänd moms.
- **Coding line** — Intern konteringsrad som anger konto, dimensioner, projekt, momsbeslut och eventuell periodisering.
- **Tolerance profile** — Regeluppsättning som anger hur mycket pris-, kvantitets- eller totalavvikelse som får accepteras automatiskt.
- **2-way match** — Matchning mellan faktura och PO utan separat receipt-krav.
- **3-way match** — Matchning mellan faktura, PO och mottagning.
- **Supplier credit note** — Negativ leverantörsfaktura som minskar skuld eller tidigare bokad kostnad/tillgång.
- **Förskott till leverantör** — Betalning som görs innan leverantörsfakturan bokas och därför ligger som fordran.
- **Avvikelsefall** — Skillnad eller databruk som bryter tolerans och därför kräver manuell granskning.

## State machines

### Leverantör

- `draft -> active -> blocked -> archived`

- `blocked` stoppar ny fakturapostning och nya betalningsförslag men påverkar inte historik.
- Arkivering kräver att inga öppna AP-poster eller väntande POs finns kvar.

### Inköpsorder

- `draft -> approved -> sent -> partially_received -> fully_received -> closed -> cancelled`

- PO kan bara nå `approved` via attest enligt beloppsgränser.
- Receipt får endast registreras mot `approved` eller `sent` PO.
- `closed` kan ske när allt är mottaget och fakturerat eller när rest officiellt annulleras.

### Leverantörsfaktura

- `inbox_received -> classified -> ocr_extracted -> draft -> matching -> pending_approval -> approved -> posted -> scheduled_for_payment -> partially_paid -> paid -> rejected -> disputed -> voided -> credited`

- `draft` är den första redigerbara AP-versionen efter dokumenttolkning.
- `matching` betyder att PO- och receipt-logik körs och kan skapa avvikelseobjekt.
- `posted` låser fakturans ekonomiska data och skapar AP-post.
- `scheduled_for_payment` uppstår när bankmotorn reserverar posten i ett betalningsförslag.
- `paid` nås endast när bankhändelse eller bekräftad betalning stänger skulden.

### Attest

- `pending -> approved -> rejected -> delegated -> expired`

- Samma person får inte både registrera och slutattestera högriskfaktura om policy kräver separation.
- Delegation ska bära start/slutdatum och originalattestanten får inte förlora audit-spåret.
- Utgången attest skickar fakturan tillbaka till `pending_approval` med ny attestkedja.

### Avvikelseobjekt

- `open -> accepted -> corrected -> closed`

- `accepted` betyder att avvikelsen ligger inom godkänd business override men historiken ska bevaras.
- `corrected` betyder att PO, receipt eller fakturarad ändrats och matchning ska köras om.
- Avvikelseobjekt får inte försvinna utan explicit slutorsak.

## Inputfält och valideringar

### Leverantörsregister

#### Fält

- `supplier_no`, juridiskt namn, organisationsnummer, VAT-nummer, land, valuta, betalningsvillkor, betalningsmottagare, bankgiro/plusgiro/IBAN/BIC
- standardkostnadskonto, standardmomskod, default-dimensioner, spärr för betalning, spärr för bokning, riskklass och attestkedja
- flaggor för `requires_po`, `requires_receipt`, `allow_credit_without_link`, `reverse_charge_default`

#### Valideringar

- betalningsuppgifter ska följa formatregler för bankgiro, plusgiro eller IBAN/BIC
- leverantörsnummer ska vara unikt per bolag
- spärrad leverantör får inte användas utan explicit override och audit
- ändring av bankuppgifter ska skapa högriskhändelse och kräva ny attest innan nästa betalning

### PO och mottagning

#### Fält

- PO-header med leverantör, valuta, beställare, kostnadsbärare, totalsumma, villkor och förväntat leveransdatum
- PO-rad med artikel/text, kvantitet, pris, momsprofil, konto eller mottagande tillgång/lager, projekt och toleransprofil
- receipt med datum, mottagen kvantitet eller procent, mottagare, kommentar och eventuell avvikelsekod

#### Valideringar

- valuta på leverantörsfaktura får inte avvika från PO utan godkänt undantag
- mottagen kvantitet får inte göra att kumulativ receipt överstiger tillåten överleverans
- PO som är stängd eller annullerad får inte ta emot nya receipts eller fakturor utan reopen

### Fakturahuvud, rader och kontering

#### Fält

- extern fakturareferens/fakturanummer, fakturadatum, förfallodatum, leveransdatum, valuta, totalsumma netto/moms/brutto, betalningsinstruktion
- radnivå med beskrivning, kvantitet, pris, rabatt, nettobelopp, momsbelopp, konto, projekt, kostnadsställe, periodisering och receipt/PO-länk
- fakturametadata såsom OCR-referens, orderreferens, buyer reference, kontraktsreferens, leverantörens momsnummer

#### Valideringar

- summa rader plus moms ska motsvara dokumentets totalsumma inom avrundningstolerans
- leverantörsfaktura med negativ totalsumma ska klassas som kreditnota
- momssummering per sats ska gå ihop mot fakturans angivna skattebelopp eller gå till review
- fakturarader utan konto eller momskod får inte gå till `approved`

### Dubblettskydd och matchning

#### Fält

- fingerprint bestående av leverantör, externt nummer, fakturadatum, bruttobelopp, valuta, dokumenthash och betalreferens när sådan finns
- matchningsfält: PO-nummer, orderrad, receipt-id, radbelopp, momsbelopp, artikelkod, projekt, leveransdatum

#### Valideringar

- exakt samma fingerprint ska blockera dubbelpostning
- nära dubblett med samma leverantör och belopp men annat dokumenthash ska markeras som suspect, inte autoavvisas
- PO- och receipt-matchning ska redovisa prisavvikelse, kvantitetsavvikelse och totalavvikelse separat

## Beslutsträd/regler

### Registrering och tolkning

- Dokument från inbox eller Peppol blir alltid en AP-draft, aldrig en direkt postad faktura.
- Om leverantör känns igen och OCR-confidence är hög får konto, dimensioner och momskod föreslås men måste fortfarande följa attestregler.
- Om leverantören inte finns skapas ett leverantörsförslag eller matchningskö, inte automatisk bokföring mot okänd motpart.
- Om fakturan avser anläggning, förskott eller projekt ska radtyp styra att kostnad inte bokas direkt på standardkostnad.

### 2-way och 3-way matchning

- 2-way-matchning kontrollerar att fakturaradens artikel, pris och belopp stämmer mot PO inom toleransprofil.
- 3-way-matchning kräver dessutom att mottagen kvantitet eller bekräftad tjänstegrad täcker fakturerad kvantitet.
- Avvikelse under liten tolerans kan accepteras automatiskt om bolagets profil tillåter det och ingen annan riskflagga finns.
- Avvikelse över tolerans skapar avvikelseobjekt och blockerar autoposting tills ansvarig roll accepterar eller korrigerar.
- Om receipt-accrual används ska tidigare receipt-posting räknas av vid slutlig fakturaposting.

### Attest och betalningsspärr

- Faktura utan PO kan kräva annan attestkedja än faktura med PO och receipt.
- Ändring av leverantörens bankuppgift inom definierat riskfönster ska automatiskt skapa betalningsspärr på nästa betalning.
- Beloppsgränser, projektkoppling och manuella konteringsändringar kan eskalera fakturan till fler attestanter.
- Faktura i tvist eller med oklara skatteuppgifter får inte gå till betalningsförslag.

### Kreditnota, förskott och rättelse

- Kreditnota ska i första hand allokeras mot öppen originalfaktura. Om ingen sådan finns ligger den som egen öppen kredit i AP.
- Förskott till leverantör bokas som tillgång tills leverantörsfakturan kommer och kvittar förskottet.
- Felkonterad AP-faktura rättas normalt genom kreditnota plus ny faktura eller genom manual journal enligt särskild policy, aldrig genom tyst mutation.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Normal leverantörsfaktura inrikes | E | Kostnads-/tillgångskonto, 2640 Ingående moms | 2410 Leverantörsskulder | Radkonton väljs av konteringsmotorn och momsbeslutet. |
| Normal leverantörsfaktura EU eller import | E | Kostnads-/tillgångskonto, eventuella omvänd-moms-rader enligt momsbeslut | 2420 / 2430 Leverantörsskulder | Momsmotorn kan skapa både utgående och ingående moms-rader beroende på regeltyp. |
| Receipt-accrual vid mottagning | E | Lager, projektmaterial, tillgång eller kostnad enligt receipt | 2490 AP-clearing | Används bara om bolaget aktiverat bokning vid mottagning. |
| Faktura som kvittar tidigare receipt-accrual | E | 2490 AP-clearing, 2640 Ingående moms | 2410 / 2420 / 2430 Leverantörsskulder | Minskar tidigare interimskreditering och skapar slutlig skuld. |
| Leverantörskreditnota | E | 2410 / 2420 / 2430 Leverantörsskulder | Kostnads-/tillgångskonto, 2640 Ingående moms | Spegelvänder tidigare faktura så långt underlaget medger. |
| Fristående öppen leverantörskredit | E | 2410 / 2420 / 2430 Leverantörsskulder | 2440 Leverantörskreditnotor | Används när kredit ligger kvar tillgodo och inte direkt kvittas mot specifik faktura. |
| Förskott till leverantör | F | 1360 Förskott till leverantörer | 1110 / 1140 / 1150 Bankkonto | Skapas av bankmotorn när betalning sker före faktura. |
| Kvittning av förskott vid faktura | E | 2410 / 2420 / 2430 Leverantörsskulder | 1360 Förskott till leverantörer | Minskar öppen skuld utan ny bankrörelse. |
| Rättelse av liten differens inom policy | V | Konfigurerat differenskonto | 2410 / 2420 / 2430 Leverantörsskulder | Får endast användas inom dokumenterad tolerans och med audit. |

## Fel- och granskningsköer

- **duplicate_suspect** — Exakt eller sannolik dubblett upptäckt före postning.
- **ocr_low_confidence** — Dokumentet saknar tillräckligt säkra fält för automatisk AP-draft.
- **supplier_missing_or_blocked** — Leverantör kan inte identifieras eller är spärrad.
- **match_variance** — PO-, price- eller receipt-avvikelse över tolerans.
- **approval_overdue** — Attestkedjan har inte fullföljts inom policyfönster.
- **tax_review_required** — Momssummering, leverantörsland eller omvänd moms kräver manuell kontroll.
- **payment_hold** — Fakturan får inte lämna AP till bankmotorn förrän risk eller tvist lösts.

## Idempotens, spårbarhet och audit

- Varje inkommande dokument ska bära `document_id`, `document_version`, extern adapter-id och en stabil fakturafingerprint.
- AP-faktura får bara postas en gång per kombination av `supplier_invoice_uid + posting_version`.
- Receipt-accrual ska bära `receipt_id + receipt_version + accrual_mode` för att undvika dubbelbokning vid omkörning.
- Attestbeslut ska loggas som immutabla events med användare, roll, delegation och MFA-recency när sådan krävs.
- Ändringar av bankuppgifter, betalningsmottagare och spärrstatus ska alltid skapa högriskaudit och versionshistorik.
- Reskontran ska bevara länk mellan leverantörsfaktura, kreditnota, receipt, PO och bankmotorns betalordrar.

## Golden tests

1. **Standardfaktura inrikes**

- Importera leverantörsfaktura med två kostnadsrader och moms.
- Förväntat utfall: serie E, kostnadskonton och 2640 i debet, 2410 i kredit.

2. **Exakt dubblett**

- Läs in samma faktura två gånger med samma fingerprint.
- Förväntat utfall: andra försöket blockeras och går till duplicate_suspect.

3. **3-way-match med kvantitetsavvikelse**

- PO = 10 enheter, receipt = 8, faktura = 10.
- Förväntat utfall: match_variance och ingen autoposting.

4. **Receipt-accrual**

- Boka mottagning före faktura och därefter faktura.
- Förväntat utfall: första verifikationen går mot 2490, andra nollar 2490 och skapar slutlig skuld.

5. **Leverantörskreditnota**

- Skapa kredit mot tidigare faktura.
- Förväntat utfall: skuld minskar och kostnad/moms spegelvänds.

6. **Förskott till leverantör**

- Betala innan faktura och bokför senare fakturan.
- Förväntat utfall: 1360 används tills fakturan kvittar förskottet.

7. **Riskfylld bankändring**

- Ändra leverantörens bankgiro och försök sedan skicka fakturan till betalning.
- Förväntat utfall: payment_hold tills särskild granskning är klar.

8. **Idempotent webhook/Peppol-inläsning**

- Skicka samma adapterpayload flera gånger.
- Förväntat utfall: exakt en AP-faktura och exakt ett document-link-event.

## Exit gate

- [ ] leverantör, PO, receipt, AP-faktura och kreditnota kan skapas och följas i full historik
- [ ] dubblettskydd, 2-way och 3-way matchning beter sig deterministiskt och är testade
- [ ] AP-kontrollkonton stämmer mot leverantörsreskontran på valfri cutoff
- [ ] riskhändelser kring bankuppgifter och attest har tydliga köer och audit
- [ ] förskott, kredit och receipt-accrual kan förklaras rad för rad i ledgern
