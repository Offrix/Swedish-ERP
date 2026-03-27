> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC

Status: Bindande normativa regler för bokföring, moms, skatt, lön, AGI, benefits, pension, HUS, skattekonto och annual/declaration-flöden.

Detta dokument definierar exakt hur reglerade kärnflöden ska fungera. All implementation ska följa detta dokument före UI.

## 1. Globala regler för reglerade flöden

1. Endast server-side domänlogik får fatta reglerade beslut.
2. Alla reglerade beräkningar måste bära `rulepack_code`, `rulepack_version`, `evaluation_date`, `source_fingerprint` och `calculation_fingerprint`.
3. Alla beslut som påverkar bokföring, AGI, HUS, VAT eller myndighetsfiling ska vara reproducerbara vid replay.
4. Bokföring skapas från posting intents, aldrig från UI, OCR, AI eller integrationsadapter.
5. Periodlås, signoff och submit stoppar tyst mutation; vidare ändring kräver correction chain.
6. Teknisk kvittens är aldrig materiellt godkännande.
7. Mänskligt godkännande krävs för:
   - periodreopen
   - manuell journal
   - HUS manual override av köpare, betalningsbevis eller arbetsandel
   - oentydig VAT-behandling
   - fallback för preliminärskatt när officiellt beslut saknas
   - write-capable replay av submission
   - tax account discrepancy adjustment
   - garnishment override mot Kronofogdens beslut
8. AI får aldrig:
   - skapa slutlig journal
   - fatta VAT-beslut
   - fatta AGI-beslut
   - välja preliminärskatt självständigt
   - godkänna HUS claim
   - godkänna annual filing package
   - godkänna SINK eller jämkningsbeslut
   - avgöra kollektivavtalsregel utan human review

## 2. Gemensamma objekt

### 2.1 Regulatoriska masterobjekt

- `AccountingMethodProfile`
- `FiscalYear`
- `FiscalPeriod`
- `LegalFormProfile`
- `LedgerJournal`
- `PostingIntent`
- `VatDecision`
- `VatDeclarationVersion`
- `TaxDecisionSnapshot`
- `EmployerContributionDecisionSnapshot`
- `PayRun`
- `AgiSubmissionPeriod`
- `BenefitDecision`
- `TravelAllowanceDecision`
- `SalaryExchangeAgreement`
- `PensionInstruction`
- `HusClaimVersion`
- `TaxAccountEvent`
- `AnnualPackage`
- `SubmissionEnvelope`
- `SubmissionReceipt`

### 2.2 Gemensamma tillståndskrav

Alla ovanstående objekt ska ha:
- `object_version`
- `created_at`
- `effective_date`
- `supersedes_ref` när correction finns
- `status`
- `rulepack_code`
- `rulepack_version`
- `reason_code` vid override eller correction
- `evidence_pack_ref` när extern eller personpåverkande information används

## 3. Bokföringslogik

### 3.1 Egendom och principer

- ledger är enda bokföringssanning
- alla journaler måste balansera
- varje journal binds till:
  - voucher series
  - fiscal year
  - accounting period
  - source object
  - source object version
  - posting recipe code
- inga journaler får ändras tyst efter `posted`
- korrigering sker genom reversal eller explicit correction journal

### 3.2 Journaltyper

- `operational_posting`
- `settlement_posting`
- `payroll_posting`
- `tax_account_posting`
- `year_end_adjustment`
- `reversal`
- `correction_replacement`
- `historical_import`

### 3.3 När det bokas

#### Kundfaktura
Signal: `ar.invoice.issued`

Bokning:
- debit kundfordran
- credit intäkt
- credit utgående moms
- eventuella projekt-/kostnadsbärardimensioner sätts från AR-objektet
- om HUS-reduktion används och fakturan skickas med reducerat kundbelopp ska fordran delas i kundfordran och HUS-fordran enligt HUS-reglerna

#### Kreditnota kund
Signal: `ar.credit_note.issued`

Bokning:
- debit intäktsreduktion
- debit utgående moms
- credit kundfordran eller skapa återbetalningsskuld beroende på ursprungsläge

