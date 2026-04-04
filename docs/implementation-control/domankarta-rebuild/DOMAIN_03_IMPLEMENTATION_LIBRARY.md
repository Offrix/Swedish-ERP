# DOMAIN_03_IMPLEMENTATION_LIBRARY

## mål

- Definiera exakt hur den bokföringsrättsliga kärnan ska byggas för att bli svensk produktionssanning.
- Spegla roadmapens delfaser i konkret modell, lagring, state, commands, invariants, export och beviskrav.
- Ta bort all möjlighet att blanda ihop teknisk ledgermotor med juridiskt korrekt bokföringskärna.

`DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för alla delar av Domän 3 som rör dimensionstyper, objekttyper, obligatoriska dimensionsregler, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust.

## legal-form model

### ansvar

- Bära företagsform, giltighetsintervall, reporting-obligation profile, signatory class, filing package family och close-template-scope.
- Avgöra vilka close-, annual- och exportkrav som gäller för ett datum och ett räkenskapsår.

### källobjekt

- `LegalFormProfile`
- `ReportingObligationProfile`
- `LegalAccountingContext`

### tillstånd och övergångar

- `planned -> active -> historical`
- Aktiv profil får bara supersedas för framtida datum.
- Historisk profil får inte muteras in place.

### commands

- `registerLegalFormProfile`
- `activateLegalFormProfile`
- `supersedeLegalFormProfile`
- `resolveLegalAccountingContext`

### invariants

- Aktiv legal form måste finnas för varje bokföringsnära datum.
- Fiscal-year-end-close får inte använda fallback-template.
- Aktiv reporting-obligation-profile måste vara resolvad innan close, annual package och filingnära export.
- Legal form för stängt år får bara ändras via separat correction chain med nytt evidencepaket.

### lagring

- Historiserad och append-only profilkedja per bolag.
- Explicit bindning mellan profile och fiscal-year-id.
- Egen checksum/fingerprint för `LegalAccountingContext`.

## fiscal-year model

### ansvar

- Bära fiscal-year-profile, faktiskt räkenskapsår, perioder, change requests, aktiveringskedja och reopen-information.

### källobjekt

- `FiscalYearProfile`
- `FiscalYear`
- `AccountingPeriod`
- `FiscalYearChangeRequest`

### state machine

- `FiscalYearProfile`: `draft -> approved -> active -> superseded`
- `FiscalYear`: `planned -> active -> closing -> closed -> historical`
- `AccountingPeriod`: `open -> soft_locked -> hard_locked -> reopened -> hard_locked`
- `FiscalYearChangeRequest`: `draft -> submitted -> review_pending -> approved | rejected | expired`

### commands

- `submitFiscalYearChangeRequest`
- `approveFiscalYearChangeRequest`
- `activateFiscalYear`
- `lockAccountingPeriod`
- `reopenAccountingPeriod`

### invariants

- Inga överlappande räkenskapsår.
- Inga överlappande perioder.
- Aktivering av nytt år kräver verifierad kedja från föregående år.
- Omläggning ska följa legality-matris och kräva tillstånd/evidens där lagen kräver det.
- Reopen ska bara vara tillåten via correction-case.

### lagring

- Separata rows för profile, year, periods och change requests.
- `activated_by`, `activated_at`, `approval_basis`, `permit_reference`, `impact_hash`.

## accounting-method model

### ansvar

- Styra om bolaget använder kontantmetod eller faktureringsmetod.
- Bära eligibility assessment, method profile, method change request och year-end catch-up runs.

### källobjekt

- `AccountingMethodEligibilityAssessment`
- `AccountingMethodProfile`
- `AccountingMethodChangeRequest`
- `AccountingMethodYearEndCatchUpRun`

### state machine

- `EligibilityAssessment`: `draft -> completed -> expired`
- `MethodProfile`: `planned -> active -> historical`
- `MethodChangeRequest`: `draft -> submitted -> approved | rejected | superseded`
- `CatchUpRun`: `planned -> running -> completed | failed | reversed`

### commands

- `completeAccountingMethodEligibilityAssessment`
- `submitAccountingMethodChangeRequest`
- `approveAccountingMethodChangeRequest`
- `runAccountingMethodYearEndCatchUp`
- `reverseAccountingMethodYearEndCatchUp`

### invariants

- Exakt en aktiv metod per bokföringsdatum.
- Metodbyte normalt bara vid räkenskapsårsgräns.
- Catch-up får bara köras när aktiv metod är kontantmetod.
- Catch-up-underlag får inte komma från request-body; det måste materialiseras från låsta subledgers.

### lagring

- Assessment och method profile ska vara egna rows med evidence refs.
- Catch-up-run ska lagra subledger snapshot hash, included item ids, journal entry id och vat decision ids.

## change-legality matrix model

### ansvar

- Besvara om en mutation är tillåten, varför, med vilken evidens och vilken approver-klass som krävs.

### modellfält

- `ruleId`
- `entityType`
- `requestedMutation`
- `currentState`
- `legalFormCode`
- `fiscalYearKind`
- `accountingMethodCode`
- `closeState`
- `allowed`
- `requiredEvidence`
- `requiredApprovalClass`
- `blockerReasonCode`
- `officialSourceRef`

### runtimekrav

- Samma matris måste köras från API, batch, import, worker och intern runtime.
- Alla blockerbeslut måste logga `ruleId`.
- Alla tillåtna beslut måste logga `ruleId`, `actor`, `evidenceRefs`, `approvalClass`.

## BAS/account-catalog governance model

### ansvar

- Styra vilka konton som är tillåtna, hur de klassas, vilken officiell källa eller intern derivatkedja de kommer från och hur förändringar godkänns.

### källobjekt

- `ChartCatalogVersion`
- `ChartCatalogEntry`
- `ChartCatalogDiff`
- `ChartOverride`

### invariants

- Varje journalrad måste bära `catalogVersionId`.
- Konto får inte byta konto-klass efter användning.
- Dimensionkrav måste vara lika i runtime och DB.
- Lokala overrides måste vara explicit märkta och spårbara.

### lagring

- Versionskedja med `sourceType`, `sourceReference`, `checksum`, `diffFromPrevious`, `publishedBy`, `approvedBy`.

## voucher/journal/series model

### ansvar

- Bära voucher series, voucher sequence, journal entry, journal lines, approvals, correction links och evidence refs.

### källobjekt

- `VoucherSeries`
- `VoucherSequenceReservation`
- `JournalEntry`
- `JournalLine`
- `JournalCorrectionLink`

### state machine

- `JournalEntry`: `draft -> approved_for_post -> posted -> reversed`
- `VoucherSeries`: `planned -> active -> frozen -> historical`

### commands

- `createJournalEntry`
- `approveJournalEntryForPost`
- `postJournalEntry`
- `reverseJournalEntry`
- `correctJournalEntry`
- `registerVoucherSeries`
- `freezeVoucherSeriesPolicy`

### invariants

- Vouchernummer reserveras exakt en gång.
- Ordinarie nummerserie får aldrig återanvända eller hoppa bakåt i sekvens.
- Postad journal får aldrig skrivas över.
- Correction och reversal ska länka till originalet.
- Approvalklass ska bestämmas av source type, belopp, periodstatus och correction-scope.

### lagring

- `VoucherSequenceReservation` som append-only tabell.
- `JournalEntry` och `JournalLine` separerade från sequence ledger.
- Hash/fingerprint per postad journal.

## immutability/renumbering prevention model

### förbud

- Ingen mutation av `nextNumber`, `locked`, `status` eller importsekvenspolicy efter första postade användning.
- Ingen hard delete av postade journaler, journalrader, exportartefakter, legal-form-snapshots eller fiscal-year-snapshots.
- Ingen snapshot-import i protected/live för Domän 3-objekt.

### tekniska krav

- DB-trigger eller checkpolicy som blockerar efterhandsmutation av nummerserier.
- Canonical repository för Domän 3 ska inte exponera delete.
- Snapshot-import ska vara offline-recovery-only och kräva break-glass utanför normal runtime.

## posting-kernel invariants

- Minst två rader per journal.
- Exakt debet = kredit.
- Varje rad är enkelriktad.
- Datum måste ligga i aktivt räkenskapsår och tillåten period.
- Aktiv legal form, fiscal year och accounting method måste vara resolvade före postning.
- Obligatoriska dimensioner måste vara uppfyllda.
- Source type, source id, description, actor, approval chain och evidence refs måste finnas före postning.

## period-lock/close/reopen/year-end model

### källobjekt

- `PeriodLockRecord`
- `ClosePackage`
- `CloseSignOff`
- `ReopenCaseLink`
- `YearEndExecution`

### state machine

- `ClosePackage`: `draft -> blocked -> ready_for_signoff -> signed_off -> executed -> superseded`
- `YearEndExecution`: `planned -> running -> completed | failed | invalidated`

### commands

- `buildClosePackage`
- `signClosePackage`
- `executeYearEndClose`
- `reopenClosedPeriod`
- `invalidateCloseArtifacts`

### invariants

- Close package måste hämta template från `LegalAccountingContext`.
- Reopen måste skapa invalidation av berörda close/year-end/export-artefakter.
- Ny postning i hard-locked period får bara ske via reopen-chain.

## opening-balance/result-transfer model

### källobjekt

- `OpeningBalanceBatch`
- `ResultTransferBatch`
- `RetainedEarningsTransferBatch`

### invariants

- Exakt en aktiv opening-balance-batch per räkenskapsår.
- Result transfer måste ske före retained earnings-transfer.
- Nytt räkenskapsår får inte aktiveras innan opening-balance-batchen är verifierad.

### bevis

- balansunderlag
- close artifact hash
- source journal set
- approval chain

## depreciation-method governance model

### källobjekt

- `DepreciationMethodProfile`
- `DepreciationEligibilityRule`
- `DepreciationMethodChangeRequest`

### invariants

- Endast explicit publicerade metoder får användas.
- Metodbyte kräver defined transition rule.
- Retroaktiv omräkning utan correction chain är förbjuden.

## depreciation/accrual model

### källobjekt

- `DepreciationSchedule`
- `DepreciationBatch`
- `AccrualSchedule`
- `AccrualBatch`

### invariants

- Batchar ska vara idempotenta.
- Varje batch ska peka på source object ids, metodkod, period och journal entry id.
- Reversal skapar ny batch och nytt journalspår.

## main-ledger/verification-list/export-package model

### källobjekt

- `ExportArtifact`
- `GeneralLedgerArtifact`
- `VerificationListArtifact`
- `AuditExportArtifact`

### invariants

- Samma scope ska ge samma artifact hash.
- Artefakten ska lagra included journal ids, sorteringsregel, generatedAt, generatedBy och checksumma.
- Artefakten får inte ändras efter skapande.

### commands

- `buildGeneralLedgerArtifact`
- `buildVerificationListArtifact`
- `buildAuditExportArtifact`

## SIE import/export model

### export

- Ska skriva:
  - `#FLAGGA`
  - `#PROGRAM`
  - `#FORMAT`
  - `#GEN`
  - `#SIETYP 4`
  - `#FNAMN`
  - `#ORGNR`
  - `#RAR`
  - `#KONTO`
  - `#IB`
  - `#VER`
  - `#TRANS` med verklig objektlista, inte tom `{}` när dimensioner finns

