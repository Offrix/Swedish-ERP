# DOMAIN_08_ROADMAP

## Mål

Fas 8 ska göra HR-, employment-, time-, absence-, balance- och people-migration-kedjan till en enda payroll-bar, auditbar och juridiskt försvarbar personalsanning. Efter fasen får payroll, AGI, final pay, vacation debt, migration cutover och support inte längre bygga på tunna snapshots, generiska bankkonton, olåsta approved sets eller generell balanceslogik som ser svensk ut men inte är det.

## Varför domänen behövs

Om Domän 8 är fel blir allt efterföljande fel:
- lön
- sjuklön
- semester
- slutlön
- semesterlöneskuld
- AGI
- migration
- payout
- support
- audit

Domänen måste därför bära den verkliga personalsanningen, inte bara ge HR-liknande CRUD.

## Dependencies

- Fas 0 måste redan ha degraderat gamla docs, gamla runbooks och gamla sanningar.
- Fas 1 måste ha låst primär truth, persistens och transaktionsgränser.
- Fas 2 måste ha låst read-audit, masking, high-risk permissions och security boundaries.
- Fas 7 måste ha låst dokument- och evidenskedjor för avtal, addenda, frånvarounderlag och export.
- Payrolls snapshot- och consumer-paths i senare faser får inte härda fel modell; Domän 8 måste därför fixas före bred payroll/live-härdning.

## Vad som får köras parallellt

- `8.4` och `8.5` får köras parallellt först när `8.1-8.3` har låst `EmploymentTruth`.
- `8.7` och `8.8` får köras parallellt först när owner-modellen i `8.1` är låst.
- `8.10` får byggas parallellt med `8.11` först när `8.4-8.9` har definierat sina canonical refs.

## Vad som inte får köras parallellt

- `8.2` och `8.6` får inte frikopplas; termination och final freeze måste byggas på samma lifecyclemodell som kontrakten.
- `8.10` får inte slutföras innan `8.4`, `8.5`, `8.7` och `8.8` har låst approved/locked truth.
- `8.11` får inte gå live före `8.1-8.10`; migration får inte bli en genväg runt personalsanningen.
- `8.12` får inte skjutas till slutet; read-audit och masking måste byggas samtidigt med de känsliga modellerna.

## Fas 8

### Delfas 8.1 Employee-master and employment-scope hardening
- status: `rewrite`
- dependencies:
  - Fas 1 source-of-truth
  - Fas 2 permission/read-audit-bas
- bygg:
  - inför `Employee` som person- och aliasobjekt
  - inför `EmploymentTruth` som separat first-class objekt
  - gör `legalEmployerId`, `employmentStatus`, `payrollEligibility`, `orgUnitId`, `workplaceId`, `managerChainRef`, `validFrom`, `validTo`, `supersedesRef` obligatoriska
  - inför `LegalConcurrencyProfile` som enda tillåtna väg för samtidiga employments
  - byt ut `readyForPayrollInputs` mot blockerande `employmentTruthStatus`
- dokument och filer:
  - `keep`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `packages/db/migrations/20260321170000_phase7_hr_master.sql`
  - `rewrite`: `tests/unit/hr-phase7-1.test.mjs`
  - `archive`: `docs/runbooks/fas-7-hr-master-verification.md`
- exit gate:
  - exakt en aktiv `EmploymentTruth` per employee när concurrency profile saknas
  - tillåten samtidighet måste kunna förklaras med explicit concurrency profile
- konkreta verifikationer:
  - skapa två överlappande employments utan concurrency profile och verifiera hårt blockerad command
  - skapa två samtidiga employments med explicit legal concurrency profile och verifiera att båda har separata `employmentId`, `legalEmployerId`, `payrollEligibility` och payout instructions
  - läs `employmentTruthStatus` och verifiera att den visar blockerande skäl i stället för kosmetisk completeness
- konkreta tester:
  - unit: overlap deny/allow med datum, legal employer och profile
  - integration: `/v1/hr/employments` returnerar `blockingCodes[]`
  - integration: people-time-base blockerar employee utan komplett `EmploymentTruth`