#### Leverantörsfaktura
Signal: `ap.invoice.posted`

Bokning:
- debit kostnad eller tillgång
- debit ingående moms när avdragsrätt finns
- credit leverantörsskuld

#### Leverantörskredit
Signal: `ap.credit_note.posted`

Bokning:
- credit kostnadsreduktion eller tillgångsreduktion
- credit ingående momsreduktion
- debit leverantörsskuld eller återbetalningsfordran

#### Lönekörning
Signal: `payroll.run.posted`

Bokning:
- debit lönekostnad
- debit arbetsgivaravgiftskostnad
- credit personalskatteskuld
- credit nettolöneskuld
- credit skuld för arbetsgivaravgifter
- credit eller debit övriga nettolöneavdrag, benefits clearing och pension beroende på regelutfall
- salary exchange reducerar kontant bruttolön men skapar pensionsinstruktion och särskild löneskatt enligt pension-reglerna

#### Bankutbetalning eller inbetalning
Signal: `bank.payment_order.settled` eller `bank.statement.line.matched_and_approved`

Bokning:
- debit/credit bankkonto
- motbokning mot kundfordran, leverantörsskuld, nettolöneskuld, skatteskuld eller övrig settlementskuld enligt matchad liability

#### Skattekontohändelse
Signal: `tax_account.event.classified_and_approved`

Bokning:
- debit/credit skattekonto subledger clearing
- debit/credit mot skatteskuld, moms, kostnadsränta, intäktsränta eller övrig skatterelaterad skuld/fordran enligt klassificering
- unmatched eller oklar händelse bokas inte automatiskt

#### HUS-utfall
Signaler:
- `hus.claim.accepted`
- `hus.claim.partially_accepted`
- `hus.recovery.confirmed`

Bokning:
- vid accepterad claim: debit bank eller HUS-fordran-clearing, credit HUS-fordran
- vid delgodkännande: samma för accepterad del; restbelopp går till kundfordran eller discrepancy-case beroende på regelresultat
- vid återkrav: debit kundfordran eller HUS-recovery-fordran, credit tidigare HUS-intäkt/fordran-clearing beroende på ursprungligt läge

#### Year-end adjustments
Signal: `close.adjustment.approved`

Bokning:
- endast från explicit adjustment object
- periodisering, upplupna kostnader/intäkter, avskrivningar, omklassningar och skattetransaktioner bokas via godkänt adjustment case

### 3.4 Vad som aldrig får bokas automatiskt

- bokningar direkt från OCR
- bokningar från klassningsförslag utan approval
- bokningar från tax account discrepancy detection
- bokningar från personalliggare eller ID06
- bokningar från tidsrapport utan payroll eller faktureringsregel
- bokningar från AI-anomalier
- bokningar från webhooks eller partnercalls utan affärsdomäns explicit command
- bokningar från HUS-draft
- bokningar från annual package-draft

### 3.5 Periodlås, reopen, reversal, correction

- `period_locked` innebär att alla muterande commands som påverkar perioden nekas
- ändring i låst period kräver `ReopenRequest`
- `ReopenRequest` måste beräkna impact på:
  - VAT declarations
  - AGI periods
  - HUS claims
  - tax account settlement
  - annual packages
- `ReopenRequest` får endast godkännas av roll med finance close approval
- genomförd reopen måste leda till:
  - reversal av felaktig journal eller correction replacement
  - ny declaration version där regler kräver
  - audit och activity entries
- efter correction ska perioden återlåses

## 4. Accounting method och fiscal year

### 4.1 Accounting method

#### KONTANTMETOD
- får endast aktiveras när legal form och omsättningstillstånd tillåter det
- för svenskt företag gäller att boksluts-/kontantmetod inte får användas om omsättningen överstiger 3 miljoner kronor per år
- obetalda kund- och leverantörsfakturor ska tas upp vid räkenskapsårets slut även under kontantmetod
- under kontantmetod styr betalningsdatum normalt bokföringstidpunkt för kund- och leverantörsfakturor under året

