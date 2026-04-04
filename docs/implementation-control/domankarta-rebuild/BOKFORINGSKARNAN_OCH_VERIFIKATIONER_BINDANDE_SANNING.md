# BOKFÖRINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela bokföringskarnan och alla verifikationer som skapas i plattformen.

Detta dokument ska styra:
- huvudbok
- grundbok
- verifikationsserier
- verifikationsnummer
- journalrader
- balanskrav
- subledger-binding mot kontrollkonton
- korrigering, omforing och reversering
- periodlasning och periodateröppning
- öppningsbalanser och migrationsverifikationer
- SIE4- och annan voucher-export
- replay, audit trail och systemdokumentation för legal bokföring

Ingen kod, inget test, ingen route, ingen migration, ingen export, inget supportverktyg och inget annat bindande dokument får definiera avvikande verifikations- eller huvudbokssanning utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela bokföringskarnan utan att gissa:
- vad som är en verifikation och när den uppstår
- när en affärshandelse är bokföringsbar och när den måste blockeras
- hur huvudbok, grundbok och underliggande reskontror måste hanga ihop
- hur kontrollkonton får användas
- hur korrigeringar måste ske utan att historiken förstors
- hur periodlasning och senare rättelser ska fungera
- hur verifikationsserier, verifikationsnummer, export och audit ska hanga ihop

Detta dokument är inte en allman bokföringsteori. Det är produktens bindande facit för hur legal bokföring materialiseras i runtime.

## Omfattning

Detta dokument omfattar:
- canonical ledger- och journalmodell
- verifikationsserier och nummerpolicy
- verifikationshuvud, verifikationsrader och evidence-binding
- balanskrav och redovisningsvaluta
- kontrollkonton och krav på subledger-binding
- systemgenererade verifikationer
- manuella verifikationer
- reversering, supplementkorrektion och felrattelse
- periodlasning, periodateröppning och correction-in-open-period
- opening balances, migrationsverifikationer och replay
- grundbok, huvudbok, provbalans och voucher-export
- canonical audit trail och behandlingshistorik för verifikationer

Detta dokument omfattar inte:
- seller-side momsklassning eller momsrutemappning
- kundreskontra- eller leverantörsreskontralogik i sig
- bankstatementidentitet i sig
- lön, AGI, semester eller ändra payroll-beräkningar i sig
- periodiseringar, bokslutsomforingar, anläggningstillgangar eller lagerlogik i sig
- legal effect för ett specifikt affärsflöde utom verifikationskarnan själv

Kanonisk agarskapsregel:
- varje bindande flödesbibel äger sitt affärsutfall
- detta dokument äger hur ett godkant affärsutfall blir legal verifikation, grundbok, huvudbok, kontrollkontoeffekt och exportbar voucher-truth
- inget flöde får skapa eller mutera huvudbokssanning utan att följa denna bokföringskarna

## Absoluta principer

- varje legal bokföringseffekt måste materialiseras som en balanserad verifikation i redovisningsvaluta
- en postad verifikation får aldrig raderas, skrivas över eller muteras in-place
- varje postad verifikation måste ha exakt en canonical source binding eller explicit manual-journal-grund
- varje verifikation måste ha verifierbart underlag eller blockerad status
- kontrollkonton får aldrig postas utan att relevant subledger- eller owner-binding finns
- samma affärshandelse får aldrig skapa dubbla verifikationer genom replay, retry eller parallellkorning
- obalanserade verifikationer får aldrig postas, exporteras eller markeras som rattade
- periodlasning får aldrig kringgas genom direktpostning, DB-mutation eller dold adminvag
- korrigeringar får aldrig ske genom overwrite; de måste ske genom reversering, supplement eller annan uttrycklig correction chain
- verifikationsnummer får aldrig återanvändas eller tyst omnumreras
- grundbok, huvudbok, subledger, moms, skattekonto, SIE4 och audit trail får aldrig visa olika sanning för samma verifikation
- UI får aldrig aga bokföringslogik; all kontering, balanskontroll, seriesattning och periodvalidering ska aga i domänkarnan

## Bindande dokumenthierarki för bokföringskarnan och verifikationer

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- `Bokföringslag (1999:1078)` hos Sveriges riksdag
- Bokföringsnamndens vägledning om bokföring

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md` för seller-side invoice issue och credits
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` för settlement av kundopen items
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` för supplier invoice issue och AP-posting
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` för supplier settlement
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` för bankens tekniska truth
- `MOMSFLODET_BINDANDE_SANNING.md` för momsrutor och declarationside truth
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` för tax-account-side legal effect
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för upstream document ingest och receipts när det behovs

