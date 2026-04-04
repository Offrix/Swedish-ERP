# SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för all SIE4-import och SIE4-export i produkten.

Detta dokument är den kanoniska sanningen för hur ledger truth serialiseras till och från SIE typ 4 utan att forlora:
- verifikationer
- transaktioner
- konton
- dimensioner och objekt
- rakenskapsarsidentitet
- balansinformation
- revisionsspar

## Syfte

Detta dokument ska göra SIE4 till:
- deterministisk export av svensk redovisningstruth
- deterministisk import för migration, kontroll och revisionsspar
- blockerad eller review-styrd inlasning när filen inte kan bevisas mot ledger truth

## Omfattning

Detta dokument omfattar:
- SIE typ 4
- export av verifikationer
- import av verifikationer
- balansposter och rakenskapsarsmetadata i typ 4-filer
- kontoplan, SRU och dimensionsmetadata där dessa exporteras
- importstaging, canonicalisering, review, blocker och evidence

Detta dokument omfattar inte:
- SIE typ 1-3 som bindande produktionssanning
- generell CSV- eller Excel-export
- myndighets-XML
- moms- eller AGI-logik i sig

## Absoluta principer

- SIE4 får aldrig bli en separat bokföringssanning bredvid ledgern.
- Ledgern är primär sanning; SIE4 är serialisering eller kontrollerad importkanal.
- Export får aldrig utelamna obligatoriska poster för att passa en mottagare.
- Import får aldrig bokföra direkt till produktionen utan canonical validering, staging och explicit commit.
- SIE4-import får aldrig skriva över befintlig legal effect.
- Om filen inte kan tolkas förlustfritt ska import blockeras eller ga till review.
- `#SIETYP 4` är bindande för detta dokument.
- Export ska följa SIE-formatets krav i sin helhet för typ 4, inte bara en anpassad delmangd.

## Bindande dokumenthierarki för SIE4 import och export

- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger ledger truth som serialiseras till och från SIE4.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` agerar overordnad sanning för seriepolicy och voucher identity.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` agerar overordnad sanning för valutaregler som serialiseras till SIE.
- `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` agerar overordnad sanning för dimensionstyper, objekttyper, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` agerar overordnad sanning för storre SIE-baserade cutoverkedjor.
- Domän 15 och Domän 27 får inte definiera avvikande SIE4-truth utan att detta dokument skrivs om samtidigt.

## Kanoniska objekt

- `Sie4ExportBatch`
  - äger en deterministisk exportbestallning för exakt ett bolag och en definierad period/arsmangd
  - bar exportprofil, year-scope, snapshot ref och artifact refs
- `Sie4FileArtifact`
  - äger den faktiska `.se`-filen, checksumma, encoding, created-at och source snapshot
  - är bevisobjekt, inte legal effect i sig
- `Sie4ImportBatch`
  - äger en inkommande SIE4-fil under import, staging, review och commit
  - bar source system, source file checksum, declared year scope och import purpose
- `Sie4VoucherRef`
  - bar relationen mellan extern `#VER`/`#TRANS` och intern canonical voucher/import line
- `Sie4ImportIssue`
  - bar parsefel, strukturfel, mappingfel, duplicat, konflikter och blockerorsaker
- `Sie4RoundTripEvidence`
  - bar bevis att exporterad eller importerad fil matchar canonical truth

## Kanoniska state machines

- `Sie4ExportBatch`
  - `draft -> frozen -> generated -> delivered | failed | superseded`
- `Sie4ImportBatch`
  - `received -> parsed -> validated -> review_required | ready_to_commit | blocked -> committed | rejected`
- `Sie4ImportIssue`
  - `open -> triaged -> resolved | waived | blocking`
- `Sie4RoundTripEvidence`
  - `draft -> computed -> passed | failed`

## Kanoniska commands