- konkreta kontroller vi måste kunna utföra:
  - spåra varje aktiv anställning till exakt employee, legal employer, workplace och status
  - bevisa varför samtidighet är tillåten eller blockerad

### Delfas 8.2 Employment-contract/addendum/lifecycle hardening
- status: `rewrite`
- dependencies:
  - `8.1`
- bygg:
  - inför `EmploymentContract`
  - inför `EmploymentAddendum`
  - inför `EmploymentLifecycleEvent`
  - inför explicit commands för `start`, `extend`, `supersede`, `terminate`, `reopen`, `retroactively_amend`
  - knyt signed document refs och evidence refs till varje lifecycle-event
  - bind kontrakt och addenda till legal employer och employment truth
- dokument och filer:
  - `rewrite`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `tests/integration/phase7-hr-master-api.test.mjs`
  - `archive`: `docs/runbooks/fas-7-hr-master-verification.md`
  - `rewrite`: `docs/runbooks/hr-masterdata-cutover.md`
- exit gate:
  - inga kontraktsändringar får ske utan ny version, nytt lifecycle-event och audit receipt
  - retroaktiv ändring efter freeze måste skapa correction lane
- konkreta verifikationer:
  - skapa kontrakt, addendum och supersession och verifiera att gammelversioner förblir läsbara men icke-muterbara
  - försök ändra kontrakt bakåt i tiden efter payroll freeze och verifiera blocker eller required correction-case
- konkreta tester:
  - unit: lifecycle state transitions
  - integration: retroactive amendment skapar review-item
  - integration: termination-path kan inte göras genom direkt update av contract row
- konkreta kontroller vi måste kunna utföra:
  - visa full avtalshistorik per employment
  - visa vilken version som gällde ett visst datum

### Delfas 8.3 Placement/salary-basis/manager/payout-account hardening
- status: `rewrite`
- dependencies:
  - `8.1`
  - `8.2`
- bygg:
  - inför `EmploymentPlacement`
  - inför `SalaryBasisDecision`
  - inför effective-dated `ManagerAssignmentGraph`
  - ersätt employee-owned bankkonto med `EmploymentPayoutInstruction`
  - inför effect-date, activation window, cutoff guard, step-up, notifiering och dual control nära payout cutoff
- dokument och filer:
  - `rewrite`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `packages/db/migrations/20260321170000_phase7_hr_master.sql`
  - `rewrite`: `apps/api/src/server.mjs`
  - `archive`: `docs/runbooks/fas-7-hr-master-verification.md`
- exit gate:
  - en employment får ha högst en aktiv payout instruction per payout date
  - managerkedjan måste vara deterministisk för varje historiskt datum
- konkreta verifikationer:
  - lägg nytt payout account samma dag som lönekörningscutoff och verifiera blocker eller framtidsdaterad aktivering
  - skapa retroaktiv managerändring och verifiera att samma historiska datum alltid löser samma attestkedja
  - läs full bankdetalj och verifiera read-audit receipt
- konkreta tester:
  - unit: payout activation window
  - unit: manager cycle detection med effective-dated edges
  - integration: bankkonto-read kräver high-risk read boundary
- konkreta kontroller vi måste kunna utföra:
  - visa aktiv payout instruction för en viss pay date
  - visa vilken chef som var attestansvarig ett visst datum

### Delfas 8.4 Time-entry/schedule/night-shift/DST/approved-set/period-lock hardening
- status: `rewrite`
- dependencies:
  - `8.1`
  - `8.3`
- bygg:
  - separera rå tid från payroll-klar tid
  - inför first-class `ApprovedTimeSet`
  - inför first-class `ApprovedTimeSetLock`
  - blockera schedule overlaps eller inför explicit supersession-policy
  - modellera nattpass, lokal tidszon, dygnsgräns och DST explicit
  - gör `approvalMode` policy-driven och aldrig tyst default-auto i högriskfall
- dokument och filer:
  - `rewrite`: `packages/domain-time/src/index.mjs`
  - `rewrite`: `packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql`
  - `rewrite`: `tests/unit/time-phase7-2.test.mjs`
  - `archive`: `docs/runbooks/fas-7-time-reporting-verification.md`