Detta dokument får inte overstyras av:
- gamla journal engines
- gamla handskrivna verifikationsserier
- gamla `[x] posted`-markeringar utan ledger evidence
- gamla exportskript som bygger verifikationer utan canonical source binding
- gamla phasebucket- eller phase19/phase21-artefakter som antar annan voucherstruktur

## Kanoniska objekt

- `LedgerBook`
  - bar canonical huvudbokstruth för ett juridiskt bolag och ett rakenskapsar
  - innehåller redovisningsvaluta, kontoplanbinding, periodstruktur och verifikationsseriepolicy

- `AccountingPeriod`
  - bar canonical öppen/last period per legal entity
  - innehåller start, slut, fiscal year, state, lock receipts och correction policy

- `VoucherSeries`
  - bar canonical seriepolicy per owner flow
  - innehåller series code, legal entity, fiscal year, next number pointer och gap policy

- `VoucherSeriesGapRecord`
  - bar auditbar förklaring för reserverat men oanvant eller explicit voidat nummer

- `VoucherHeader`
  - bar canonical verifikationstruth
  - innehåller voucher id, series code, verifikationsnummer, booking date, transaction date, description, source class, source id och posting state

- `VoucherLine`
  - bar canonical radtruth för konto, debet, kredit, objekt, dimensioner, valuta och source lineage

- `VoucherEvidenceBinding`
  - binder verifikationen till verifikation/underlag/receipt/document hash eller authority receipt

- `VoucherSourceBinding`
  - binder en affärshandelse till exakt en canonical verifikation eller blocked duplicate verdict

- `SubledgerControlBinding`
  - binder kontrollkontorad till relevant subledger owner, till exempel kund, leverantör, skattekonto eller employee receivable

- `PostingRuleProfile`
  - bar vilken canonical posting-regel som får användas för en given source class

- `ManualJournalDraft`
  - bar manuellt förberedd verifikation innan posting

- `CorrectionVoucherLink`
  - binder originalverifikation till reversering, supplement eller annan correction chain

- `OpeningBalanceVoucher`
  - bar öppningsbalans och migrerad ingangsposition som egen canonical kategori

- `LedgerReplayBatch`
  - bar teknisk och auditbar replaykedja för att regenerera presentationer utan att skapa ny legal effekt

- `LedgerExportReceipt`
  - bar exportbar receipt för SIE4, huvudbok eller annan approved voucher-export

- `TrialBalanceSnapshot`
  - bar provbalans och kontrollsumma per period eller exportscope

## Kanoniska state machines

### `ManualJournalDraft`

- `draft`
- `balanced`
- `review_pending`
- `approved`
- `rejected`
- `posted`
- `superseded`

### `VoucherHeader`

- `prepared`
- `validated`
- `posted`
- `exported`
- `corrected_via_link`
- `superseded_for_presentation_only`

Otillåtna övergångar:
- `posted -> prepared`
- `posted -> validated`
- `posted -> deleted`

### `AccountingPeriod`

- `open`
- `soft_locked`
- `hard_locked`
- `reopened_for_correction`
- `closed`

### `VoucherSeriesGapRecord`

- `reserved`
- `void_pending_reason`
- `justified`
- `invalid_gap`

### `LedgerReplayBatch`

- `queued`
- `running`
- `completed`
- `failed`
- `invalidated`

## Kanoniska commands

- `CreateManualJournalDraft`
- `AttachVoucherEvidence`
- `ValidateVoucherBalance`
- `ValidateControlAccountBindings`
- `ValidateAccountingPeriod`
- `ApproveManualJournal`
- `PostVoucher`
- `ReverseVoucher`
- `PostSupplementCorrection`
- `RegisterOpeningBalanceVoucher`
- `RegisterMigrationVoucher`
- `LockAccountingPeriod`
- `ReopenPeriodForCorrection`
- `RecordVoucherSeriesGap`
- `ExportVoucherSet`
- `RebuildLedgerPresentation`
- `InvalidateDuplicateSourcePosting`

## Kanoniska events

- `ManualJournalDraftCreated`
- `VoucherEvidenceAttached`
- `VoucherValidated`
- `VoucherPosted`
- `VoucherPostingBlocked`
- `VoucherReversed`
- `VoucherSupplementPosted`
- `OpeningBalanceVoucherRegistered`
- `MigrationVoucherRegistered`
- `AccountingPeriodLocked`
- `AccountingPeriodReopened`
- `VoucherSeriesGapRecorded`
- `VoucherExported`
- `LedgerReplayCompleted`
- `DuplicateSourcePostingBlocked`

## Kanoniska route-familjer

- `/v1/ledger/manual-journals/*`
  - får skapa utkast, review och explicit posting commands