- `CreateSie4ExportBatch`
- `FreezeSie4ExportSnapshot`
- `GenerateSie4FileArtifact`
- `DeliverSie4FileArtifact`
- `ReceiveSie4ImportBatch`
- `ParseSie4ImportBatch`
- `ValidateSie4ImportBatch`
- `RouteSie4ImportForReview`
- `CommitSie4ImportBatch`
- `RejectSie4ImportBatch`
- `ComputeSie4RoundTripEvidence`

## Kanoniska events

- `Sie4ExportBatchCreated`
- `Sie4ExportSnapshotFrozen`
- `Sie4FileArtifactGenerated`
- `Sie4FileArtifactDelivered`
- `Sie4ImportBatchReceived`
- `Sie4ImportBatchParsed`
- `Sie4ImportBatchValidated`
- `Sie4ImportReviewRequired`
- `Sie4ImportBatchCommitted`
- `Sie4ImportBatchRejected`
- `Sie4RoundTripEvidenceComputed`

## Kanoniska route-familjer

- `/api/accounting/sie4/exports/*`
- `/api/accounting/sie4/imports/*`
- `/api/accounting/sie4/evidence/*`
- batch- eller worker-routes för generation och validation

## Kanoniska permissions och review boundaries

- `accounting.read` får läsa exporter
- `accounting.manage` får skapa draft-export och upload-import
- `accounting.close` eller motsvarande får frysa export mot stangda perioder
- `migration.manage` får committa importbatchar för migration
- `support` får aldrig committa SIE4-import till legal truth
- review krävs alltid för unknown mapping, duplicate voucher identity, balance mismatch eller unsupported correction profile

## Nummer-, serie-, referens- och identitetsregler

- En SIE4-fil avser exakt ett bolag.
- `#SIETYP 4` är obligatorisk.
- `#PROGRAM`, `#GEN`, `#ORGNR`, `#FNAMN` och `#RAR` ska finnas i canonical export.
- `#FORMAT PC8` är canonical exportprofil enligt SIE-specen.
- `#VER` ska serialiseras med stabil serie och vernr från ledger truth.
- `(rar, serie, vernr)` ska vara unik inom en fil.
- `#TRANS` tillhor exakt en `#VER`.
- `#KONTO` ska finnas för varje konto som används i exporterade poster.
- `#RAR` ska vara fullständig för de är som exporteras.

## Valuta-, avrundnings- och omräkningsregler

- SIE4 exporteras i ledgerns redovisningsvaluta.
- Om redovisningsvalutan uttryckligen måste anges ska `#VALUTA` finnas.
- Export får aldrig skapa ny valutadifferens.
- Belopp i `#TRANS`, `#IB`, `#UB` och `#RES` ska matcha canonical ledger truth exakt.
- Import med belopp som inte kan parsas förlustfritt ska blockeras.

## Replay-, correction-, recovery- och cutover-regler

- Export ska alltid binda till en frusen snapshot.
- Om ledgern korrigeras ska ny exportbatch skapas; gammal fil får inte muteras.
- Import ska alltid ga till staging först.
- Import får aldrig overskriva existerande canonical vouchers.
- Replay av export ska ge identisk fil för samma snapshot, profile och metadata.
- Recovery efter genereringsfel ska skapa nytt artifact med nytt batch-id men samma frozen source snapshot om datat är oforandrat.

## Huvudflödet

1. användare eller worker skapar `Sie4ExportBatch`
2. systemet fryser source snapshot
3. exportprofil och year scope valideras
4. filen genereras med obligatoriska posttyper och canonical ordning
5. checksumma och evidence beräknas
6. artifact levereras eller stalls ut för nedladdning
7. vid import tas fil emot som `Sie4ImportBatch`
8. parser och strukturvalidator kor
9. mapping mot konto, serie, period och dimensioner valideras
10. okand eller konfliktfull data skickas till review eller blockeras
11. endast validerad importbatch får committas via migration/accounting command path
12. roundtrip evidence skrivs för import/export där det krävs

## Bindande scenarioaxlar

- export vs import
- native export vs migration import
- single-year vs multi-year
- with dimensions vs without dimensions
- with balances vs without balances där spec kraver dem
- known accounts vs unknown accounts
- known voucher identity vs duplicate collision
- closed period vs open period
- base currency only vs explicit `#VALUTA`
- clean parse vs parse with issues