- exit gate:
  - payroll får bara läsa `ApprovedTimeSet.lockState = locked`
  - cross-midnight- och DST-pass ger korrekt dag- och periodfördelning
- konkreta verifikationer:
  - kör pass över DST-framåt och DST-bakåt och verifiera korrekt minut- och dagssplit
  - kör nattpass över midnatt och verifiera korrekt partitionering i lokal zon
  - försök läsa olåst approved set i payroll snapshot och verifiera blocker
- konkreta tester:
  - unit: DST vectors
  - unit: cross-midnight shift vectors
  - integration: payroll snapshot avvisar olåsta set
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilka time lines som ingår i ett approved och låst payroll-set
  - visa vilken local timezone-beräkning som användes

### Delfas 8.5 Absence/leave-signal/correction/reopen/portal hardening
- status: `rewrite`
- dependencies:
  - `8.1`
  - `8.4`
- bygg:
  - inför `AbsenceRequest`, `AbsenceDecision`, `LeaveSignalLock`, `AbsenceCorrectionCase`
  - separera portalrequest från payroll-klar frånvarosanning
  - inför overlap-engine mellan leave och time
  - gör correction/reopen versionerad och review-styrd
  - bind sjukfrånvaro, karens och payroll-impact till canonical absence decision, inte portalhändelse
- dokument och filer:
  - `rewrite`: `packages/domain-time/src/index.mjs`
  - `rewrite`: `packages/db/migrations/20260321190000_phase7_absence_portal.sql`
  - `rewrite`: `tests/unit/time-phase7-3.test.mjs`
  - `rewrite`: `tests/integration/phase7-absence-api.test.mjs`
  - `archive`: `docs/runbooks/fas-7-absence-portal-verification.md`
- exit gate:
  - portal får aldrig skapa slutlig payroll truth direkt
  - låst frånvaro måste korrigeras via ny version, inte overwrite
- konkreta verifikationer:
  - skapa portalfrånvaro utan attest och verifiera att payroll snapshot blockerar
  - försök överlappa leave mot godkänd time entry och verifiera blocker
  - reopen låst frånvaro och verifiera ny version samt correction receipt
- konkreta tester:
  - unit: overlap deny mellan leave och time
  - unit: reopen skapar version 2, inte mutation av version 1
  - integration: portal request får status `requested`, inte `payroll_ready`
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilken absence decision payroll konsumerade
  - visa kopplad correction chain när frånvaro ändrats efter lock

### Delfas 8.6 Termination/final-period/final-freeze hardening
- status: `rewrite`
- dependencies:
  - `8.2`
  - `8.4`
  - `8.5`
- bygg:
  - inför `TerminationDecision`
  - inför `FinalPeriodPolicy`
  - inför `FinalFreezeRecord`
  - definiera sista attestbara period, sista frånvaroperiod, sista payout instruction och tillåten post-termination correction
  - bind final freeze till final pay-input och semesteravslut
- dokument och filer:
  - `rewrite`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `packages/domain-time/src/index.mjs`
  - `rewrite`: `packages/domain-payroll/src/index.mjs`
  - `rewrite`: `docs/runbooks/hr-time-cutover.md`
- exit gate:
  - avslutad anställning får inte återöppnas implicit av ny placement, salary basis eller leave-entry
  - sena ändringar efter final freeze måste gå via correction lane
- konkreta verifikationer:
  - terminera employment och verifiera sista godkända time- och leave-period
  - försök skapa ny time entry efter final freeze och verifiera blocker
  - försök skapa retroaktiv absence i avslutad period och verifiera correction case i stället för direkt mutation
- konkreta tester:
  - unit: termination timeline
  - unit: final freeze deny-path
  - integration: final pay snapshot blockar ofrusen slutperiod
- konkreta kontroller vi måste kunna utföra:
  - visa kedjan `TerminationDecision -> FinalPeriodPolicy -> FinalFreezeRecord`
  - visa exakt vilka sena ändringar som tillåts eller förbjuds

### Delfas 8.7 Balance-type/account/vacation-profile hardening
- status: `rewrite`
- dependencies:
  - `8.1`
  - `8.6`
