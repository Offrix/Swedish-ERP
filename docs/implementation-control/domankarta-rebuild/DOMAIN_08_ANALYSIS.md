# DOMAIN_08_ANALYSIS

## Scope

Denna analys bygger endast på:
- prompt `DOMÄN 8`
- faktisk repo-runtime
- faktiska tester
- faktiska migrationer och seeds
- officiella källor

Granskade kärnspår:
- `packages/domain-hr/src/index.mjs`
- `packages/domain-time/src/index.mjs`
- `packages/domain-balances/src/engine.mjs`
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-core/src/migration.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform-method-intents.mjs`
- `apps/api/src/route-contracts.mjs`
- `packages/db/migrations/20260321170000_phase7_hr_master.sql`
- `packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql`
- `packages/db/migrations/20260321190000_phase7_absence_portal.sql`
- `packages/db/migrations/20260324160000_phase17_balances.sql`
- `packages/db/migrations/20260322210000_phase14_migration_cockpit.sql`
- relevanta seeds i `packages/db/seeds/`
- relevanta tester i `tests/unit/`, `tests/integration/`, `tests/e2e/`
- historiska runbooks som råmaterial under `docs/runbooks/`

Verifierade testkörningar i aktuell miljö:
- gröna unit:
  - `tests/unit/hr-phase7-1.test.mjs`
  - `tests/unit/time-phase7-2.test.mjs`
  - `tests/unit/time-phase7-3.test.mjs`
  - `tests/unit/phase17-balances.test.mjs`
  - `tests/unit/phase11-payroll-input-snapshots.test.mjs`
  - `tests/unit/phase20-people-time-base.test.mjs`
  - `tests/unit/phase19-payroll-migration.test.mjs`
- gröna integration:
  - `tests/integration/phase7-hr-master-api.test.mjs`
  - `tests/integration/phase7-time-api.test.mjs`
  - `tests/integration/phase7-absence-api.test.mjs`
  - `tests/integration/phase17-balances-api.test.mjs`
  - `tests/integration/phase20-people-time-base-api.test.mjs`
  - `tests/integration/phase11-payroll-input-snapshots-api.test.mjs`
  - `tests/integration/phase19-payroll-migration-api.test.mjs`
- gröna e2e:
  - `tests/e2e/phase19-payroll-migration-flow.test.mjs`

Officiella källor använda där regelriktighet måste bevisas:
- [Semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/)
- [Arbetstidslag (1982:673)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/)
- [Lag (1982:80) om anställningsskydd](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-198280-om-anstallningsskydd_sfs-1982-80/)
- [Försäkringskassan: sjuklöneförmåner, vägledning](https://www.forsakringskassan.se/download/18.7fc616c01814e179a9f6ed/1667477300013/sjukloneformaner-vagledning-2011-1.pdf)
- [IMY: vad innebär obehörig åtkomst?](https://www.imy.se/vanliga-fragor-och-svar/vad-innebar-obehorig-atkomst/)

Bedömningsregel:
- namn, comments och gamla docs räknas inte som bevis
- kod före runbooks
- runtime wiring före funktionsnamn
- gröna tester bevisar fungerande path, inte full svensk regelkorrekthet

## Verified Reality

- `verified reality` Runtime-HR blockerar överlapp för employments, placeringar, salary bases, contracts och manager assignments. Bevis: `packages/domain-hr/src/index.mjs:371-383`, `452-462`, `539-549`, `630-636`, `713-723`.
- `verified reality` HR runtime har dedupe via blind index i kod och separata projections för maskade identitets- och bankkontofält. Bevis: `packages/domain-hr/src/index.mjs:238-247`, `284-292`, `1175-1187`.
- `verified reality` Time-period locks blockerar nya time entries och clock events i låsta intervall. Bevis: `packages/domain-time/src/index.mjs:865-915`, `1842-1855`.
- `verified reality` Leave-signal locks blockerar sena leave-mutationer i låsta intervall. Bevis: `packages/domain-time/src/index.mjs:1395-1432`, `1869-1885`.
- `verified reality` Payroll-input snapshots är fingerprintade och reproducerbara när upstream-inputen inte ändras. Bevis: `packages/domain-payroll/src/index.mjs:2087-2265`; `tests/integration/phase11-payroll-input-snapshots-api.test.mjs`.
- `verified reality` Balancesmotorn har typade konton, immutabla transaktioner och idempotenta generiska close/expiry-runs. Bevis: `packages/domain-balances/src/engine.mjs:109-210`, `226-418`, `440-663`.
- `verified reality` Time base och payroll läser faktiskt vacation balance från balanceskedjan i nuvarande runtime. Bevis: `packages/domain-time/src/index.mjs:681-719`; `tests/integration/phase20-people-time-base-api.test.mjs`.
- `verified reality` Payroll migration är verklig runtime med import, validation, diff, approve och execute/rollback-paths. Bevis: `packages/domain-core/src/migration.mjs`; `tests/unit/phase19-payroll-migration.test.mjs`; `tests/e2e/phase19-payroll-migration-flow.test.mjs`.

## Partial Reality

- `partial reality` Employee master finns, men employment truth är för tunn för att vara svensk payroll-sanning. Bevis: `packages/domain-hr/src/index.mjs:146-199`, `338-420`.
- `partial reality` Approved time set finns i runtime, men är inte konsekvent samma sak som låst payroll-truth. Bevis: `packages/domain-time/src/index.mjs:551-603`, `733-840`.
- `partial reality` Absence decisions finns i runtime och konsumeras av payroll, men saknar motsvarande hållfast DB-modell och correction/reopen-lane. Bevis: `packages/domain-time/src/index.mjs:1161-1317`, `1908-1939`.
- `partial reality` Vacation balances finns som runtimeobjekt, men modellen är en generell bankmodell och inte bevisad svensk semesterårsmodell. Bevis: `packages/domain-balances/src/engine.mjs:675-733`, `835-1023`.
- `partial reality` Bankkonton maskas i listpath, men fulla detaljer kan läsas via generisk read-metod utan uttrycklig read-audit. Bevis: `packages/domain-hr/src/index.mjs:766-789`, `840-855`; `apps/api/src/platform-method-intents.mjs:653-660`.
- `partial reality` Payroll migration importerar history/snapshots, men bygger inte en full kanonisk people-truth per employee/employment/source. Bevis: `packages/domain-core/src/migration.mjs:3174-3245`, `3283-3331`.

## Legacy

- `legacy` `docs/runbooks/fas-7-hr-master-verification.md`
- `legacy` `docs/runbooks/fas-7-time-reporting-verification.md`
- `legacy` `docs/runbooks/fas-7-absence-portal-verification.md`
- `legacy` `docs/runbooks/fas-10-3-vacation-balances-verification.md`
- `legacy` `docs/runbooks/payroll-input-snapshots-verification.md`
- `legacy` `docs/runbooks/payroll-migration-cutover.md`
- `legacy` `docs/runbooks/fas-14-migration-go-live-verification.md`

De innehåller användbara spår, men de är historiska och får inte bära aktiv sanning för Domän 8.

## Dead Code

- `dead` `packages/domain-import-cases/` är inte people-truth eller HR/time migration. För Domän 8 är det ett felspår.
- `dead` gamla externa Windows-paths i promptar och historiska docs som pekar på lokala filer utanför repo:t.

## Misleading / False Completeness

- `misleading` seeds visar samtidigt överlappande employments och direktseedade time-balance-effekter som om modellen redan stödde detta säkert. Bevis: `packages/db/seeds/20260321170010_phase7_hr_master_seed.sql`, `packages/db/seeds/20260321180010_phase7_time_reporting_seed.sql`.
- `misleading` DB-lagret ger intryck av full relational truth men saknar approved time sets, absence decisions, vacation profiles och vacation year close-runs. Bevis: `packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql`, `packages/db/migrations/20260321190000_phase7_absence_portal.sql`, `packages/db/migrations/20260324160000_phase17_balances.sql`.
- `misleading` `readyForPayrollInputs` ser ut som payroll readiness men kontrollerar bara placement, salary basis och contract. Bevis: `packages/domain-hr/src/index.mjs:146-199`.
- `misleading` payroll kan konsumera approved time set även när setet inte är låst. Bevis: `packages/domain-time/src/index.mjs:551-603`, `733-840`; `packages/domain-payroll/src/index.mjs`.
- `misleading` vacation year close ser “färdig” ut men bryter mot svensk semesterlogik genom att stänga ut alla paid days och sedan bära en delmängd vidare till saved days. Bevis: `packages/domain-balances/src/engine.mjs:938-972`; Semesterlag 18-20 §§.

## Employee Master / Employment Scope Findings

### D08-001
- severity: critical
- kategori: employment_truth
- exakt problem: `createEmployment` och `getEmploymentSnapshot` saknar explicit `legalEmployerId`, `employmentStatus`, `payrollEligibility`, `workplaceId` och styrande scope-status.
- varför det är farligt: payroll, AGI, semester, pension, sjuklön och migration kan inte härleda en entydig anställningssanning.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: `146-199`, `338-420`
- rekommenderad riktning: ersätt nuvarande tunna employment-record med first-class `EmploymentTruth`.
- status: rewrite

### D08-002
- severity: critical
- kategori: overlap_governance
- exakt problem: runtime blockerar alla överlapp för employments, men modellen saknar explicit legal concurrency profile samtidigt som seed-data lägger in samtidiga employments.
- varför det är farligt: systemet kan varken uttrycka tillåtna samtidiga anställningar säkert eller stoppa förbjudna dubbelanställningar konsekvent genom hela kedjan.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `packages/db/seeds/20260321170010_phase7_hr_master_seed.sql`
- radreferens om möjligt: `371-383`; seed-rader för `EMPL0721` och `EMPL0722`
- rekommenderad riktning: inför explicit `LegalConcurrencyProfile` och bind den till runtime, DB och migration.
- status: rewrite

### D08-003
- severity: high
- kategori: identity_schema_drift
- exakt problem: runtime deduperar på blind index, men DB-indexet deduperar på maskat värde.
- varför det är farligt: runtime- och schemaregler kan glida isär vid import, replay och direkta repositoryoperationer.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `packages/db/migrations/20260321170000_phase7_hr_master.sql`
- radreferens om möjligt: `238-247`, `1175-1180`; `66-68`
- rekommenderad riktning: lagra blind index eller canonical identity record även i bindande persistence.
- status: harden

### D08-004
- severity: high
- kategori: payroll_readiness
- exakt problem: `readyForPayrollInputs` är en kosmetisk completeness-flagga i stället för blockerande readiness-status.
- varför det är farligt: downstream-domäner kan tro att HR är klar fast legal employer, status, payout-scope och freeze-policy saknas.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: `146-199`
- rekommenderad riktning: byt ut completeness mot `employmentTruthStatus`, `missingRequirements[]` och `blockingCodes[]`.
- status: harden

## Employment Contract / Addendum / Lifecycle Findings

### D08-005
- severity: high
- kategori: contract_model
- exakt problem: contract-versioner finns, men addendum, förlängning, supersession, provanställning, ändringskedja och legal employer-bindning saknas som first-class objekt.
- varför det är farligt: avtal blir metadata i stället för styrande runtime-sanning.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: `602-678`
- rekommenderad riktning: inför `EmploymentContract`, `EmploymentAddendum` och `EmploymentLifecycleEvent`.
- status: rewrite

### D08-006
- severity: critical
- kategori: retroactivity
- exakt problem: retroaktiva placement- och salary-basis-ändringar sätter bara `reviewRequired`; contracts saknar ens det.
- varför det är farligt: historik kan ändras efter freeze utan deterministisk correction-lane mot snapshots och pay runs.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: `431-507`, `518-590`, `602-678`
- rekommenderad riktning: gör retroaktiva HR-ändringar command-only, impact-previewade och review-styrda.
- status: rewrite

### D08-007
- severity: critical
- kategori: lifecycle
- exakt problem: ingen explicit lifecycle finns för start, förlängning, upphörande, återöppning eller final freeze.
- varför det är farligt: slutperiod och slutlön saknar en HR-ägd sanningskedja.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: exportsektionen `84-112`
- rekommenderad riktning: inför `TerminationDecision`, `EmploymentTerminationTimeline` och `FinalPeriodFreeze`.
- status: rewrite

## Placement / Salary Basis / Manager / Payout Account Findings

### D08-008
- severity: critical
- kategori: payout_account_ownership
- exakt problem: payout account ägs av employee i stället för employment.
- varför det är farligt: flera samtidiga anställningar eller flera legal employers kan inte ha separata säkra utbetalningsinstruktioner.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `packages/db/migrations/20260321170000_phase7_hr_master.sql`
- radreferens om möjligt: `175-178`, `757-887`; migrationsdelen för bank accounts
- rekommenderad riktning: ersätt med `EmploymentPayoutInstruction`.
- status: rewrite

### D08-009
- severity: critical
- kategori: payout_change_governance
- exakt problem: payout account-ändringar saknar step-up, delayed effect date, cutoff-policy, notifiering och dual control.
- varför det är farligt: fel konto kan aktiveras för nära lönekörning eller genom obehörig ändring.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `apps/api/src/server.mjs`
- radreferens om möjligt: `821-838`, `840-887`; bank account-routes
- rekommenderad riktning: inför effect-date-bunden payout-instruktion, step-up och read/write-audit.
- status: rewrite

### D08-010
- severity: medium
- kategori: manager_chain
- exakt problem: manager resolution och cycle-detektion bygger på senaste assignment snarare än robust effective-dated graf.
- varför det är farligt: attestkedjor kan bli olika beroende på lästidpunkt och retroaktiva ändringar.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: `689-755`, `1451-1469`
- rekommenderad riktning: bygg effective-dated manager-graph med deterministisk resolution per datum.
- status: harden

### D08-011
- severity: high
- kategori: sensitive_read_boundary
- exakt problem: känsliga bankdetaljer kan läsas via generisk read-path utan uttrycklig read-audit och utan separat high-risk boundary.
- varför det är farligt: HR- och payrollnära persondata kan läsas bredare än policyn tillåter.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `apps/api/src/platform-method-intents.mjs`
- radreferens om möjligt: `766-789`; `653-660`
- rekommenderad riktning: flytta full reveal till explicit support/reveal-path med read receipt.
- status: harden

## Time Entry / Schedule / Night Shift / DST / Approved Set / Period Lock Findings

### D08-012
- severity: high
- kategori: schedule_overlap
- exakt problem: schedule assignments kan överlappa; senaste `validFrom` vinner.
- varför det är farligt: approved time kan bli beroende av läsordning i stället för deterministisk schedule truth.
- exakt filepath: `packages/domain-time/src/index.mjs`
- radreferens om möjligt: `186-216`, `1618-1628`
- rekommenderad riktning: blockera överlapp eller inför explicit supersession-policy.
- status: rewrite

### D08-013
- severity: critical
- kategori: timezone_dst
- exakt problem: `recordClockEvent` och `weekdayFromDate` använder naiv datumlogik och UTC-beräkning.
- varför det är farligt: nattpass, DST och dygnsvila kan hamna på fel arbetsdag, fel attestperiod och fel payrollperiod.
- exakt filepath: `packages/domain-time/src/index.mjs`
- radreferens om möjligt: `228-266`, `1657-1663`, `2031-2048`
- rekommenderad riktning: gör arbetstid lokal-zon-bunden och splittra pass över dygnsgränser.
- status: rewrite

### D08-014
- severity: critical
- kategori: cross_midnight_shift
- exakt problem: time entry-modellen kräver att `startsAt` och `endsAt` ligger på samma `workDate`.
- varför det är farligt: nattarbete och skift över midnatt kan inte modelleras korrekt.
- exakt filepath: `packages/domain-time/src/index.mjs`
- radreferens om möjligt: `324-332`
- rekommenderad riktning: inför shift-span-modell med local day partitions.
- status: rewrite

### D08-015
- severity: high
- kategori: approval_default
- exakt problem: time entry API och runtime defaultar till `approvalMode = "auto"`.
- varför det är farligt: för mycket tid kan glida igenom till approved state utan rätt attestgräns.
- exakt filepath: `packages/domain-time/src/index.mjs`; `apps/api/src/server.mjs`
- radreferens om möjligt: `287-417`; `10454-10490`
- rekommenderad riktning: gör approval mode explicit per schedule/profile/policy.
- status: harden

### D08-016
- severity: critical
- kategori: schema_gap
- exakt problem: approved time sets finns i runtime men saknas i DB-schema.
- varför det är farligt: det finns ingen bindande persistensmodell för payroll-kritisk time truth.
- exakt filepath: `packages/domain-time/src/index.mjs`; `packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql`
- radreferens om möjligt: `551-603`; migrationen saknar approved-time-set-tabeller
- rekommenderad riktning: inför first-class `approved_time_sets`, `approved_time_set_lines`, `approved_time_set_locks`.
- status: rewrite

### D08-017
- severity: critical
- kategori: payroll_lock_boundary
- exakt problem: payroll-input kan byggas från approved men olåst time truth.
- varför det är farligt: pay run kan bero på data som fortfarande får ändras.
- exakt filepath: `packages/domain-time/src/index.mjs`; `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `733-840`; payroll-input read paths
- rekommenderad riktning: kräv `lockState = locked` för alla payroll-konsumerade time sets.
- status: rewrite