## Bindande policykartor

- `SIE-POL-001`: canonical export = typ 4
- `SIE-POL-002`: canonical export encoding = `PC8`
- `SIE-POL-003`: canonical export artifact extension = `.se`
- `SIE-POL-004`: `#RTRANS` och `#BTRANS` får inte emitteras i normal native export
- `SIE-POL-005`: import får acceptera `#RTRANS/#BTRANS` bara i explicit migration review-profil
- `SIE-POL-006`: missing `#ORGNR` eller `#RAR` = blocker
- `SIE-POL-007`: duplicate `(rar, serie, vernr)` within file = blocker
- `SIE-POL-008`: import skapar staging-linked external refs, inte direkt live voucher overwrite

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `SIE-P0001`
  - export header
  - krav: `#SIETYP 4`, `#FORMAT PC8`, `#PROGRAM`, `#GEN`, `#ORGNR`, `#FNAMN`, minst en `#RAR`
- `SIE-P0002`
  - export kontoplan
  - krav: `#KONTO` för varje konto som förekommer i `#TRANS`, `#IB`, `#UB`, `#RES`
- `SIE-P0003`
  - export balans och resultat
  - krav: `#UB` för innevarande är; `#IB`/`#UB` enligt spec; `#RES` för resultatkonton
- `SIE-P0004`
  - export verifikationer
  - krav: `#VER` + tillhorande `#TRANS` med stabil serie, vernr, datum och text
- `SIE-P0005`
  - export dimensionsmetadata
  - krav: `#DIM`, `#OBJEKT`, `#UNDERDIM` där objektredovisning finns
- `SIE-P0006`
  - import header validation
  - blocker om `#SIETYP != 4`, `#ORGNR` saknas, `#RAR` saknas eller encoding ej är losslessly parsebar
- `SIE-P0007`
  - import voucher identity validation
  - blocker om samma `(rar, serie, vernr)` förekommer flera ganger i filen utan legitim correction profile
- `SIE-P0008`
  - import account mapping
  - blocker om konto saknar canonical mapping och inget explicit migration mapping rulepack finns
- `SIE-P0009`
  - import commit
  - resultat: staging -> explicit commit -> canonical migration vouchers/import evidence
- `SIE-P0010`
  - roundtrip evidence
  - resultat: exported or imported file must reconcile mot snapshot and voucher counts

## Bindande rapport-, export- och myndighetsmappning

- SIE4 är inte myndighetsformat men är bindande export mot byra, revisor, byte av ekonomisystem och kontrollimport.
- `#SRU` får exporteras när SRU-koder finns i canonical kontoprofil.
- SIE4 får inte ersätta momsdeklaration, AGI, periodisk sammanställning eller INK2.

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SIE-A001` native full-year export -> `SIE-P0001`,`SIE-P0002`,`SIE-P0003`,`SIE-P0004`
- `SIE-A002` native export with dimensions -> `SIE-P0005`
- `SIE-B001` import full migration file -> `SIE-P0006`,`SIE-P0008`,`SIE-P0009`
- `SIE-B002` import duplicate voucher blocked -> `SIE-P0007`
- `SIE-B003` import unknown account blocked -> `SIE-P0008`
- `SIE-B004` import with unsupported correction posts -> `SIE-P0006`,`SIE-P0008`
- `SIE-C001` roundtrip export evidence -> `SIE-P0010`
- `SIE-C002` roundtrip import evidence -> `SIE-P0010`

## Tvingande dokument- eller indataregler

- Filen ska vara plain-text i parsebar encoding enligt SIE-spec eller explicit importprofil.
- Canonical export ska producera `.se`-fil.
- Importbatch ska lagra original binary oforandrat.
- Import utan checksumma, source filename eller import purpose får inte committas.
- En fil får inte blandas mellan flera bolag.
- Om orgnummer i filen inte matchar target company och inget explicit migration-override finns ska import blockeras.

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SIE-R001` wrong_file_type
- `SIE-R002` missing_required_header
- `SIE-R003` duplicate_voucher_identity
- `SIE-R004` unsupported_encoding
- `SIE-R005` unknown_account_mapping
- `SIE-R006` unknown_dimension_mapping
- `SIE-R007` inconsistent_year_scope
- `SIE-R008` balance_mismatch
- `SIE-R009` unsupported_correction_posts
- `SIE-R010` cross_company_conflict