- bygg:
  - lås balance owner till employee eller employment där det faktiskt gäller
  - inför svensk `VacationProfile`
  - separera paid, unpaid, saveable, saved, expiring och taken-days semantics
  - gör balances till sann källa för dagar och saldo, inte för löneeffekt
- dokument och filer:
  - `rewrite`: `packages/domain-balances/src/engine.mjs`
  - `rewrite`: `packages/db/migrations/20260324160000_phase17_balances.sql`
  - `rewrite`: `tests/unit/phase17-balances.test.mjs`
  - `archive`: `docs/runbooks/fas-10-3-vacation-balances-verification.md`
- exit gate:
  - två employments för samma employee delar inte vacation-saldo oavsiktligt
  - varje vacationrad kan härledas till owner, source event och profile version
- konkreta verifikationer:
  - skapa två employments för samma employee och verifiera att vacation accounts hålls isär
  - skapa ny vacation profile-version och verifiera att historiska close-runs inte muteras
- konkreta tester:
  - unit: owner separation
  - unit: vacation profile resolution
  - integration: people-time-base visar rätt ownerbundet vacationsaldo
- konkreta kontroller vi måste kunna utföra:
  - visa vacationsaldo per employment och profile
  - visa vilket source event som skapade varje förändring

### Delfas 8.8 Carry-forward/expiry/vacation-year-close hardening
- status: `rewrite`
- dependencies:
  - `8.7`
- bygg:
  - skriv om year-close-logiken enligt svensk semesterlag
  - inför `VacationYearCloseRun`
  - inför `CarryForwardDecision`
  - inför `ExpiryDecision`
  - gör close-run idempotent och evidence-bunden
- dokument och filer:
  - `rewrite`: `packages/domain-balances/src/engine.mjs`
  - `rewrite`: `tests/unit/phase17-balances.test.mjs`
  - `archive`: `docs/runbooks/fas-10-3-vacation-balances-verification.md`
  - `rewrite`: ny runbook för `vacation-year-close-and-balance-repair`
- exit gate:
  - close-run får inte förstöra uttagsgolv eller laglig spardagslogik
  - samma close-run för samma employment/profile/year är idempotent
- konkreta verifikationer:
  - kör year close med 25, 20, 18 och 30 dagar och verifiera att rätt mängd kan sparas respektive måste tas ut
  - kör same-year close-run två gånger och verifiera oförändrat resultat ändra gången
- konkreta tester:
  - unit: 20-dagarsgolv
  - unit: saved days expiry
  - integration: close-run receipt och replay guard
- konkreta kontroller vi måste kunna utföra:
  - diffa före/efter year close per employment
  - visa exakt vilka dagar som blev uttagsbara, sparade, expirerade eller blockerade

### Delfas 8.9 Identity-merge/split/immutable-employment hardening
- status: `rewrite`
- dependencies:
  - `8.1`
  - `8.7`
- bygg:
  - inför `EmployeeAlias`
  - inför `IdentityMergeDecision`
  - inför `IdentitySplitDecision`
  - gör `employmentId` och historiska refs immutabla över merge/split
  - förbjud tysta owner-byten för bankkonto, leave history, balances och snapshots vid merge
- dokument och filer:
  - `rewrite`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `tests/unit/hr-phase7-1.test.mjs`
  - `rewrite`: framtida people-merge runbook
- exit gate:
  - merge/split får inte kunna ske utan explicit decision, approval och lineage
  - gamla employmentId:n måste förbli adresserbara efter merge
- konkreta verifikationer:
  - merge två employees och verifiera att gamla snapshotrefs fortfarande pekar på samma employment truth
  - försök split utan explicit decision och verifiera hårt block
- konkreta tester:
  - unit: alias graph och immutable employment refs
  - integration: historical reads via alias ger samma anställningskedja
- konkreta kontroller vi måste kunna utföra:
  - visa merge lineage
  - visa exakt vilka objekt som flyttades, inte flyttades eller blockerades

### Delfas 8.10 Payroll-input snapshot/people-time-base hardening
- status: `rewrite`
- dependencies:
  - `8.4`
  - `8.5`
  - `8.7`
  - `8.8`
  - `8.9`