### import

- Ska stödja:
  - opening-balance mode
  - journal-history mode
  - explicit kontoetableringspolicy
  - scope-binding till exakt räkenskapsår

### källobjekt

- `SieExportJob`
- `SieImportJob`
- `SieRoundtripEvidence`

### invariants

- Exportscope måste bära fiscal-year-id eller härledd scope-hash.
- Import får inte skapa konton utan explicit policybeslut.
- Roundtrip-evidence måste kunna visa att objekt/dimensioner bevarades.

## retention/archive/delete model

### källobjekt

- `RetentionClass`
- `LegalHoldRecord`
- `ArchiveArtifact`
- `DeleteDenyRule`

### invariants

- Bokföringskritiska objekt får inte ha fysisk delete-väg i normal runtime.
- `ON DELETE CASCADE` är förbjudet på bokföringsmaterialkedjor.
- Legal hold ska blockera arkivrensning och purge.
- Varje bokföringsartefakt ska bära retentionklass, hold-status och arkivstatus.

## vilka bevis som krävs innan något märks som bokföringsmässigt korrekt eller production-ready

- Grön testkedja för legal form, fiscal year, accounting method, close, voucherserier, export och SIE.
- Officiell källverifiering mot BFL, BFN, Skatteverket, BAS och SIE-Gruppen.
- Ingen generisk snapshot-import i protected/live för Domän 3.
- Ingen generisk delete eller kaskadradering i bokföringskritisk kedja.
- Immuta huvudboks- och verifikationsartefakter med hash.
- Full SIE4-roundtrip med objekt/dimensioner.

## vilka risker som kräver mänsklig flaggning

- Omläggning av räkenskapsår som kräver tillstånd eller oklart tillståndsläge.
- Legal form-korrigering som påverkar redan stängt eller filat år.
- Metodbyte där eligibility eller skattekonsekvens är oklar.
- Historisk import som kräver kontoetablering utanför fast policy.
- Reopen av stängd period nära filing, momsrapport, årsbokslut eller årsskifte.
- Arkiv-/retentionsfrågor där flera lagringsformer eller externa arkiv gäller samtidigt.