## Absence / Leave Signal / Correction / Reopen / Portal Findings

### D08-018
- severity: critical
- kategori: absence_overlap
- exakt problem: leave entries blockerar inte konsekvent överlapp mot annan leave eller tid.
- varför det är farligt: frånvaro och arbetstid kan dubbelräknas eller ta ut varandra fel.
- exakt filepath: `packages/domain-time/src/index.mjs`
- radreferens om möjligt: create/submit/approve leave-paths `1007-1317`
- rekommenderad riktning: inför canonical overlap-engine mellan time, leave och balances.
- status: rewrite

### D08-019
- severity: critical
- kategori: absence_schema_gap
- exakt problem: absence decisions finns i runtime men saknas i bindande DB-schema.
- varför det är farligt: payroll-kritisk frånvarosanning saknar hållfast persistens.
- exakt filepath: `packages/domain-time/src/index.mjs`; `packages/db/migrations/20260321190000_phase7_absence_portal.sql`
- radreferens om möjligt: `1908-1939`; migrationen saknar absence-decision-tabell
- rekommenderad riktning: inför `absence_decisions`, `absence_decision_versions`, `leave_signal_locks`.
- status: rewrite

### D08-020
- severity: high
- kategori: portal_bypass
- exakt problem: self-service kan skapa leave requests som vissa leave types auto-approve direkt.
- varför det är farligt: employee portal kan skapa payrollpåverkande frånvarosanning utan tillräcklig attestgräns.
- exakt filepath: `packages/domain-time/src/index.mjs`; `apps/api/src/server.mjs`
- radreferens om möjligt: `1161-1232`; portal-routes `11087-11225`
- rekommenderad riktning: portal får bara skriva request/signal, aldrig slutlig payroll truth.
- status: rewrite