#### FAKTURERINGSMETOD
- kundfordran och leverantörsskuld bokas när faktura utfärdas eller tas emot enligt regelpack och issue/post gates
- betalning bokar settlement separat

#### Change rules
- exakt en aktiv method per dag
- method change kräver effective date, eligibility assessment, approval och audit
- historiska perioder använder metoden som gällde på transaktionsdatum

### 4.2 Fiscal year

- varje bolag ska ha exakt ett aktivt fiscal year för varje datum
- periodgeneratorn ska skapa komplett periodkalender utan luckor eller överlapp
- brutet år tillåts endast när legal-form eligibility tillåter det
- enskild näringsverksamhet ska behandlas som kalenderår som standard; brutet år är blockerat om inte legal-form engine explicit medger undantag
- extended year får aldrig överstiga 18 månader
- short year och year change kräver approval och reason code
- annual reporting, VAT periodization, close och reporting läser alltid aktivt fiscal year snapshot

## 5. Momslogik

### 5.1 VAT source of truth

`VatDecision` är enda sanningen för:
- momsplikt
- momssats
- omvänd skattskyldighet
- unionsintern handel
- export/import
- box mapping
- reporting period
- avdragsrätt
- correction mirroring

### 5.2 VAT decision inputs

- invoice or supplier invoice version
- accounting method
- fiscal period
- counterparty type
- country and tax id status
- goods/service classification
- construction reverse-charge flags
- import/export evidence
- credit note links
- HUS flags where relevant

### 5.3 Decision output

Varje `VatDecision` ska bära:
- `taxable_basis`
- `vat_amount`
- `vat_rate_code`
- `box_code`
- `deduction_right_code`
- `period_code`
- `decision_reason_code`
- `review_required`
- `reversal_link` när kreditnota eller correction gäller

### 5.4 Timing rules

- faktureringsmetod: VAT period bestäms av invoice/post date enligt svensk regel
- kontantmetod: VAT period bestäms i normalfallet av betalningsdatum, men year-end catch-up ska fånga obetalda fordringar/skulder vid bokslut
- reverse-charge i bygg måste följa särskilda timingregler och får inte härledas direkt av AR/AP utan VAT engine
- importmoms, unionsinterna förvärv och självbeskattning ska materialiseras som särskilda decision outputs

### 5.5 Submission rules

- varje VAT declaration version ska baseras på låsta eller explicit tillåtna correction-källor
- signering och submission sker på declaration-version med payload hash
- rättelse görs genom ny fullständig declaration version, inte genom mutation av inskickad version
- technical acknowledgement och business acknowledgement hålls isär

### 5.6 Reviewgränser för VAT

Review krävs när:
- motpartens momsstatus inte kan verifieras
- construction reverse charge är oklar
- flera box mappings är plausibla
- import/export evidence saknas
- avdragsrätt inte kan avgöras deterministiskt
- kreditnota inte speglar ursprungsbeslut korrekt

## 6. Lönelogik

### 6.1 Payroll inputs

Pay run får endast beräknas från:
- aktiv employment snapshot
- approved time and absence inputs
- active balance accounts
- active collective agreement assignment
- approved benefit decisions
- approved travel and mileage decisions
- statutory tax decision snapshot
- employer contribution decision snapshot
- approved garnishment decision snapshot när tillämpligt

### 6.2 Beräkningsordning

1. lås pay-run scope och input fingerprints
2. ladda employments och statutory profiles per utbetalningsdatum
3. materialisera fasta lönerader
4. materialisera godkända rörliga lönerader
5. materialisera förmåner och traktamenten
6. beräkna bruttolön
7. tillämpa salary exchange och bruttolöneavdrag enligt aktivt avtal
8. beräkna skattepliktig lön
9. välj preliminärskatt eller SINK enligt tax decision snapshot
10. beräkna arbetsgivaravgifter enligt employer contribution decision snapshot
11. beräkna nettolöneavdrag och utmätningsbelopp
12. beräkna nettolön
13. skapa AGI constituents
14. skapa posting intents
15. skapa payment batch
16. lås pay run fingerprint

### 6.3 Preliminärskatt