- `/v1/ledger/vouchers/*`
  - får läsa verifikationer, hamta audit och exportreceipts
  - får aldrig skriva legal truth via fri patching

- `/v1/ledger/periods/*`
  - får läsa, läsa upp via godkänd correction path och hamta lock evidence

- `/v1/ledger/exports/*`
  - får skapa exportjobb och hamta receipts

- `/v1/ledger/replay/*`
  - får bara starta presentation/reconciliation replay, aldrig ny legal booking

Förbjudna route-monstrar:
- direkt-`PATCH` mot postad verifikation
- UI-driven `POST` som skickar färdiga journalrader utan command validation
- adminvag som skriver period state direkt i DB

## Kanoniska permissions och review boundaries

- `ledger.read`
  - läsa voucher, period, provbalans och export receipts

- `ledger.manual_journal.prepare`
  - skapa utkast, bifoga evidence, validera balans

- `ledger.manual_journal.approve`
  - godkänna manuellt journalutkast för posting

- `ledger.correction.post`
  - skapa reversering eller supplementkorrektion

- `ledger.period.lock`
  - soft- eller hard-lock period

- `ledger.period.reopen`
  - återöppna period för correction enligt policy

- `ledger.export.generate`
  - skapa SIE4- eller ledgerexport

- `ledger.replay.run`
  - kora replay av presentationer

Review boundaries:
- support/backoffice får aldrig skapa eller mutera verifikation utan samma approval boundary som finance
- UI-användare får aldrig hoppa över evidence- eller control-account-validering
- high-risk omforingar på kontrollkonton, skattekonton, eget kapital eller historiska perioder krav er dubbelreview

## Nummer-, serie-, referens- och identitetsregler

- varje verifikation måste ha:
  - legal entity id
  - fiscal year id
  - series code
  - verifikationsnummer unikt inom `legal entity + fiscal year + series code`
  - voucher uuid
  - source binding id eller manual journal id

- canonical produktpolicy för verifikationsserier:
  - `A` seller-side sales, kundfakturor, kreditnotor och customer-side ÄR issue
  - `B` supplier invoices, supplier credits och AP issue
  - `C` bank-owned postings och settlement-owned bank verifications
  - `D` manuella omforingar och explicit finance journals
  - `E` VAT, skattekonto, myndighets- och declarationside vouchers
  - `F` anläggningstillgangar och avskrivningar
  - `G` lager, COGS och warehouse-ledger
  - `H` project, WIP och profitability-ledger
  - `L` payroll, benefits och AGI-side vouchers
  - `M` migration, opening balance och cutover vouchers

- corrections får som canonical policy ligga i samma owner-driven serie som originalet eller i `D` om correction är frikopplad finance adjustment
- en reserverad nummerslucka får bara finnas om `VoucherSeriesGapRecord` finns
- verifikationsnummer får aldrig återanvändas efter reservation
- importerat historiskt nummer får bara bevaras som extern referens; intern canonical serie och nummer måste fortfarande vara unikt

## Valuta-, avrundnings- och omräkningsregler

- varje legal entity har exakt en redovisningsvaluta enligt bokföringslagen; canonical default är `SEK` om inte bolaget uttryckligen för bok i `EUR`
- varje verifikationsrad ska lagras i redovisningsvaluta
- om source transaction är i annan valuta måste foreign amount, foreign currency och applied rate bevaras som evidence men legal bokföring ska balansera i redovisningsvaluta
- avrundningsdifferenser får aldrig gommas i affärskonton; canonical produktpolicy är explicit rounding line till `3740`
- realiserad valutavinst ska enligt canonical default bokas mot `3960`
- realiserad valutaförlust ska enligt canonical default bokas mot `7960`
- rounding och FX-posting får aldrig uppsta utan förklarad source lineage

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig skapa ny legal effekt om samma `VoucherSourceBinding` redan finns postad
- recovery får återuppbygga presentation, provbalans, exportindex och drilldown men får inte skapa nya verifikationer
- correction ska ske genom:
  - full reversering
  - supplementkorrektion
  - correction in current open period med cross-reference till original
- posting in hard-locked period är absolut blockerad
- correction av hard-locked period ska som default ske i nasta öppna period med explicit `CorrectionVoucherLink`
- opening balances och migration vouchers måste markeras med source class `opening_balance` respektive `migration`
- cutover får aldrig dubbelfora redan importerad historik; idempotency ska styras av external source ids och import batch digest

## Huvudflödet

1. affärshandelse eller manual journal initieras
2. owner flow valjer canonical `PostingRuleProfile`
3. voucher draft eller systemvoucher byggs
4. balanskontroll kor
5. periodkontroll kor
6. kontrollkonto- och subledger-binding valideras
7. evidence-binding valideras
8. voucher postas och får canonical serie + nummer
9. voucher blir synlig i grundbok, huvudbok, provbalans och relevanta exports
10. vid fel skapas correction chain; originalet förblir immutable
11. vid replay eller export används postad voucher-truth, aldrig heuristik eller UI-state