### D08-021
- severity: high
- kategori: correction_reopen
- exakt problem: leave-signal lock är hård men det finns ingen first-class correction/reopen-model som versionerar efter lås.
- varför det är farligt: sena korrigeringar riskerar att bli manuella workarounds eller osynliga omskrivningar.
- exakt filepath: `packages/domain-time/src/index.mjs`
- radreferens om möjligt: `1395-1432`, `1869-1885`, `1908-1939`
- rekommenderad riktning: inför `AbsenceCorrectionCase` och `AbsenceDecisionVersion`.
- status: rewrite

## Termination / Final Period / Final Freeze Findings

### D08-022
- severity: critical
- kategori: termination_governance
- exakt problem: Domän 8 saknar explicit termination command, final period policy och final freeze-record.
- varför det är farligt: avslutade anställningar kan förorenas av sena HR/time/absence-ändringar och fel slutlöneinput.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `packages/domain-time/src/index.mjs`
- radreferens om möjligt: exportsektionsnivå; ingen first-class termination-path hittad
- rekommenderad riktning: bygg `TerminationDecision`, `FinalPeriodPolicy`, `FinalFreezeRecord`.
- status: rewrite

### D08-023
- severity: high
- kategori: post_termination_change
- exakt problem: inga policygränser finns för vad som får korrigeras efter slutdatum.
- varför det är farligt: slutperiod, semesterskuld och final pay kan ändras utan spårbar governance.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: saknas som modell
- rekommenderad riktning: inför `allowedPostTerminationCorrections` och correction receipt.
- status: rewrite