Huvudregel:
- preliminär skatt ska beräknas från officiell skattetabell eller jämkningsbeslut på betalningsdatumet
- `manual_rate` får endast användas som explicit emergency fallback med dual review och reason code

`TaxDecisionSnapshot` ska bära:
- `decision_type`: `tabell`, `jamkning`, `engangsskatt`, `sink`, `emergency_manual`
- `income_year`
- `valid_from`
- `valid_to`
- `municipality_code`
- `table_code`
- `column_code`
- `adjustment_fixed_amount`
- `adjustment_percentage`
- `decision_source`
- `decision_reference`
- `evidence_ref`

Regler:
- ordinarie månadslön använder tabell- eller jämkningsbeslut
- engångsbelopp använder engångsskatteprofil eller annan av Skatteverket beslutad modell
- sidoinkomst och extra utbetalningar följer decision snapshot, inte fri manuell procentsats
- om SINK beslut saknas men SINK borde gälla ska systemet tillämpa arbetsgivarens tvingande fallback enligt Skatteverkets regler och öppna review case

### 6.4 SINK

- SINK gäller när beslut finns för begränsat skattskyldig mottagare
- från 1 januari 2026 är SINK 22,5 procent
- nytt beslut krävs per inkomstår
- om beslut saknas när SINK skulle kunna vara relevant ska systemet inte gissa; systemet ska använda lagstadgad fallback och flagga review

### 6.5 Arbetsgivaravgifter

`EmployerContributionDecisionSnapshot` ska bära:
- `decision_type`
- `age_bucket`
- `legal_basis_code`
- `valid_from`
- `valid_to`
- `base_limit`
- `full_rate`
- `reduced_rate`
- `special_conditions`

Regler:
- full arbetsgivaravgift 2026 är 31,42 procent när inget undantag gäller
- från 1 januari 2026 gäller 10,21 procent för personer som fyllt 67 år vid årets ingång
- från 1 april 2026 till 30 september 2027 gäller tillfälligt 20,81 procent för personer som vid årets ingång fyllt 18 men inte 24 år, på ersättning upp till 25 000 kronor per månad; överstigande del beskattas med full avgift
- beslutet ska avgöras per utbetalningsdatum och personens ålder vid årets ingång
- blandad avgiftsnivå inom samma person och månad ska kunna delas i flera contribution components

### 6.6 AGI

- payroll äger AGI constituents och submission periods
- AGI byggs från approved/posted pay runs
- AGI version måste lagra:
  - employee-level constituents
  - changed-employee flags
  - payload hash
  - signature chain
  - technical receipt
  - material decision
- AGI-sensitive absence får inte ändras efter `ready_for_sign`
- rättelse skapar ny AGI version; tidigare version ligger kvar immutable
- deklarationsdag ska följa bolagets rapportklass och periodregler; motorn måste stödja ordinarie den 12:e och den 26:e där Skatteverkets regler kräver det

### 6.7 Benefits/förmåner

Varje förmånsbeslut ska klassificera:
- skattefri
- skattepliktig men ej avgiftspliktig
- skattepliktig och avgiftspliktig
- kräver nettolöneavdrag
- kräver lönerevision eller manuell review

Verifierade 2026-nivåer som ska ligga i regulatoriskt rulepack:
- friskvård: skattefri endast inom 5 000 kronor per år och under övriga villkor
- julgåva: 600 kronor
- jubileumsgåva: 1 800 kronor
- minnesgåva: 15 000 kronor
- kostförmån 2026: frukost 62 kronor, lunch eller middag 124 kronor, helt fri kost 310 kronor
- bilförmånens ringa privata användning: högst 10 tillfällen och högst 100 mil per år

### 6.8 Nettolöneavdrag

- nettolöneavdrag får endast uppstå från explicit beslut i benefits, payroll manual adjustment eller salary exchange
- nettolöneavdrag ska minska nettolön eller skapa skuld, aldrig ändra bruttolön retroaktivt utan correction run
- varje nettolöneavdrag måste länka till sitt sakobjekt och decision code

### 6.9 Traktamente, resor och milersättning