## Bindande scenarioaxlar

- source class:
  - system_generated
  - manual_journal
  - migration
  - opening_balance
  - correction
  - replay_only

- posting owner:
  - ÄR
  - AP
  - bank
  - VAT_tax
  - payroll
  - inventory
  - fixed_assets
  - project_WIP
  - finance_manual

- period state:
  - open
  - soft_locked
  - hard_locked
  - reopened_for_correction

- evidence completeness:
  - full
  - partial_but_policy_allowed
  - missing_blocked

- control-account involvement:
  - none
  - AR_control
  - AP_control
  - tax_control
  - payroll_control

- currency profile:
  - accounting_currency_only
  - foreign_source_with_fx

- correction profile:
  - none
  - full_reversal
  - supplement
  - current_period_adjustment

- origin timing:
  - live_runtime
  - migration_cutover
  - replay

## Bindande policykartor

### Owner flow till canonical serie

- `AR_issue` -> `A`
- `AP_issue` -> `B`
- `bank_owned` -> `C`
- `manual_finance` -> `D`
- `VAT_tax_authority` -> `E`
- `fixed_assets` -> `F`
- `inventory_cogs` -> `G`
- `project_wip` -> `H`
- `payroll` -> `L`
- `migration_opening_balance` -> `M`

### Kontrollkontofamiljer som alltid krav er subledger eller owner binding

- `1510-1519` kundfordringar
- `2440-2449` leverantörsskulder
- `1630` skattekonto
- `1684` leverantörsforskott
- `1686` kort- och PSP-fordringar
- `2420` förskott från kunder
- `2710` personalskatt
- `2731` arbetsgivaravgifter
- `2852` anstandsskuld

### Canonical posting-approval policy

- system-generated voucher med komplett source binding: enkel maskinvalidation + owner-flow approval
- manual journal på resultatkonto utan kontrollkonto: finance approval
- manual journal på kontrollkonto, skattekonto, eget kapital eller historisk period: dubbelreview
- migration voucher: migration approval + cutover approval

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `BKF-P0001` vanlig seller-side invoice posting
  - debet `1510` `12 500`
  - kredit `3001` `10 000`
  - kredit `2611` `2 500`

- `BKF-P0002` vanlig supplier invoice posting
  - debet `4010` `10 000`
  - debet `2641` `2 500`
  - kredit `2440` `12 500`

- `BKF-P0003` customer payment mot öppen kundfordran
  - debet `1930` `12 500`
  - kredit `1510` `12 500`

- `BKF-P0004` supplier payment mot öppen leverantörsskuld
  - debet `2440` `12 500`
  - kredit `1930` `12 500`

- `BKF-P0005` bankavgift som bank-owned posting
  - debet `6570` `45`
  - kredit `1930` `45`

- `BKF-P0006` öppningsbalans för aktiebolag, banktillgang mot eget kapital
  - debet `1930` `100 000`
  - kredit `2081` `100 000`

- `BKF-P0007` öppningsbalans för enskild firma, banktillgang mot eget kapital
  - debet `1930` `100 000`
  - kredit `2010` `100 000`

- `BKF-P0008` full reversering av `BKF-P0002`
  - kredit `4010` `10 000`
  - kredit `2641` `2 500`
  - debet `2440` `12 500`

- `BKF-P0009` supplementkorrektion av underskattad supplier cost
  - debet `4010` `2 000`
  - debet `2641` `500`
  - kredit `2440` `2 500`

- `BKF-P0010` explicit reklassning mellan kostnadskonton
  - debet `6110` `1 250`
  - kredit `6210` `1 250`

- `BKF-P0011` tax-account payment
  - debet `1630` `25 000`
  - kredit `1930` `25 000`

- `BKF-P0012` VAT debit via tax account
  - debet `2650` `18 000`
  - kredit `1630` `18 000`

- `BKF-P0013` customer advance received
  - debet `1930` `5 000`
  - kredit `2420` `5 000`

- `BKF-P0014` application of customer advance against issued invoice
  - debet `2420` `5 000`
  - kredit `1510` `5 000`

- `BKF-P0015` supplier advance before invoice
  - debet `1684` `8 000`
  - kredit `1930` `8 000`

- `BKF-P0016` application of supplier advance against supplier invoice
  - debet `2440` `8 000`
  - kredit `1684` `8 000`

- `BKF-P0017` FX loss at settlement
  - debet `2440` `12 500`
  - debet `7960` `300`
  - kredit `1930` `12 800`