## Balance Type / Account / Snapshot Findings

### D08-024
- severity: high
- kategori: balance_ownership
- exakt problem: balance owner valideras i runtime men är inte lika hårt bunden i schema och seed-data.
- varför det är farligt: employee- och employment-burna saldon kan blandas ihop över flera anställningar.
- exakt filepath: `packages/domain-balances/src/engine.mjs`; `packages/db/migrations/20260324160000_phase17_balances.sql`
- radreferens om möjligt: `1168-1184`; schema saknar full owner-governance
- rekommenderad riktning: gör owner typ, owner id och employment binding bindande i persistence.
- status: harden

### D08-025
- severity: medium
- kategori: balance_snapshot_chain
- exakt problem: balances snapshotkedja är användbar men inte tillräcklig ensam för payroll freeze.
- varför det är farligt: downstream kan översälja snapshot som final truth när upstream fortfarande är ofrusen.
- exakt filepath: `packages/domain-balances/src/engine.mjs`; `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: balance snapshot-relaterade runtime paths
- rekommenderad riktning: bind balances till same-period freeze policy och payroll snapshot refs.
- status: harden

### D08-026
- severity: medium
- kategori: generic_balance_model
- exakt problem: generic `VACATION_DAYS`-seed lever kvar trots att svensk semester kräver tydligare profil- och close-regler.
- varför det är farligt: demo- och seedspår kan driva fel antäganden om hur vacation truth ska fungera.
- exakt filepath: `packages/db/seeds/20260324160010_phase17_balances_seed.sql`
- radreferens om möjligt: seed för `VACATION_DAYS`
- rekommenderad riktning: ta bort generisk demo-vacation som aktiv modell.
- status: remove

## Vacation Balance / Carry Forward / Expiry / Year Close Findings

### D08-027
- severity: critical
- kategori: vacation_schema_gap
- exakt problem: vacation profile och vacation year close finns i runtime men saknas i DB-migrationen.
- varför det är farligt: svensk semesterlogik saknar bindande persistensmodell.
- exakt filepath: `packages/domain-balances/src/engine.mjs`; `packages/db/migrations/20260324160000_phase17_balances.sql`
- radreferens om möjligt: `675-733`, `835-1023`; migrationen saknar motsvarande tabeller
- rekommenderad riktning: inför `vacation_profiles`, `vacation_year_close_runs`, `vacation_carry_forward_decisions`, `vacation_expiry_decisions`.
- status: rewrite

### D08-028
- severity: critical
- kategori: semesterlag_logic
- exakt problem: year-close-logiken stänger ut alla paid days och bär bara en delmängd till saved days.
- varför det är farligt: modellen bryter mot semesterlagens logik om 25 dagar, uttagsgolv och sparade dagar.
- exakt filepath: `packages/domain-balances/src/engine.mjs`
- radreferens om möjligt: `938-972`
- rekommenderad riktning: skriv om close-run så att uttagsbara dagar, sparbara dagar, sparade dagar och eventuell förverkning separeras korrekt.
- status: rewrite

### D08-029
- severity: high
- kategori: vacation_model_scope
- exakt problem: vacation-modellen är för generisk för att bevisa svensk semesterårs-, intjänandeårs-, spardags- och uttagslogik.
- varför det är farligt: systemet kan verka rätt i enkla tester men falla på verkliga semesterfall.
- exakt filepath: `packages/domain-balances/src/engine.mjs`
- radreferens om möjligt: `675-733`, `835-1023`
- rekommenderad riktning: inför svensk `VacationProfile` med semesterår, intjänandeår, paid/unpaid/saveable/saved-expiring buckets.
- status: rewrite

### D08-030
- severity: high
- kategori: final_pay_dependency
- exakt problem: final pay förlitar sig delvis på osäker vacation truth och fallbackar i edge cases.
- varför det är farligt: fel semesterinput blir fel slutlön, fel skuld och fel AGI.
- exakt filepath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: final pay vacation-read paths
- rekommenderad riktning: blockera final pay när vacation truth inte är juridiskt och tekniskt verifierad.
- status: harden

## Identity Merge / Split / Immutable Employment Findings

### D08-031
- severity: critical
- kategori: identity_merge_split
- exakt problem: identity merge/split saknas helt som first-class runtime.
- varför det är farligt: dubbla employees kan inte saneras utan risk för att anställningshistorik och payrollrefs förstörs manuellt.
- exakt filepath: `packages/domain-hr/src/index.mjs`
- radreferens om möjligt: inga merge/split-kommandon i exportytan
- rekommenderad riktning: bygg `IdentityMergeDecision`, `IdentitySplitDecision`, `EmployeeAlias`.
- status: rewrite

### D08-032
- severity: high
- kategori: immutable_employment
- exakt problem: immutable employment-id skyddas inte genom merge/split- eller migreringsmodell.
- varför det är farligt: historiska snapshots kan tappa sin anställningslinje.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `packages/domain-core/src/migration.mjs`
- radreferens om möjligt: saknas som explicit invariant
- rekommenderad riktning: gör `employmentId` permanent och oberoende av employee merge lineage.
- status: rewrite

## Payroll Input Snapshot / People-Time Consumer Findings

### D08-033
- severity: high
- kategori: snapshot_truth_boundary
- exakt problem: payroll-input snapshots är tekniskt stabila men upstream-truthen är inte fullständigt låst.
- varför det är farligt: reproducerbar snapshot kan fortfarande bygga på fel eller föränderlig source truth.
- exakt filepath: `packages/domain-payroll/src/index.mjs`; `packages/domain-time/src/index.mjs`
- radreferens om möjligt: snapshot fingerprint path; approved-time-set path
- rekommenderad riktning: kräva locked refs för time, absence, balances och HR truth innan snapshot finaliseras.
- status: harden

### D08-034
- severity: high
- kategori: people_time_base
- exakt problem: `getEmploymentTimeBase` kan falla tillbaka till en tunn HR-bas när full HR platform saknas.
- varför det är farligt: payroll och operatorvyer kan få falskt komplett underlag.
- exakt filepath: `packages/domain-time/src/index.mjs`
- radreferens om möjligt: `637-838`
- rekommenderad riktning: blockera fallback i protected/live eller markera output som blockerad, inte användbar.
- status: harden

### D08-035
- severity: critical
- kategori: payroll_input_locking
- exakt problem: people-time base och payroll är inte hårt bundna till `approved + locked` för alla inputfamiljer.
- varför det är farligt: felaktig lön kan byggas på data som ännu får muteras.
- exakt filepath: `packages/domain-time/src/index.mjs`; `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `551-603`, `733-840`; payroll input consumption
- rekommenderad riktning: inför explicit `payrollInputReadyState` som kräver låsta refs i varje inputfamilj.
- status: rewrite