- travel-domänen räknar ersättningsgrundande belopp enligt rulepack för datum, land, övernattning, avresa/ankomsttid och måltidsreduktion
- payroll konsumera endast approved allowance decisions
- utlägg som ska återbetalas via AP ska inte gå genom payroll
- skattefri och skattepliktig del ska separeras innan AGI mapping
- mileage ska följa aktuell rulepack med fordonstyp, ägandeform och datum

### 6.10 Pension och salary exchange

- pension base beräknas från regelstyrda lönekomponenter och effective-dated pension policy
- salary exchange kräver:
  - skriftligt aktivt avtal
  - effective dating
  - minsta kvarvarande pensionsgrundande nivå enligt policy
  - särskild löneskattspost där tillämpligt
- pension provider export skapas från approved pension instructions
- payroll postar kostnad och skuld; integrationsdomänen äger transport till pensionsleverantör

### 6.11 Löneutmätning

- löneutmätning räknas först efter preliminär skatt
- source of truth är Kronofogdens beslutssnapshot
- skyddat belopp/förbehållsbelopp hämtas från beslut plus årsspecifikt rulepack
- systemet får inte låta användare skriva fritt över beslutade nivåer utan dual review
- remittering till Kronofogden skapas som särskild skuld och payment order

## 7. HUS/ROT/RUT

### 7.1 Grundregler

- HUS claim får bara skapas när:
  - arbete är klassificerat som godkänt HUS-arbete
  - kundfaktura är utfärdad med alla lagkrav uppfyllda
  - kundens betalning är verifierad
  - obligatoriska uppgifter om köpare, fastighet eller BRF, arbetskostnad, material och timmar är låsta
- claim måste ha egen versionskedja
- arbete och betalning måste ha skett innan ansökan
- ansökan måste vara inkommen senast 31 januari året efter betalningsåret
- kombinerat HUS-tak 2026 är 75 000 kronor per person och år
- ROT är 30 procent av arbetskostnaden från 1 januari 2026
- partial payments ska proportionera arbetskostnad, material och begärt belopp

### 7.2 HUS data som måste låsas i claim version

- köpare och person-/organisationsnummer
- utförarens organisationsnummer
- kundfaktura-id
- service type och legal classification
- arbetskostnad inklusive moms
- materialkostnad
- arbetade timmar
- arbetsdatum från/till
- betalningsdatum per köpare
- betalt belopp per köpare
- fastighetsbeteckning eller BRF-nummer där relevant
- begärt belopp
- payload hash

### 7.3 HUS bokföring

- vid fakturering med HUS ska kundfordran och HUS-fordran separeras om reducerat kundbelopp används
- när kund betalar bokas betalningen mot kundfordran
- när claim accepteras bokas utbetalningen mot HUS-fordran
- vid delgodkännande eller avslag öppnas customer debt eller discrepancy enligt claim decision
- recovery efter kredit eller senare fel leder till kundfordran eller återkravsskuld enligt beslutad återkravsväg

## 8. Skattekonto

- tax account subledger ska spegla Skatteverkets händelser som separat objektmodell
- import av skattekontohändelse kräver source fingerprint och dedupe key
- auto-match får endast ske när liability match är entydig
- partial offset är tillåten
- unmatched eller conflicting match skapar discrepancy case och close blocker
- bokning av differens kräver review approval
- skattekontot ska reconcileras mot:
  - AGI liabilities
  - VAT liabilities
  - special payroll tax
  - ränta och avgifter
- bankhändelser som avser skattekontobetalning måste kunna länkas till tax account settlement

## 9. Legal form, declarations och annual reporting

### 9.1 Legal form profiles

Minst följande families ska stödjas:
- aktiebolag
- enskild näringsverksamhet
- handelsbolag
- kommanditbolag
- ekonomisk förening

### 9.2 Reporting obligations

- aktiebolag: årsredovisning samt Inkomstdeklaration 2
- ekonomisk förening: årsredovisning enligt obligation profile samt Inkomstdeklaration 2
- enskild näringsverksamhet: NE/NEA-spår inom inkomstdeklarationen
- handelsbolag och kommanditbolag: Inkomstdeklaration 4; årsredovisningsplikt bedöms separat
- legal-form change måste skapa ny effective-dated profile; historik får inte skrivas över