- `BKF-P0018` FX gain at settlement
  - debet `2440` `12 500`
  - kredit `1930` `12 200`
  - kredit `3960` `300`

- `BKF-P0019` rounding difference on settlement
  - debet `1930` `12 500`
  - debet `3740` `0,50`
  - kredit `1510` `12 500,50`

- `BKF-P0020` aggregated sales voucher är tillaten endast om line lineage bevaras
  - debet `1510` `125 000`
  - kredit `3001` `100 000`
  - kredit `2611` `25 000`

- `BKF-P0021` blocked imbalance
  - utfall: ingen voucher får postas

- `BKF-P0022` blocked control-account posting without subledger binding
  - utfall: ingen voucher får postas

- `BKF-P0023` blocked duplicate source binding
  - utfall: original voucher kvarstar, ny posting nekas

- `BKF-P0024` blocked hard-locked period posting
  - utfall: ingen voucher får postas

- `BKF-P0025` migration of historic ÄR opening balance
  - debet `1510` `50 000`
  - kredit `2081` `50 000`
  - krav: subledger binding till importerad kundreskontra

- `BKF-P0026` migration of historic AP opening balance
  - debet `2081` `40 000`
  - kredit `2440` `40 000`
  - krav: subledger binding till importerad leverantörsreskontra

- `BKF-P0027` payroll withholding transfer to tax account mirror
  - debet `2710` `32 000`
  - kredit `1630` `32 000`

- `BKF-P0028` employer contribution transfer to tax account mirror
  - debet `2731` `28 000`
  - kredit `1630` `28 000`

- `BKF-P0029` realized customer bad debt confirmation
  - debet `6352` `12 500`
  - kredit `1510` `12 500`

- `BKF-P0030` forbidden direct manual posting to `2650` without VAT owner binding
  - utfall: blocked review

## Bindande rapport-, export- och myndighetsmappning

- varje postad verifikation ska bli synlig i:
  - grundbok
  - huvudbok
  - provbalans
  - SIE4 type `4` eller `4i` när export scope kraver det

- varje voucher line ska kunna mappas till:
  - konto
  - debet/kredit
  - verifikationsserie
  - verifikationsnummer
  - bokföringsdatum
  - transaktionsdatum eller source date
  - text
  - dimensionsdata där policy kraver det

- verifikationer som saknar laglig posting status får aldrig exporteras
- replay- eller presentation-only supersession får aldrig skapa nya verifikationsposter i export

## Bindande scenariofamilj till proof-ledger och rapportspar

- `BKF-A001` systemgenerated seller invoice -> `BKF-P0001` -> huvudbok, grundbok, kundreskontra bridge, SIE4
- `BKF-A002` systemgenerated supplier invoice -> `BKF-P0002` -> huvudbok, grundbok, leverantörsreskontra bridge, SIE4
- `BKF-A003` customer payment -> `BKF-P0003` -> huvudbok, grundbok, bankbridge, ÄR aging
- `BKF-A004` supplier payment -> `BKF-P0004` -> huvudbok, grundbok, bankbridge, AP aging
- `BKF-A005` bank fee -> `BKF-P0005` -> huvudbok, grundbok, bank export
- `BKF-B001` opening balance AB -> `BKF-P0006` -> huvudbok, provbalans, SIE4
- `BKF-B002` opening balance sole proprietor -> `BKF-P0007` -> huvudbok, provbalans, SIE4
- `BKF-C001` full reversal -> `BKF-P0008` -> huvudbok, grundbok, correction export
- `BKF-C002` supplement correction -> `BKF-P0009` -> huvudbok, grundbok, correction export
- `BKF-C003` manual reclass -> `BKF-P0010` -> huvudbok, grundbok, audit trail
- `BKF-D001` tax payment -> `BKF-P0011` -> huvudbok, skattekonto bridge, SIE4
- `BKF-D002` VAT settlement -> `BKF-P0012` -> huvudbok, moms -> skattekonto bridge
- `BKF-D003` customer advance -> `BKF-P0013` + `BKF-P0014` -> huvudbok, ÄR bridge
- `BKF-D004` supplier advance -> `BKF-P0015` + `BKF-P0016` -> huvudbok, AP bridge
- `BKF-E001` FX settlement loss -> `BKF-P0017` -> huvudbok, realized FX reporting
- `BKF-E002` FX settlement gain -> `BKF-P0018` -> huvudbok, realized FX reporting
- `BKF-E003` rounding -> `BKF-P0019` -> huvudbok
- `BKF-F001` blocked imbalance -> `BKF-P0021` -> no export, blocked audit case
- `BKF-F002` blocked missing subledger -> `BKF-P0022` -> no export, blocked audit case
- `BKF-F003` blocked duplicate source -> `BKF-P0023` -> duplicate register only
- `BKF-F004` blocked locked period -> `BKF-P0024` -> correction required
- `BKF-G001` ÄR opening migration -> `BKF-P0025` -> migration export, provbalans
- `BKF-G002` AP opening migration -> `BKF-P0026` -> migration export, provbalans
- `BKF-H001` payroll/tax mirror -> `BKF-P0027` + `BKF-P0028` -> huvudbok, skattekonto bridge
- `BKF-H002` bad debt confirmation -> `BKF-P0029` -> huvudbok, ÄR bridge
- `BKF-H003` forbidden free manual tax posting -> `BKF-P0030` -> blocked review