## Migration Intake / Historical Diff Findings

### D08-036
- severity: critical
- kategori: migration_intake_scope
- exakt problem: migrationintaket är huvudsakligen payroll migration, inte full canonical people master/employment/time/absence truth.
- varför det är farligt: första live pay run kan passera trots att HR-sanningen inte är kanoniskt materialiserad.
- exakt filepath: `packages/domain-core/src/migration.mjs`
- radreferens om möjligt: payroll migration batch/runtime paths
- rekommenderad riktning: inför first-class people migration objects för employee, employment, history, balances, absence, time och YTD.
- status: rewrite

### D08-037
- severity: critical
- kategori: diff_model
- exakt problem: diffmotorn är totals- och difference-item-baserad, inte per employee/employment/source.
- varför det är farligt: dolda person- eller anställningsavvikelser kan drunkna i totaler.
- exakt filepath: `packages/domain-core/src/migration.mjs`
- radreferens om möjligt: `3283-3331`
- rekommenderad riktning: inför entity-aware diff och blockerande signoff per employee/employment/source family.
- status: rewrite

### D08-038
- severity: high
- kategori: cutover_acceptance
- exakt problem: finalize/execute fokuserar på balance baselines och approvals men inte full people truth acceptance.
- varför det är farligt: green migration boards kan ge falskt grönt trots att HR/time/absence-truth inte är verifierad.
- exakt filepath: `packages/domain-core/src/migration.mjs`
- radreferens om möjligt: finalize/execute/rollback paths
- rekommenderad riktning: bind cutover-gate till canonical diff-set för employee, employment, YTD, time, absence och balances.
- status: rewrite