- bygg:
  - gör `PayrollInputSnapshot` till explicit composite artifact över locked HR/time/absence/balance truth
  - gör `PeopleTimeBase` till read-model, aldrig source of truth
  - bind snapshot till versionerade refs för agreements, balances, absence decisions, approved time sets och employment truth
  - blockera fallback till tunn HR/time-bas i protected/live
- dokument och filer:
  - `rewrite`: `packages/domain-time/src/index.mjs`
  - `rewrite`: `packages/domain-payroll/src/index.mjs`
  - `rewrite`: `tests/unit/phase11-payroll-input-snapshots.test.mjs`
  - `rewrite`: `tests/unit/phase20-people-time-base.test.mjs`
  - `archive`: `docs/runbooks/payroll-input-snapshots-verification.md`
- exit gate:
  - samma locked inputs ger samma snapshot hash
  - olåst input eller fallback-path blockerar snapshot-finalisering
- konkreta verifikationer:
  - generera snapshot två gånger från samma locked refs och verifiera identisk hash
  - mutera upstream efter freeze och verifiera att gammal snapshot ligger kvar orörd och att ny version krävs
- konkreta tester:
  - unit: fingerprint stability
  - integration: payroll snapshot kräver locked refs
  - integration: people-time-base markerar blockerad state när HR truth saknas
- konkreta kontroller vi måste kunna utföra:
  - visa alla refs som ingår i ett snapshot
  - visa varför ett snapshot blockerats

### Delfas 8.11 People migration intake/diff/cutover hardening
- status: `rewrite`
- dependencies:
  - `8.1-8.10`
- bygg:
  - inför `PeopleMigrationBatch`
  - inför `EmployeeMigrationSnapshot`
  - inför `EmploymentMigrationSnapshot`
  - inför entity-aware diff per employee, employment, balance type, YTD source, absence source och time source
  - bind cutover-gate till canonical diff-set och signoff
- dokument och filer:
  - `rewrite`: `packages/domain-core/src/migration.mjs`
  - `rewrite`: `tests/unit/phase19-payroll-migration.test.mjs`
  - `rewrite`: `tests/integration/phase19-payroll-migration-api.test.mjs`
  - `rewrite`: `tests/e2e/phase19-payroll-migration-flow.test.mjs`
  - `archive`: `docs/runbooks/payroll-migration-cutover.md`
  - `archive`: `docs/runbooks/fas-14-migration-go-live-verification.md`
  - `rewrite`: `docs/runbooks/hr-masterdata-cutover.md`
  - `rewrite`: `docs/runbooks/hr-time-cutover.md`
  - `rewrite`: `docs/runbooks/migration-cutover.md`
  - `rewrite`: `docs/runbooks/migration-cutover-concierge.md`
  - `rewrite`: `docs/runbooks/pilot-migration-and-cutover.md`
- exit gate:
  - första live pay run blockeras av varje öppen people-diff
  - finalize och execute får inte ske utan canonical people signoff
- konkreta verifikationer:
  - skapa migration med öppen diff på ett employment och verifiera blockerad cutover
  - skapa migration med oklar legal employer och verifiera blockerad import
  - skapa migration med bara totalskillnad noll men personskillnad kvar och verifiera att entity-aware diff fortfarande blockerar
- konkreta tester:
  - unit: entity-aware diff vectors
  - integration: cutover blocker receipts
  - e2e: payroll migration flow stannar på öppen people-diff
- konkreta kontroller vi måste kunna utföra:
  - visa diff per employee och per employment
  - visa exakt vilken signoff-chain som godkände ett people cutover

### Delfas 8.12 Security/privacy/masked-support/read-audit hardening
- status: `rewrite`
- dependencies:
  - `8.1-8.11`
  - Fas 2 security baseline
- bygg:
  - inför masked-by-default projections för HR/payrollnära read paths
  - inför explicit reveal workflow med reason code, step-up, TTL, watermark och read receipt
  - inför high-risk route classes för bankkonto, payout, legal employer, payroll eligibility, frånvaro- och sjukfrånvarodetaljer
  - inför full read-audit för känsliga reads
  - klassificera och arkivera gamla runbooks som påstår säkra HR-reads utan verklig boundary