## Bindande faltspec eller inputspec per profil

- `native_type4_export`
  - required: company id, fiscal year scope, frozen snapshot ref
  - output required: `#SIETYP 4`, `#FORMAT PC8`, `#ORGNR`, `#FNAMN`, `#PROGRAM`, `#GEN`, `#RAR`, `#KONTO`, `#VER`, `#TRANS`
- `migration_type4_import`
  - required: source file, checksum, import purpose, target company, operator, mapping profile
  - optional: source system, cutover ticket, external fiscal-year tags
- `audit_readonly_import`
  - required: source file, checksum
  - forbidden: commit to ledger truth

## Scenariofamiljer som hela systemet måste tacka

- full native year export
- export with dimensions and objects
- export with prior/comparison year balances
- import of full historical SIE4 migration file
- import with duplicate voucher ids
- import with unknown accounts
- import with unknown dimensions or objects
- import with wrong `#SIETYP`
- import with inconsistent org number
- import with unsupported `#RTRANS/#BTRANS`
- roundtrip reconciliation after export
- roundtrip reconciliation after import

## Scenarioregler per familj

- full native year export måste innehålla alla obligatoriska type-4-poster för vald arsrymd
- export with dimensions får inte droppa dimensioner som paverkar voucher truth
- import duplicate voucher ids ska blockeras före commit
- import unknown accounts ska ga till review eller block beroende på mapping profile
- wrong `#SIETYP` ska alltid blockeras
- cross-company import ska alltid blockeras utan explicit migration override
- unsupported correction posts ska blockeras i normal profil
- roundtrip failure ska alltid skapa failed evidence och blockerad green status

## Blockerande valideringar

- `#SIETYP` saknas eller är inte `4`
- `#ORGNR` saknas
- `#RAR` saknas
- `#VER` utan `#TRANS`
- konto förekommer i voucher eller balans utan `#KONTO`
- duplicate `(rar, serie, vernr)` utan explicit correction profile
- importfil innehåller flera bolag
- parsefel eller loss of encoding fidelity
- obalanserade imported vouchers
- imported balance lines reconcile inte mot imported voucher truth där profil kraver full parity

## Rapport- och exportkonsekvenser

- exporterad SIE4 blir revisions- och migrationsartifact
- importerad SIE4 får inte markeras som green om roundtrip/parity saknas
- om imported vouchers committas ska de kunna ligga till grund för huvudbok, grundbok, momsrapport, reskontror och SIE4 re-export

## Förbjudna förenklingar

- exportera bara `#VER/#TRANS` utan obligatoriska metadata
- droppa `#KONTO` för konton som antas vara kanda av mottagaren
- skriva om vernr eller serie i efterhand utan evidence
- auto-committa import utan review
- anta att mismatches kan fixas senare
- skapa proprietar delmangd och kalla den SIE4

## Fler bindande proof-ledger-regler för specialfall

- `SIE-P0011`
  - import with dimensions must preserve dimension identity or block
- `SIE-P0012`
  - import with SRU lines must preserve account-to-SRU relation as metadata only; no auto-tax inference
- `SIE-P0013`
  - export comparison-year balances must preserve correct `#RAR` year numbering
- `SIE-P0014`
  - read-only audit import must never create canonical vouchers

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `SIE-P0001-SIE-P0005` skapar inga nya subledgers; de serialiserar bestaende truth
- `SIE-P0006-SIE-P0008` skapar endast import issues, staging refs och review work
- `SIE-P0009` skapar explicit migration-owned canonical vouchers eller opening structures
- `SIE-P0010` skapar reconciliation evidence
- `SIE-P0014` skapar endast read-only audit artifact