## Tvingande dokument- eller indataregler

Varje postad verifikation måste minst ha:
- bokföringsdatum
- transaktionsdatum eller canonical source date
- verifikationstext
- verifikationsserie
- verifikationsnummer
- minst en evidenskalla eller manual-journal-grund
- minst två voucher lines om inte flödet uttryckligen producerar fler
- balanserad debet och kredit i redovisningsvaluta
- source class
- source binding eller manual journal id

Varje manual journal måste dessutom ha:
- prepared by
- approved by om dubbelreview krävs
- correction reason när det är rättelse
- bilaga eller underlagshash om journalen bygger på externt dokument

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `BKF-R001` ordinary_system_posting
- `BKF-R002` manual_journal_finance_reclass
- `BKF-R003` full_reversal_of_wrong_posting
- `BKF-R004` supplement_correction_after_underposting
- `BKF-R005` opening_balance_at_cutover
- `BKF-R006` migration_historic_voucher
- `BKF-R007` period_reopen_with_approval
- `BKF-R008` duplicate_source_blocked
- `BKF-R009` control_account_without_subledger_blocked
- `BKF-R010` hard_locked_period_blocked

## Bindande faltspec eller inputspec per profil

### Systemgenerated voucher

Obligatoriska fält:
- `legalEntityId`
- `fiscalYearId`
- `seriesCode`
- `sourceClass`
- `sourceId`
- `bookingDate`
- `transactionDate`
- `description`
- `lines[]`
- `evidenceRefs[]`

### Manual journal

Obligatoriska fält:
- alla systemfalten ovan utom `sourceId` som ersätts av `manualJournalDraftId`
- `preparedBy`
- `reasonCode`
- `reviewBoundary`

### Correction voucher

Obligatoriska fält:
- alla voucherfalten
- `correctionMode`
- `correctsVoucherId`
- `correctionReason`

### Opening balance voucher

Obligatoriska fält:
- alla voucherfalten
- `openingBalanceScope`
- `cutoverDate`
- `migrationBatchId`

## Scenariofamiljer som hela systemet måste tacka

- `BKF-A001` systemgenerated seller invoice
- `BKF-A002` systemgenerated supplier invoice
- `BKF-A003` customer payment
- `BKF-A004` supplier payment
- `BKF-A005` bank fee
- `BKF-B001` opening balance AB
- `BKF-B002` opening balance sole proprietor
- `BKF-C001` full reversal
- `BKF-C002` supplement correction
- `BKF-C003` manual reclass
- `BKF-D001` tax payment
- `BKF-D002` VAT settlement
- `BKF-D003` customer advance
- `BKF-D004` supplier advance
- `BKF-E001` FX settlement loss
- `BKF-E002` FX settlement gain
- `BKF-E003` rounding difference
- `BKF-F001` imbalance blocked
- `BKF-F002` control account without subledger blocked
- `BKF-F003` duplicate source blocked
- `BKF-F004` hard-locked period blocked
- `BKF-G001` migrated ÄR opening balance
- `BKF-G002` migrated AP opening balance
- `BKF-H001` payroll tax mirror
- `BKF-H002` bad debt confirmation
- `BKF-H003` forbidden free manual tax posting

## Scenarioregler per familj

- `BKF-A001-A005`
  - ska skapas av owner flow, inte av UI
  - ska postas i owner-driven serie
  - ska alltid fa `VoucherSourceBinding`

- `BKF-B001-B002`
  - ska endast användas vid cutover eller start av nytt bolag i systemet
  - ska markeras `opening_balance`

- `BKF-C001-C003`
  - ska alltid korsreferera till original eller explicit finance case
  - ska aldrig skriva över originalverifikation

- `BKF-D001-D004`
  - ska bara fa postas när upstream owner flow redan är finalized

- `BKF-E001-E003`
  - ska explicit visa FX eller rounding i stallet för att dorras genom affärskonton

- `BKF-F001-F004`
  - ska blockera posting helt
  - ska skapa audit case men ingen verifikation