## Security / Privacy / Support Boundary Findings

### D08-039
- severity: high
- kategori: read_audit
- exakt problem: känsliga HR/payrollnära reads är inte systematiskt read-auditade.
- varför det är farligt: obehörig eller för bred intern åtkomst kan inte upptäckas eller bevisas i efterhand.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `apps/api/src/server.mjs`
- radreferens om möjligt: bank account detail reads; generiska route-paths
- rekommenderad riktning: bygg read receipts för känsliga HR/time/payroll-läsningar.
- status: harden

### D08-040
- severity: high
- kategori: support_masking
- exakt problem: support- och backoffice-vyer för HR/payrollnära data är inte konsekvent masked-by-default.
- varför det är farligt: personuppgifter och kontoidentiteter riskerar att exponeras bredare än nödvändigt.
- exakt filepath: `packages/domain-hr/src/index.mjs`; `apps/api/src/platform-method-intents.mjs`
- radreferens om möjligt: masked list vs full detail paths
- rekommenderad riktning: inför masked projections, reveal workflow, step-up och watermark.
- status: rewrite

### D08-041
- severity: high
- kategori: route_boundary
- exakt problem: flera högriskmutationer ligger på grova permissiongränser som `company.manage`.
- varför det är farligt: HR/payrollkritiska ändringar får för bred administrativ yta.
- exakt filepath: `apps/api/src/server.mjs`; `apps/api/src/route-contracts.mjs`
- radreferens om möjligt: HR/time mutating routes; route contracts
- rekommenderad riktning: inför action-class-bundna high-risk permissions och step-up-policy.
- status: harden