## Bindande verifikations-, serie- och exportregler

- Canonical export ska serialisera voucher series exakt som de finns i ledger truth.
- Import ska bevara external source series/vernr som external refs även om intern canonical id skiljer sig.
- Export får inte omnumrera vouchers.
- Om flera rakenskapsar exporteras måste `#RAR`-mapping vara stabil och intern year numbering documented i artifact evidence.

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- with or without dimensions
- with or without comparison year
- native vs migration import
- clean vs review-required import
- SEK vs explicit `#VALUTA`
- one year vs multiple years
- strict commit vs read-only audit parse

## Bindande fixture-klasser för SIE4 import och export

- `SIE-FXT-001` single-year full voucher export
- `SIE-FXT-002` full voucher export with dimensions
- `SIE-FXT-003` multi-year export with balances
- `SIE-FXT-004` import with duplicate voucher ids
- `SIE-FXT-005` import with unknown account
- `SIE-FXT-006` import with wrong file type
- `SIE-FXT-007` import with `#RTRANS/#BTRANS`
- `SIE-FXT-008` roundtrip parity fixture

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- input file or snapshot
- expected post types
- expected import issues or none
- expected commit verdict
- expected reconciliation verdict
- expected downstream effect on canonical vouchers or none

## Bindande canonical verifikationsseriepolicy

- `A`- eller annan serieetikett får inte uppfinnas av SIE-lagret.
- Seriepolicy kommer från ledger truth.
- Om source import saknar kompatibel seriepolicy ska import skapa external-source ref och review, inte auto-rewrite.

## Bindande expected outcome per central scenariofamilj

- `SIE-A001`
  - export verdict: pass
  - required posts: `#SIETYP 4`, `#FORMAT PC8`, `#ORGNR`, `#FNAMN`, `#RAR`, `#KONTO`, `#VER`, `#TRANS`, `#UB`
- `SIE-B001`
  - import verdict: ready_to_commit if all mappings resolve
  - downstream: canonical migration vouchers + evidence
- `SIE-B002`
  - import verdict: blocked
  - reason: `SIE-R003`
- `SIE-B003`
  - import verdict: review_required or blocked
  - reason: `SIE-R005`
- `SIE-C001`
  - evidence verdict: passed only if voucher count, amounts and balances reconcile exactly

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SIE-A001` -> `SIE-P0001,P0002,P0003,P0004` -> export pass
- `SIE-A002` -> `SIE-P0005` -> export pass
- `SIE-B001` -> `SIE-P0006,P0008,P0009` -> import ready_to_commit
- `SIE-B002` -> `SIE-P0007` -> blocked duplicate voucher identity
- `SIE-B003` -> `SIE-P0008` -> blocked/review unknown account
- `SIE-B004` -> `SIE-P0006,P0008` -> blocked unsupported correction profile
- `SIE-C001` -> `SIE-P0010` -> reconciliation pass/fail
- `SIE-C002` -> `SIE-P0010` -> import parity pass/fail

## Bindande testkrav

- golden export test för single-year voucher file
- golden export test för dimensions/object file
- parser test för all mandatory post types
- import blocker test för wrong `#SIETYP`
- import blocker test för duplicate `(rar, serie, vernr)`
- import blocker test för unknown account
- import review test för unmapped dimensions
- roundtrip export parity test
- import-to-ledger parity test
- multi-year `#RAR/#IB/#UB/#RES` consistency test

## Källor som styr dokumentet

- SIE-Gruppen: [SIE filformat - Utgåva 4C](https://sie.se/wp-content/uploads/2026/02/SIE_filformat_ver_4C_2025-08-06.pdf)
- Riksdagen: [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- BAS: [Kontoplaner för 2026](https://www.bas.se/kontoplaner/)
- BAS: [Ändringar i kontoplanen 2026](https://www.bas.se/2025/12/04/andringar-i-kontoplanen-2026/)