- `BKF-G001-G002`
  - ska vara idempotenta över migration batch digest

- `BKF-H001-H003`
  - ska bara fa posta mot kontrollkonton när subledger eller authority-binding finns

## Blockerande valideringar

- debet och kredit summerar inte exakt lika i redovisningsvaluta
- verifikationsserie saknas eller är inte tillaten för owner flow
- verifikationsnummer är duplikat eller återanvant
- kontrollkonto postas utan subledger-binding
- period är `hard_locked`
- correction saknar referens till original eller correction reason
- evidence saknas för scenario som krav er underlag
- source binding är duplikat
- manual journal försöker posta mot `2650`, `2710`, `2731`, `1630`, `1510` eller `2440` utan correct review boundary
- replay försöker skapa ny voucher i stallet för att bara bygga presentation

## Rapport- och exportkonsekvenser

- varje postad voucher ska ge exakt en grundbokspost
- varje konto i voucher lines ska synas i huvudboken för samma datum- och periodscope
- provbalans ska vara derivation av postade voucher lines, aldrig separat saldologik
- SIE4-export ska bygga på canonical voucher lines och serie/nummer-policy
- blocked scenarios ska aldrig skapa exporterad transaktion
- correction vouchers ska exporteras som egna verifikationer med correction lineage

## Förbjudna förenklingar

- fri UI-kontering direkt mot DB
- overwrite av postad voucher
- dold automatisk omnumrering
- generiskt suspense-konto som fallback för obekant scenario
- auto-posting till kontrollkonto utan owner binding
- tyst rounding genom att justera annan rad
- att lata replay skapa ny bokföring
- att markera export som lyckad utan `LedgerExportReceipt`

## Fler bindande proof-ledger-regler för specialfall

- `BKF-P0031` manual journal på eget kapital i AB
  - debet `2091` `10 000`
  - kredit `2081` `10 000`
  - krav: dubbelreview

- `BKF-P0032` manual journal på interim skuld
  - debet `2440` `5 000`
  - kredit `2990` `5 000`
  - krav: supplier binding eller explicit correction case

- `BKF-P0033` reopen-and-correct in current open period
  - kredit original felkonto enligt correction
  - debet rätt konto enligt correction
  - originalet förblir orort

- `BKF-P0034` blocked orphan voucher line after replay
  - utfall: replay failure, ingen ny legal effect

- `BKF-P0035` manual journal blocked due to missing evidence
  - utfall: draft kvarstar, ingen posting

- `BKF-P0036` migration duplicate batch blocked
  - utfall: ingen ny voucher, duplicate receipt skapas

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `BKF-P0001` skapar eller uppdaterar ÄR binding mot kundreskontra
- `BKF-P0002` skapar eller uppdaterar AP binding mot leverantörsreskontra
- `BKF-P0003` stanger eller minskar `CustomerOpenItem`
- `BKF-P0004` stanger eller minskar `ApOpenItem`
- `BKF-P0011-P0012` uppdaterar skattekontomirror
- `BKF-P0013-P0016` uppdaterar förskotts- eller advance-state
- `BKF-P0021-P0024` skapar endast blocked review case
- `BKF-P0025-P0026` skapar opening reskontrabindingar

## Bindande verifikations-, serie- och exportregler

- varje voucher måste exporteras med samma serie och nummer som i runtime
- SIE4 får aldrig genereras från presentationssaldon; den måste genereras från canonical voucher lines
- serieskoder får inte mappas om per exportkanal
- export av korrigerad voucher ska visa bade original och correction according to scope
- voidade nummerserier eller gaps måste kunna visas i audit trail

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- legal entity form:
  - aktiebolag
  - enskild firma
  - handelsbolag när relevant

- source mode:
  - live
  - migration
  - correction

- period state:
  - open
  - hard_locked
  - reopened_for_correction

- evidence mode:
  - full evidence
  - blocked missing evidence

- currency mode:
  - SEK-only
  - foreign source with SEK/EUR accounting currency

- control-account mode:
  - none
  - ÄR
  - AP
  - tax
  - payroll

## Bindande fixture-klasser för bokföringskarnan och verifikationer

- `BKF-FXT-001` standard domestic 25% VAT voucher set
- `BKF-FXT-002` cash-only bank fee set
- `BKF-FXT-003` opening balance AB
- `BKF-FXT-004` opening balance sole proprietor
- `BKF-FXT-005` reversal chain
- `BKF-FXT-006` supplement correction chain
- `BKF-FXT-007` foreign-currency settlement
- `BKF-FXT-008` customer advance chain
- `BKF-FXT-009` supplier advance chain
- `BKF-FXT-010` duplicate source replay case
- `BKF-FXT-011` hard-locked period correction case
- `BKF-FXT-012` migration opening balances with ÄR/AP