## Concrete People-Time Verification Matrix

| capability | claimed HR/time rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
|---|---|---|---|---|---|---|
| Entydig employment truth | en anställd ska ha tydlig employment-sanning | `createEmployment`, `getEmploymentSnapshot` | `packages/domain-hr/src/index.mjs:146-199`, `338-420` | [LAS](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-198280-om-anstallningsskydd_sfs-1982-80/) | partial reality | yes |
| Överlappsblockering | otillåtna samtidiga anställningar ska blockeras | runtime-overlap checks | `packages/domain-hr/src/index.mjs:371-383` | ingen extern källa krävs för att se modellgapet | misleading | yes |
| Contract truth | avtal och ändringsavtal ska styra runtime | effective-dated contracts | `packages/domain-hr/src/index.mjs:602-678` | [LAS](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-198280-om-anstallningsskydd_sfs-1982-80/) | partial reality | yes |
| Retroaktiva HR-ändringar | ändringar efter freeze ska vara review-styrda | `reviewRequired` flaggor | `packages/domain-hr/src/index.mjs:431-590` | ingen extern källa krävs för governancekravet | partial reality | yes |
| Payout account governance | kontoändringar ska vara säkra och effektiverade | employee-bank-account path | `packages/domain-hr/src/index.mjs:757-887` | [IMY: obehörig åtkomst](https://www.imy.se/vanliga-fragor-och-svar/vad-innebar-obehorig-atkomst/) | partial reality | yes |
| Schedule truth | schema får inte överlappa tyst | assignment resolution | `packages/domain-time/src/index.mjs:186-216`, `1618-1628` | [Arbetstidslag](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/) | partial reality | yes |
| Nattpass / DST | nattpass och DST ska landa på rätt dag | clock/time-day computation | `packages/domain-time/src/index.mjs:228-266`, `2031-2048` | [Arbetstidslag](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/) | misleading | yes |
| Approved time set låsning | payroll ska bara läsa låst tid | approved set + payroll consumption | `packages/domain-time/src/index.mjs:551-603`, `733-840`; `tests/unit/time-phase7-2.test.mjs` | ingen extern källa krävs | misleading | yes |
| Absence decision truth | payroll ska läsa beslut, inte portalrequest | absence decision runtime | `packages/domain-time/src/index.mjs:1161-1317` | [Försäkringskassan vägledning](https://www.forsakringskassan.se/download/18.7fc616c01814e179a9f6ed/1667477300013/sjukloneformaner-vagledning-2011-1.pdf) | partial reality | yes |
| Leave lock / correction | låst frånvaro ska få kontrollerad correction-lane | leave signal locks | `packages/domain-time/src/index.mjs:1395-1432`, `1869-1885` | ingen extern källa krävs för governancekravet | partial reality | yes |
| Vacation truth | semesterdagar och sparade dagar ska vara korrekt modellerade | balances + time base | `packages/domain-balances/src/engine.mjs:675-1023`; `tests/integration/phase20-people-time-base-api.test.mjs` | [Semesterlag](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/) | partial reality | yes |
| Vacation year close | year close ska respektera uttagsgolv och spärregler | `runVacationYearClose` | `packages/domain-balances/src/engine.mjs:938-972` | [Semesterlag](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/) | misleading | yes |
| Identity merge/split | merge/split får inte förstöra employment history | saknas | ingen first-class runtime hittad | ingen särskild extern källa krävs för att konstatera saknad modell | dead/missing | yes |
| Payroll input reproducibility | samma input ska ge samma snapshot | snapshot fingerprints | `packages/domain-payroll/src/index.mjs:2087-2265`; `tests/integration/phase11-payroll-input-snapshots-api.test.mjs` | ingen extern källa krävs | verified reality | no |
| People migration diff | diff ska gå per employee/employment/source | migration diff runtime | `packages/domain-core/src/migration.mjs:3283-3331`; `tests/e2e/phase19-payroll-migration-flow.test.mjs` | ingen extern källa krävs | partial reality | yes |
| Känsliga reads | känslig HR-data ska vara need-to-know och auditbar | bank account detail read path | `packages/domain-hr/src/index.mjs:766-789`; `apps/api/src/platform-method-intents.mjs:653-660` | [IMY: obehörig åtkomst](https://www.imy.se/vanliga-fragor-och-svar/vad-innebar-obehorig-atkomst/) | partial reality | yes |

## Critical Findings

- D08-001
- D08-002
- D08-006
- D08-007
- D08-008
- D08-009
- D08-013
- D08-014
- D08-016
- D08-017
- D08-018
- D08-019
- D08-022
- D08-027
- D08-028
- D08-031
- D08-035
- D08-036
- D08-037

## High Findings

- D08-003
- D08-004
- D08-005
- D08-011
- D08-012
- D08-015
- D08-020
- D08-021
- D08-023
- D08-024
- D08-029
- D08-030
- D08-032
- D08-033
- D08-034
- D08-038
- D08-039
- D08-040
- D08-041

## Medium Findings

- D08-010
- D08-025
- D08-026

## Low Findings

- Inga lågrisksfynd är relevanta för go-live. Domänen är blockerad av högre nivåer.

## Cross-Domain Blockers

- Payroll snapshots är tekniskt stabila men kan byggas från approved men olåst time truth.
- Vacation truth påverkar redan payroll final pay, semesterautomation och skuld.
- Absence decisions påverkar redan sjuklöneautomation.
- Payout-account-modellen påverkar direkt pay batch och payout preview.
- Migrationdomänen kan visa gröna diff- och cutoverpaths utan att full canonical people truth finns.

## Go-Live Blockers

1. Employment truth är inte komplett.
2. Legal concurrency-modell saknas.
3. Approved time är inte hårt låst innan payroll-konsumtion.
4. Nattpass, tidszon och DST är fel modellerade.
5. Absence/time-overlap är inte robust.
6. Absence decisions och approved time sets saknar hållfast DB-modell.
7. Vacation year close bryter mot svensk semesterlogik.
8. Termination/final-period/final-freeze saknas.
9. Identity merge/split saknas.
10. People migration diff är inte entity-aware.
11. Känsliga reads saknar systematisk read-audit och masked-by-default support boundary.

## Repo Reality Vs Intended People-Time Model

| intended rebuildmål | faktisk repo-verklighet | bedömning |
|---|---|---|
| `EmploymentTruth` ska bära legal employer, status, payroll eligibility, workplace och payout instruction | nuvarande employment-record saknar flera av dessa fält | misleading |
| payroll får bara läsa locked time/absence/balance-truth | approved men olåst time truth kan läsas | misleading |
| termination och final freeze ska vara first-class | saknas | rewrite required |
| semesterprofil och year close ska vara svenskregelriktiga | generell balancesmodell, fel close-run | rewrite required |
| identity merge/split ska bevara immutable employment lineage | saknas | rewrite required |
| people migration ska diffa per employee/employment/source | totals- och difference-item-baserad diff | rewrite required |

Direkta svar:
- Finns det en entydig aktiv employment truth per anställd där modellen kräver det: nej.
- Blockeras otillåtna överlapp mellan anställningar, avtal, placeringar och scopes: delvis i runtime, inte konsekvent i hela kedjan.
- Är anställningsavtal och ändringsavtal verkligt styrande och auditbara: nej.
- Är contracts, placements, salary bases, manager assignments och payout accounts verkligt styrande och auditbara: delvis.
- Är retroaktiva employment- och scopeändringar efter freeze korrekt begränsade: nej.
- Är nattpass, tidszon, DST och dygnsgränser korrekt hanterade: nej.
- Är approved time sets verkliga, låsta och payroll-konsumerbara: delvis.
- Är schedules, time entries, flex och overtime korrekt modellerade fram till approved-time truth: delvis.
- Är absence decisions, leave signals, correction och reopen korrekt styrda: nej.
- Är absence-, time- och balanceinteraktionen korrekt: nej.
- Kan employee portal eller self-service kringgå approvals eller skapa fel frånvarosanning: ja, risken finns.
- Är balances engine verklig källa för semesterdagar, carry-forward, expiry och semesterårsgränser: delvis.
- Är vacation balances, saved days och year-close/carry-forward korrekta: nej.
- Är termination/final-period governance korrekt, inklusive slutlönens input freeze: nej.
- Är identity merge/split säkert utan att förstöra historik eller personalsanning: nej.
- Är payout account-ändringar säkra, step-up-styrda och korrekt effektiverade: nej.
- Är payroll-input snapshots och people-time base byggda endast på approved/locked truth: nej.
- Är migration intake, historikimport och diff före första live pay run tillräckligt kanoniska och säkra: nej.
- Går diff att utföra per employee, per employment, per balance type och per source för YTD/time/absence: nej.
- Är security class, masking, läs-audit och support/backoffice-gränser korrekta för HR/payrollnära persondata: nej.
- Vilka brister i denna domän blockerar go-live: se `Go-Live Blockers`.