- dokument och filer:
  - `rewrite`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `apps/api/src/server.mjs`
  - `rewrite`: `apps/api/src/platform-method-intents.mjs`
  - `rewrite`: `apps/api/src/route-contracts.mjs`
  - `archive`: `docs/runbooks/fas-7-hr-master-verification.md`
  - `archive`: `docs/runbooks/fas-7-absence-portal-verification.md`
  - `rewrite`: ny runbook för `hr-sensitive-read-and-reveal`
- exit gate:
  - känslig HR-data får inte kunna läsas utan auditspår
  - support-vy ska vara maskad som default
- konkreta verifikationer:
  - läs bankkonto i elevated path och verifiera `reasonCode`, `stepUpRef`, `watermark` och read receipt
  - läs supportvy utan reveal och verifiera maskade identiteter och blocker codes
- konkreta tester:
  - integration: support view masking
  - integration: reveal TTL och read receipt
  - unit: route classification för high-risk HR reads
- konkreta kontroller vi måste kunna utföra:
  - visa vem som läste vad och varför
  - visa att känslig HR-data inte läcker genom vanliga operatorvyer

## Exit Gates

- [ ] `EmploymentTruth` är entydig, effective-dated och legal-employer-bunden.
- [ ] contracts och addenda är first-class och lifecycle-styrda.
- [ ] payout instructions är employment-bundna, effect-dated och step-up-styrda.
- [ ] payroll läser bara locked approved time, versionerade absence decisions och verifierade balances.
- [ ] termination och final freeze är first-class och blockerar sena mutationer utan correction lane.
- [ ] vacation profile, carry-forward, expiry och year close följer svensk semesterlogik.
- [ ] people migration diff är entity-aware och blockerar cutover vid oklara avvikelser.
- [ ] känsliga HR/payroll reads är masked-by-default och read-auditade.

## Test Gates

- [ ] overlap-vectors för employments, placements, managerkedjor och schedules
- [ ] retroaktiva HR-ändringar efter freeze
- [ ] cross-midnight-, timezone- och DST-vectors
- [ ] leave/time-overlap, reopen och correction-vectors
- [ ] termination/final-freeze-vectors
- [ ] vacation carry-forward-, expiry- och year-close-vectors
- [ ] immutable snapshot- och alias/merge-vectors
- [ ] entity-aware people migration diff- och cutover-vectors
- [ ] support masking, reveal och read-audit-vectors

## Employment-truth Gates

- [ ] `EmploymentTruth` bär `legalEmployerId`, `employmentStatus`, `payrollEligibility`, `workplaceId`, `managerChainRef` och payout instruction.
- [ ] `readyForPayrollInputs` används inte längre som sann readiness-signal.
- [ ] concurrency profile krävs för alla samtidiga employments.

## Contract/change/freeze Gates

- [ ] retroaktiva kontrakts- och scopeändringar efter freeze kräver correction lane
- [ ] lifecycle-events är enda vägen för terminate, extend och reopen
- [ ] signed document refs och evidence refs finns på varje kontraktsförändring

## Time/absence/correction Gates

- [ ] approved time set måste vara låst innan payroll-konsumtion
- [ ] leave decisions är versionerade och schemaförankrade
- [ ] portal kan inte skapa slutlig payroll truth
- [ ] correction/reopen skapar ny version och audit receipt

## Balance/vacation Gates

- [ ] balance owner är entydig
- [ ] vacation profile är svensk och versionsstyrd
- [ ] carry-forward och expiry följer lag och policy
- [ ] year close är idempotent och bevisbar

## Termination/migration Gates

- [ ] avslutad employment kan inte återaktiveras implicit
- [ ] final freeze finns och binder slutlönens input
- [ ] people cutover blockeras av varje öppen entity-aware diff

## Privacy/support-boundary Gates

- [ ] high-risk HR reads kräver step-up eller explicit elevated path
- [ ] read-audit finns för känsliga fields
- [ ] support-vyer visar maskade identiteter som default