### 9.3 Annual package rules

- package byggs bara från låsta report snapshots
- package har evidence pack med source fingerprints
- signoff sker på låst package hash
- correction skapar ny package version
- filing submission skiljer technical receipt, domain acceptance och final outcome

## 10. Reviewgränser och blockerande valideringar

### 10.1 Blockerande valideringar

Systemet ska neka vidare flöde när:
- posting intent saknar recipe eller rulepack
- period är låst
- accounting method eller fiscal year saknas
- VAT decision är oklar
- tax decision snapshot saknas för payroll
- AGI-sensitive absence ändrats efter signoff
- HUS claim inte har komplett betalningsbevis
- submission payload hash inte matchar signoff
- tax account discrepancy är öppen vid close
- annual package saknar legal-form profile eller reporting obligation profile

### 10.2 Reviewgränser

Mänsklig review krävs när:
- rulepack sätter `review_required = true`
- manual emergency tax används
- SINK-fallback används
- contribution reduction rules träffar med osäker ålder eller period
- benefits classification är oklar
- HUS buyer allocation eller property data är ofullständig
- tax account mismatch eller offset-konflikt finns
- reopen/correction påverkar tidigare inlämnad AGI, VAT, HUS eller annual filing
- annual filing signatory chain avviker från profile

## 11. Receipts, replay och recovery

- alla regulatoriska submissions använder samma `SubmissionEnvelope` och `SubmissionReceipt`
- replay av samma payloadversion ska vara idempotent mot transportlagret
- correction kräver ny payloadversion
- dead-letter får inte lösa affärsfel; dead-letter hanterar endast tekniskt stoppat arbete
- recovery måste knytas till source object, submission version och economic consequence

## 12. Signal-till-bokning-matris

| Signal | Domän | Automatisk eller review | Bokningstillstånd |
|---|---|---|---|
| `ar.invoice.issued` | AR | automatisk om gates gröna | skapar posting intent |
| `ap.invoice.posted` | AP | automatisk om import/klassning godkänd | skapar posting intent |
| `payroll.run.posted` | Payroll | automatisk efter payroll approval | skapar posting intent |
| `bank.statement.line.matched_and_approved` | Banking | review om match ej entydig | skapar posting intent |
| `tax_account.event.classified_and_approved` | Tax account | review vid mismatch | skapar posting intent |
| `hus.claim.accepted` | HUS | automatisk efter business decision receipt | skapar posting intent |
| `close.adjustment.approved` | Close | alltid mänsklig approval | skapar posting intent |
| `annual.tax_adjustment.approved` | Annual | alltid mänsklig approval | skapar posting intent |

## 13. Testkrav och golden scenarios

Minst följande golden scenarios måste finnas och vara gröna:
- ordinary salary med tabellskatt
- salary with jämkning
- SINK with valid decision
- SINK without decision fallback
- engångsbelopp
- youth contribution reduction 2026
- 67+ contribution rule 2026
- benefit taxable vs tax-free
- net salary deduction
- salary exchange
- Kronofogden garnishment
- cash method year-end catch-up
- reverse-charge construction invoice
- VAT correction after locked period
- HUS accepted
- HUS partial acceptance
- HUS rejection and customer debt
- tax account partial offset
- annual package AB
- annual package sole trader
- annual correction after reopen

## 14. Exit gate

Detta dokument är uppfyllt först när:
- alla reglerade decision engines finns i kod
- alla beslut är versionslåsta
- signal-till-bokning-matrisen följs
- alla ovanstående golden scenarios passerar
- AGI, VAT, HUS och annual filing har receipt/replay/correction chains
- manual_rate inte är huvudmodell för preliminärskatt
- ungdomsnedsättning 2026, SINK 22,5 procent och HUS/ROT 2026-regler ligger i rulepacks
- close blockerar öppen discrepancy, öppen correction eller saknad receipt där det krävs