## Bindande expected outcome-format per scenario

Varje scenario måste skriva ut:
- scenario-id
- fixture class
- source owner
- period state
- evidence verdict
- expected voucher series
- expected voucher lines
- expected subledger effect
- expected export effect
- expected blocker eller success verdict

## Bindande canonical verifikationsseriepolicy

- `A` får inte användas av AP, bank eller payroll
- `B` får inte användas av seller-side ÄR issue
- `C` får inte användas för manual finance reclass om inte bank är canonical owner
- `D` är default för finance-controlled manual journals
- `E` är default för VAT-/tax-authority-ledger
- `M` är obligatorisk för opening balance och migration om inte specifik owner-flow policy uttryckligen overstyr
- generisk catch-all-serie är förbjuden

## Bindande expected outcome per central scenariofamilj

### `BKF-A001`

- fixture: `BKF-FXT-001`
- expected:
  - serie `A`
  - balanserad voucher enligt `BKF-P0001`
  - ÄR-binding finns
  - grundbok, huvudbok och SIE4 visar samma radset

### `BKF-C001`

- fixture: `BKF-FXT-005`
- expected:
  - original kvarstar immutable
  - reversering postar egen voucher
  - correction lineage finns

### `BKF-F002`

- fixture: `BKF-FXT-010`
- expected:
  - ingen voucher postad
  - blocked review case skapad
  - audit trail anger att kontrollkonto saknade subledger-binding

### `BKF-G001`

- fixture: `BKF-FXT-012`
- expected:
  - serie `M`
  - verifikation enligt `BKF-P0025`
  - importerad kundreskontra binder till `1510`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `BKF-A001` -> success -> `BKF-P0001` -> series `A`
- `BKF-A002` -> success -> `BKF-P0002` -> series `B`
- `BKF-A003` -> success -> `BKF-P0003` -> series `C`
- `BKF-A004` -> success -> `BKF-P0004` -> series `C`
- `BKF-A005` -> success -> `BKF-P0005` -> series `C`
- `BKF-B001` -> success -> `BKF-P0006` -> series `M`
- `BKF-B002` -> success -> `BKF-P0007` -> series `M`
- `BKF-C001` -> success -> `BKF-P0008` -> owner serie eller `D`
- `BKF-C002` -> success -> `BKF-P0009` -> owner serie eller `D`
- `BKF-C003` -> success -> `BKF-P0010` -> `D`
- `BKF-D001` -> success -> `BKF-P0011` -> `E`
- `BKF-D002` -> success -> `BKF-P0012` -> `E`
- `BKF-D003` -> success -> `BKF-P0013` + `BKF-P0014`
- `BKF-D004` -> success -> `BKF-P0015` + `BKF-P0016`
- `BKF-E001` -> success -> `BKF-P0017`
- `BKF-E002` -> success -> `BKF-P0018`
- `BKF-E003` -> success -> `BKF-P0019`
- `BKF-F001` -> blocked -> `BKF-P0021`
- `BKF-F002` -> blocked -> `BKF-P0022`
- `BKF-F003` -> blocked -> `BKF-P0023`
- `BKF-F004` -> blocked -> `BKF-P0024`
- `BKF-G001` -> success -> `BKF-P0025`
- `BKF-G002` -> success -> `BKF-P0026`
- `BKF-H001` -> success -> `BKF-P0027`
- `BKF-H002` -> success -> `BKF-P0029`
- `BKF-H003` -> blocked -> `BKF-P0030`

## Bindande testkrav

- varje scenariofamilj måste ha minst ett deterministiskt green-path-test
- varje blockerfamilj måste ha minst ett red-path-test
- balanskontroll måste testas med:
  - hela kronor
  - orebelopp
  - foreign-currency translation
- duplicate source binding måste testas i replay och parallellkorning
- period lock måste testas mot:
  - open period
  - hard-locked period
  - reopened-för-correction
- kontrollkonto utan subledger-binding måste testas för `1510`, `2440`, `1630`, `2710`, `2731`
- SIE4-export måste testas sa att serie, nummer, datum och rader exakt matchar posted vouchers
- migration fixtures måste testas idempotent över samma batch digest

## Källor som styr dokumentet

- Sveriges riksdag: [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- Bokföringsnamnden: [Vägledning Bokföring till BFNAR 2013:2](https://www.bfn.se/wp-content/uploads/remiss-vagledning-bokforing-2024.pdf)
- BAS: [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- BAS: [BAS kontoplaner](https://www.bas.se/kontoplaner/)
- Föreningen SIE-Gruppen: [SIE format](https://sie.se/format/)
