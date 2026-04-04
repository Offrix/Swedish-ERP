# DOMAIN_08_IMPLEMENTATION_LIBRARY

## Mål

Detta dokument beskriver exakt hur Domän 8 ska byggas. Det är inte en tematisk målbild. Det är en byggspec för HR-, employment-, time-, absence-, balances- och people-migration-kärnan så att vem som helst som öppnar filen förstår:
- vad som ska byggas
- hur det ska byggas
- vilka regler som måste hållas
- vilka tester som måste vara gröna
- vilka runtime-blockerare som måste vara stängda

## Fas 8

### Delfas 8.1 Employee-master and employment-scope model

#### Vad som ska byggas

- `Employee`
- `EmployeeIdentity`
- `EmployeeAlias`
- `EmploymentTruth`
- `LegalConcurrencyProfile`
- `EmploymentTruthStatus`

#### Exakta objekt

- `Employee(employeeId, companyId, displayName, privacyClass, createdAt, archivedAt)`
- `EmployeeIdentity(identityId, employeeId, identityType, canonicalSecretRef, blindIndex, maskedValue, validFrom, validTo, sourceRef)`
- `EmployeeAlias(aliasId, canonicalEmployeeId, previousEmployeeId, aliasType, createdAt, decisionRef)`
- `EmploymentTruth(employmentId, employeeId, legalEmployerId, employmentFormCode, employmentStatus, payrollEligibility, orgUnitId, workplaceId, workerCategoryCode, payModelCode, managerChainRef, validFrom, validTo, supersedesRef, concurrencyProfileRef, createdAt, archivedAt)`
- `LegalConcurrencyProfile(profileId, companyId, allowedCombinationCode, legalBasisRef, requiresApproval, validFrom, validTo)`
- `EmploymentTruthStatus(employmentId, blockingCodes, missingRequirements, isPayrollReady, reviewedAt, reviewedBy)`

#### State machines

- `EmploymentTruth`
  - `draft -> active -> superseded | terminated | archived`
- `EmploymentTruthStatus`
  - `incomplete -> review_required -> payroll_ready | blocked`

#### Commands

- `createEmployee`
- `registerEmployeeIdentity`
- `mergeEmployeeAlias`
- `createEmploymentTruth`
- `supersedeEmploymentTruth`
- `terminateEmploymentTruth`
- `setLegalConcurrencyProfile`
- `recomputeEmploymentTruthStatus`

#### Events

- `employee.created`
- `employee.identity_registered`
- `employee.alias_merged`
- `employment_truth.created`
- `employment_truth.superseded`
- `employment_truth.terminated`
- `employment_truth.status_recomputed`

#### Invariants

- `employmentId` är immutabelt.
- Ingen aktiv `EmploymentTruth` får sakna `legalEmployerId`, `employmentStatus` eller `payrollEligibility`.
- Samtidiga aktiva employments är förbjudna om `LegalConcurrencyProfile` saknas.
- `EmploymentTruthStatus.isPayrollReady` får bara bli `true` när alla obligatoriska fields och bindings finns.

#### Valideringar som blockerar fel

- deny om `legalEmployerId` saknas
- deny om `payrollEligibility` saknas
- deny om överlapp finns utan concurrency profile
- deny om `workplaceId` saknas där policy kräver arbetsställe
- deny om `employmentStatus` inte kan mappas till lifecycle-policy

#### Routes/API-kontrakt

- `POST /v1/hr/employees`
- `POST /v1/hr/employees/{employeeId}/identities`
- `POST /v1/hr/employments`
- `POST /v1/hr/employments/{employmentId}/supersede`
- `POST /v1/hr/employments/{employmentId}/recompute-status`
- `GET /v1/hr/employments/{employmentId}`

Alla write-routes ska returnera:
- `employmentId`
- `resultingStatus`
- `blockingCodes[]`
- `evidenceRef`
- `correlationId`

#### Permissions/review-boundaries

- read: `hr.read`
- standard write: `hr.manage`
- high-risk write: `hr.high_risk_manage`
- concurrency override: tvåstegsapproval eller särskild elevated policy

#### Audit/evidence/receipt-krav

- varje skapad eller supersederad `EmploymentTruth` ska få receipt
- varje concurrency-undantag ska få approval receipt
- varje identitetsregistrering ska få blind-index lineage

#### Replay/recovery/dead-letter-regler

- create/supersede/terminate måste vara idempotenta på `commandId`
- replay får inte skapa ny aktiv anställning om identisk command redan commitat
- dead letters måste kunna återköras utan ny `employmentId`

#### Migrations-/cutover-/rollback-regler

- people migration får aldrig skapa tunn employment-record; den måste skapa full `EmploymentTruth`
- rollback måste kunna återställa `supersedesRef`-kedjan

#### Officiella regler och källor

- [Lag (1982:80) om anställningsskydd](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-198280-om-anstallningsskydd_sfs-1982-80/)

#### Tester som bevisar delfasen

- unit för overlap deny/allow
- integration för `employmentTruthStatus`
- integration för concurrency override receipts
- integration för alias/identity lineage

### Delfas 8.2 Employment-contract/addendum/lifecycle model

#### Vad som ska byggas

- `EmploymentContract`
- `EmploymentAddendum`
- `EmploymentLifecycleEvent`
- `RetroactiveEmploymentChangeRequest`

#### Exakta objekt

- `EmploymentContract(contractId, employmentId, legalEmployerId, contractTypeCode, signedDocumentRef, validFrom, validTo, supersedesContractId, createdAt)`
- `EmploymentAddendum(addendumId, contractId, changeTypeCode, changePayload, documentRef, effectiveFrom, effectiveTo, supersedesAddendumId, createdAt)`
- `EmploymentLifecycleEvent(eventId, employmentId, eventType, effectiveAt, contractRef, addendumRef, initiatedBy, approvalRef, evidenceRef)`
- `RetroactiveEmploymentChangeRequest(requestId, employmentId, requestedChangeType, affectedPeriods, impactPreviewRef, status, approvedBy, correctionCaseRef)`

#### State machines

- `EmploymentContract`
  - `draft -> signed -> active -> superseded | expired | terminated`
- `RetroactiveEmploymentChangeRequest`
  - `draft -> review_pending -> approved | rejected -> executed`

#### Commands

- `createEmploymentContract`
- `signEmploymentContract`
- `addEmploymentAddendum`
- `extendEmployment`
- `supersedeEmploymentContract`
- `requestRetroactiveEmploymentChange`
- `approveRetroactiveEmploymentChange`
- `executeRetroactiveEmploymentChange`

#### Events

- `employment_contract.created`
- `employment_contract.signed`
- `employment_addendum.created`
- `employment_contract.superseded`
- `employment_retro_change.requested`
- `employment_retro_change.approved`
- `employment_retro_change.executed`

#### Invariants

- kontrakt och addenda får inte överlappa tyst inom samma lineage
- retroaktiv ändring efter freeze får aldrig mutera historisk version direkt
- varje lifecycle-event måste peka på kontrakt eller addendum när sådant krävs

#### Valideringar som blockerar fel

- deny om kontrakt saknar signed document ref i `signed` state
- deny om retroaktivt ändringsspann korsar låst payrollperiod utan correction lane
- deny om addendum försöker ändra legal employer utan ny `EmploymentTruth`

#### Routes/API-kontrakt

- `POST /v1/hr/employments/{employmentId}/contracts`
- `POST /v1/hr/contracts/{contractId}/sign`
- `POST /v1/hr/contracts/{contractId}/addenda`
- `POST /v1/hr/employments/{employmentId}/retroactive-change-requests`
- `POST /v1/hr/retroactive-change-requests/{requestId}/approve`

#### Permissions/review-boundaries

- kontraktsskrivning: `hr.manage`
- retroaktiv ändring efter freeze: `hr.high_risk_manage` + separat approver

#### Audit/evidence/receipt-krav

- varje kontraktsversion ska ha document ref, signeringsref och evidence ref
- varje retroaktiv ändring ska ha impact preview receipt

#### Replay/recovery/dead-letter-regler

- replay av `signEmploymentContract` får inte skapa ny kontraktsversion
- replay av retroaktiv ändring får inte exekvera samma correction två gånger

#### Migrations-/cutover-/rollback-regler

- migrerad kontraktshistorik måste läggas in som versionskedja, inte som platt metadata
- rollback ska kunna återställa senaste aktiva kontraktsversion

#### Officiella regler och källor

- [Lag (1982:80) om anställningsskydd](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-198280-om-anstallningsskydd_sfs-1982-80/)

#### Tester som bevisar delfasen

- unit för lifecycle transitions
- unit för retroaktiv ändring mot låst period
- integration för approval- och evidencekedja

### Delfas 8.3 Placement/salary-basis/manager/payout-account model

#### Vad som ska byggas

- `EmploymentPlacement`
- `SalaryBasisDecision`
- `ManagerAssignmentEdge`
- `EmploymentPayoutInstruction`

#### Exakta objekt

- `EmploymentPlacement(placementId, employmentId, orgUnitId, workplaceId, costCenterId, validFrom, validTo, supersedesPlacementId, decisionRef)`
- `SalaryBasisDecision(salaryBasisId, employmentId, payModelCode, rateType, rateAmount, currencyCode, validFrom, validTo, decisionRef, supersedesSalaryBasisId)`
- `ManagerAssignmentEdge(edgeId, employmentId, managerEmploymentId, validFrom, validTo, supersedesEdgeId, decisionRef)`
- `EmploymentPayoutInstruction(instructionId, employmentId, bankAccountSecretRef, clearingMasked, accountMasked, validFrom, activationAt, verificationState, stepUpRef, notificationRef, deactivationAt)`

#### State machines

- `EmploymentPayoutInstruction`
  - `pending_verification -> scheduled -> active -> superseded | revoked`

#### Commands

- `recordEmploymentPlacement`
- `recordSalaryBasisDecision`
- `assignEmploymentManager`
- `scheduleEmploymentPayoutInstruction`
- `activateEmploymentPayoutInstruction`
- `revokeEmploymentPayoutInstruction`

#### Events

- `employment_placement.recorded`
- `salary_basis.recorded`
- `manager_assignment.recorded`
- `employment_payout_instruction.scheduled`
- `employment_payout_instruction.activated`
- `employment_payout_instruction.revoked`

#### Invariants

- exakt en aktiv payout instruction per employment och payout date
- managergrafen får inte innehålla cykel per datum
- retroaktiv placement eller salary basis efter freeze måste gå via correction lane

#### Valideringar som blockerar fel

- deny om payout instruction aktiveras innanför cutoff utan step-up och policygodkännande
- deny om manager assignment skapar grafcykel
- deny om placement overlapar utan explicit supersession

#### Routes/API-kontrakt

- `POST /v1/hr/employments/{employmentId}/placements`
- `POST /v1/hr/employments/{employmentId}/salary-bases`
- `POST /v1/hr/employments/{employmentId}/manager-assignments`
- `POST /v1/hr/employments/{employmentId}/payout-instructions`
- `POST /v1/hr/payout-instructions/{instructionId}/activate`

#### Permissions/review-boundaries

- placement och salary basis: `hr.manage`
- payout instruction nära cutoff: `hr.high_risk_manage` + step-up
- full bankreveal: `hr.sensitive_read`

#### Audit/evidence/receipt-krav

- bankkontoändring ska skriva read/write receipts, step-up ref och notification ref
- managerändring ska skriva lineage receipt

#### Replay/recovery/dead-letter-regler

- replay av aktivering får inte dubbelsätta aktiv payout instruction
- revoke/activate ska vara sekvenskontrollerad per instruction

#### Migrations-/cutover-/rollback-regler

- migrerade bankkonton måste landa som schemalagda payout instructions, inte direktaktiva när policy kräver delay
- rollback ska kunna återställa föregående instruction

#### Officiella regler och källor

- [IMY: vad innebär obehörig åtkomst?](https://www.imy.se/vanliga-fragor-och-svar/vad-innebar-obehorig-atkomst/)

#### Tester som bevisar delfasen

- unit för managergraph
- unit för payout activation window
- integration för read-audit och step-up

### Delfas 8.4 Time-entry/schedule/night-shift/DST/approved-time-set/period-lock model

#### Vad som ska byggas

- `TimeEntry`
- `ClockEvent`
- `WorkScheduleAssignment`
- `ApprovedTimeSet`
- `ApprovedTimeSetLock`

#### Exakta objekt

- `TimeEntry(timeEntryId, employmentId, localZone, startsAt, endsAt, workSegments, submittedBy, approvalMode, status, sourceChannel, createdAt)`
- `ClockEvent(clockEventId, employmentId, occurredAt, localZone, eventType, deviceRef, sourceChannel)`
- `WorkScheduleAssignment(scheduleAssignmentId, employmentId, scheduleTemplateId, validFrom, validTo, supersedesAssignmentId)`
- `ApprovedTimeSet(approvedTimeSetId, employmentId, reportingPeriodId, sourceEntryRefs, derivedLines, lockState, fingerprint, approvedAt, approvedBy)`
- `ApprovedTimeSetLock(lockId, approvedTimeSetId, payrollBoundaryRef, lockedAt, lockedBy, reasonCode)`

#### State machines

- `TimeEntry`
  - `draft -> submitted -> approved -> locked | rejected`
- `ApprovedTimeSet`
  - `draft -> approved -> locked -> superseded`

#### Commands

- `recordClockEvent`
- `createTimeEntry`
- `submitTimeEntry`
- `approveTimeEntry`
- `materializeApprovedTimeSet`
- `lockApprovedTimeSet`

#### Events

- `clock_event.recorded`
- `time_entry.created`
- `time_entry.approved`
- `approved_time_set.materialized`
- `approved_time_set.locked`

#### Invariants

- nattpass får korsa midnatt
- local zone måste lagras på time entry och clock event
- payroll får aldrig läsa `ApprovedTimeSet` utan motsvarande `ApprovedTimeSetLock`

#### Valideringar som blockerar fel

- deny om schedule overlaps för samma employment
- deny om local zone saknas
- deny om approval-mode blir auto i policy som kräver attest
- deny om payroll snapshot läser `lockState != locked`

#### Routes/API-kontrakt

- `POST /v1/time/entries`
- `POST /v1/time/entries/{id}/approve`
- `POST /v1/time/approved-sets/materialize`
- `POST /v1/time/approved-sets/{id}/lock`
- `GET /v1/time/employment-base`

#### Permissions/review-boundaries

- tidrapportering: `time.submit`
- attest: `time.approve`
- periodlås: `time.lock_period`

#### Audit/evidence/receipt-krav

- varje lås ska bära payroll boundary ref
- varje approved set ska bära fingerprint receipt

#### Replay/recovery/dead-letter-regler

- materialisering måste vara deterministisk på source refs och zone rules
- replay får inte skapa ny lock för redan låst set

#### Migrations-/cutover-/rollback-regler

- migrerad tid måste mappas till raw entries eller approved sets med explicit lockstatus
- cutover får inte acceptera olåsta approved set

#### Officiella regler och källor

- [Arbetstidslag (1982:673)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/)

#### Tester som bevisar delfasen

- unit för cross-midnight
- unit för DST forward/backward
- integration för approved-set lock boundary

### Delfas 8.5 Absence/leave-signal/correction/reopen/portal model

#### Vad som ska byggas

- `AbsenceRequest`
- `AbsenceDecision`
- `LeaveSignalLock`
- `AbsenceCorrectionCase`

#### Exakta objekt

- `AbsenceRequest(requestId, employmentId, leaveTypeCode, requestedFrom, requestedTo, sourceChannel, payload, submittedBy, submittedAt, status)`
- `AbsenceDecision(decisionId, employmentId, requestRef, leaveTypeCode, payrollImpactCode, fromDate, toDate, percentage, decisionVersion, status, approvedBy, approvedAt, supersedesDecisionId)`
- `LeaveSignalLock(lockId, employmentId, reportingPeriodId, lockedAt, lockedBy, boundaryType, reasonCode)`
- `AbsenceCorrectionCase(caseId, employmentId, originalDecisionRef, requestedChange, impactPreviewRef, status, approvedBy, executedAt)`

#### State machines

- `AbsenceRequest`
  - `draft -> submitted -> approved | rejected`
- `AbsenceDecision`
  - `pending -> approved -> locked -> superseded`
- `AbsenceCorrectionCase`
  - `draft -> review_pending -> approved | rejected -> executed`

#### Commands

- `createAbsenceRequest`
- `submitAbsenceRequest`
- `approveAbsenceRequest`
- `lockLeaveSignals`
- `requestAbsenceCorrection`
- `approveAbsenceCorrection`

#### Events

- `absence_request.submitted`
- `absence_decision.approved`
- `leave_signal.locked`
- `absence_correction.requested`
- `absence_correction.executed`

#### Invariants

- portal får bara skriva request, aldrig slutlig decision
- leave och time får inte överlappa utan explicit policy
- låst decision får inte muteras; den ska supersedas av ny version

#### Valideringar som blockerar fel

- deny om portalpath försöker skapa `AbsenceDecision`
- deny om leave overlapar godkänd time line
- deny om correction saknar impact preview mot payroll

#### Routes/API-kontrakt

- `POST /v1/time/leave-requests`
- `POST /v1/time/leave-requests/{id}/submit`
- `POST /v1/time/leave-requests/{id}/approve`
- `POST /v1/time/leave-locks`
- `POST /v1/time/absence-corrections`

#### Permissions/review-boundaries

- employee portal: `employee.self_service_request`
- manager approve: `time.approve_leave`
- correction efter lock: `hr.high_risk_manage`

#### Audit/evidence/receipt-krav

- absence decision måste bära approval receipt
- correction case måste bära impact preview, approval och execution receipt

#### Replay/recovery/dead-letter-regler

- replay av approve får inte skapa ny decisionversion om samma command redan finns
- correction replay måste vara idempotent på `caseId`

#### Migrations-/cutover-/rollback-regler

- migrerad frånvaro måste importeras som versionerade decisions eller tydligt icke-låsta requests
- cutover måste blockera på oklara leave-versioner

#### Officiella regler och källor

- [Försäkringskassan: sjuklöneförmåner, vägledning](https://www.forsakringskassan.se/download/18.7fc616c01814e179a9f6ed/1667477300013/sjukloneformaner-vagledning-2011-1.pdf)

#### Tester som bevisar delfasen

- unit för leave/time-overlap
- unit för correction versioning
- integration för portal request vs payroll-ready decision

### Delfas 8.6 Termination/final-period/final-freeze model

#### Vad som ska byggas

- `TerminationDecision`
- `FinalPeriodPolicy`
- `FinalFreezeRecord`

#### Exakta objekt

- `TerminationDecision(terminationDecisionId, employmentId, terminationDate, legalReasonCode, sourceDocumentRef, approvedBy, approvedAt)`
- `FinalPeriodPolicy(policyId, employmentId, lastApprovableTimeDate, lastApprovableAbsenceDate, finalInputFreezeAt, allowedPostTerminationCorrections, policyVersion)`
- `FinalFreezeRecord(finalFreezeId, employmentId, freezeAt, affectedSnapshotRefs, reopenedBy, reopenedReason, correctionCaseRef)`

#### State machines

- `TerminationDecision`
  - `draft -> approved -> executed`
- `FinalFreezeRecord`
  - `scheduled -> active -> reopened -> reclosed`

#### Commands

- `terminateEmployment`
- `defineFinalPeriodPolicy`
- `activateFinalFreeze`
- `requestPostTerminationCorrection`

#### Events

- `employment.terminated`
- `final_period_policy.defined`
- `final_freeze.activated`
- `post_termination_correction.requested`

#### Invariants

- avslutad employment får inte auto-återaktiveras av ny placement, leave eller salary basis
- final freeze måste finnas innan final pay snapshot kan bli klar

#### Valideringar som blockerar fel

- deny om ny time entry skapas efter `finalInputFreezeAt`
- deny om retroaktiv absence försöker mutera slutperiod direkt

#### Routes/API-kontrakt

- `POST /v1/hr/employments/{employmentId}/terminate`
- `POST /v1/hr/employments/{employmentId}/final-period-policy`
- `POST /v1/hr/employments/{employmentId}/final-freeze`

#### Permissions/review-boundaries

- terminate: `hr.high_risk_manage`
- final freeze: `hr.high_risk_manage` eller payroll-coupled privileged action

#### Audit/evidence/receipt-krav

- termination måste bära legal reason och source document ref
- final freeze måste bära snapshot refs och actor chain

#### Replay/recovery/dead-letter-regler

- replay av termination får inte skapa dubbel final freeze

#### Migrations-/cutover-/rollback-regler

- migrerad avslutad employment måste bära avslutsbeslut, inte bara `endDate`
- rollback av feltermination måste gå via correction case

#### Officiella regler och källor

- [Lag (1982:80) om anställningsskydd](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-198280-om-anstallningsskydd_sfs-1982-80/)
- [Semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/)

#### Tester som bevisar delfasen

- unit för termination timeline
- integration för final freeze deny
- integration för correction lane efter slutdatum

### Delfas 8.7 Balance-type/account/vacation-profile model

#### Vad som ska byggas

- `BalanceType`
- `BalanceAccount`
- `BalanceTransaction`
- `VacationProfile`

#### Exakta objekt

- `BalanceType(balanceTypeCode, ownerType, quantityUnit, allowNegative, ruleProfileKind, retentionClass)`
- `BalanceAccount(accountId, balanceTypeCode, ownerType, ownerId, employmentId, profileRef, openedAt, closedAt, currentQuantity, currentAmount)`
- `BalanceTransaction(transactionId, accountId, sourceType, sourceRef, deltaQuantity, deltaAmount, effectiveDate, postedAt, idempotencyKey)`
- `VacationProfile(profileId, companyId, earningYearKind, vacationYearStartMonthDay, minimumPaidDaysToRetain, maxSavedDaysPerYear, unpaidDaysPolicy, expiryPolicy, validFrom, validTo)`

#### State machines

- `BalanceAccount`
  - `open -> locked -> closed`

#### Commands

- `createBalanceType`
- `openBalanceAccount`
- `postBalanceTransaction`
- `defineVacationProfile`

#### Events

- `balance_type.created`
- `balance_account.opened`
- `balance_transaction.posted`
- `vacation_profile.defined`

#### Invariants

- owner type och owner id måste vara konsistenta
- vacation account för employment får inte dela owner med annan employment utan uttrycklig policy

#### Valideringar som blockerar fel

- deny om employment-owned saldo saknar `employmentId`
- deny om profile saknas för vacation close/expiry

#### Routes/API-kontrakt

- `POST /v1/balances/types`
- `POST /v1/balances/accounts`
- `POST /v1/balances/transactions`
- `POST /v1/balances/vacation-profiles`

#### Permissions/review-boundaries

- standard balance ops: `balances.manage`
- vacation profile-ändring: `balances.high_risk_manage`

#### Audit/evidence/receipt-krav

- alla transaction posts ska bära source ref och idempotency key
- vacation profile-versioner ska vara auditbara

#### Replay/recovery/dead-letter-regler

- replay av samma source ref får inte skapa dubbel transaktion

#### Migrations-/cutover-/rollback-regler

- migrerade balances måste knytas till korrekt owner och profile version

#### Officiella regler och källor

- [Semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/)

#### Tester som bevisar delfasen

- unit för owner separation
- unit för idempotent transaction posting
- integration för profile-resolved vacation account reads

### Delfas 8.8 Carry-forward/expiry/vacation-year-close model

#### Vad som ska byggas

- `VacationYearCloseRun`
- `CarryForwardDecision`
- `ExpiryDecision`

#### Exakta objekt

- `VacationYearCloseRun(runId, employmentId, vacationProfileId, yearKey, status, preCloseSnapshotRef, postCloseSnapshotRef, checksum, executedAt)`
- `CarryForwardDecision(decisionId, runId, paidDaysBefore, paidDaysRetained, paidDaysSaved, legalFloorApplied, policyRef)`
- `ExpiryDecision(decisionId, runId, savedDaysExpired, reasonCode, legalBasisRef, effectiveDate)`

#### State machines

- `VacationYearCloseRun`
  - `planned -> running -> completed | failed | replay_blocked`

#### Commands

- `planVacationYearClose`
- `executeVacationYearClose`
- `replayVacationYearClose`

#### Events

- `vacation_year_close.planned`
- `vacation_year_close.completed`
- `vacation_expiry.executed`

#### Invariants

- samma `employmentId + profileId + yearKey` får bara ha en komplett close-run
- 20-dagarsgolv får inte tas bort av close-run

#### Valideringar som blockerar fel

- deny om profile saknas
- deny om close-run redan finns med samma checksum
- deny om close-run försöker spara fler dagar än tillåtet

#### Routes/API-kontrakt

- `POST /v1/balances/vacation-year-close`
- `GET /v1/balances/vacation-year-close/{runId}`

#### Permissions/review-boundaries

- execute close: `balances.high_risk_manage`

#### Audit/evidence/receipt-krav

- close-run måste bära före/efter snapshot refs och checksum

#### Replay/recovery/dead-letter-regler

- replay får bara vara read/verify om checksum matchar

#### Migrations-/cutover-/rollback-regler

- cutover får inte köra svensk vacation close förrän historiska balances och profile refs är verifierade

#### Officiella regler och källor

- [Semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/)

#### Tester som bevisar delfasen

- unit för 20-dagarsgolv
- unit för max sparbara dagar
- integration för idempotent replay guard

### Delfas 8.9 Identity-merge/split/immutable-employment model

#### Vad som ska byggas

- `IdentityMergeDecision`
- `IdentitySplitDecision`
- `EmployeeAliasGraph`

#### Exakta objekt

- `IdentityMergeDecision(decisionId, companyId, sourceEmployeeIds, targetEmployeeId, reasonCode, approvedBy, approvedAt, evidenceRef)`
- `IdentitySplitDecision(decisionId, companyId, sourceEmployeeId, newEmployeeIds, reasonCode, approvedBy, approvedAt, evidenceRef)`
- `EmployeeAliasGraph(edgeId, canonicalEmployeeId, aliasEmployeeId, relationType, createdAt, decisionRef)`

#### State machines

- `IdentityMergeDecision`
  - `draft -> review_pending -> approved | rejected -> executed`

#### Commands

- `requestEmployeeMerge`
- `approveEmployeeMerge`
- `executeEmployeeMerge`
- `requestEmployeeSplit`

#### Events

- `employee_merge.requested`
- `employee_merge.executed`
- `employee_split.requested`

#### Invariants

- `employmentId` får aldrig bytas
- historiska snapshot refs och pay-run refs får aldrig skrivas om tyst

#### Valideringar som blockerar fel

- deny om merge skulle skapa kolliderande aktiva `EmploymentTruth`
- deny om split saknar full objektlista för vilka records som flyttas

#### Routes/API-kontrakt

- `POST /v1/hr/identity-merges`
- `POST /v1/hr/identity-merges/{id}/approve`
- `POST /v1/hr/identity-splits`

#### Permissions/review-boundaries

- alltid `hr.high_risk_manage` + separat approver

#### Audit/evidence/receipt-krav

- merge/split måste bära före/efter lineage receipts

#### Replay/recovery/dead-letter-regler

- merge replay får inte exekvera dubbelt

#### Migrations-/cutover-/rollback-regler

- merge får inte användas som migreringsgenväg för oklara dubletter utan evidence

#### Officiella regler och källor

- ingen särskild extern rättskälla krävs för att konstatera behovet av immutable lineage; detta är ett systemkrav

#### Tester som bevisar delfasen

- unit för immutable employment refs efter merge
- integration för historical alias lookup

### Delfas 8.10 Payroll-input snapshot/people-time-base model

#### Vad som ska byggas

- `PayrollInputSnapshot`
- `PeopleTimeBaseProjection`

#### Exakta objekt

- `PayrollInputSnapshot(snapshotId, employmentId, reportingPeriodId, employmentTruthRef, approvedTimeSetRef, absenceDecisionRefs, balanceRefs, agreementOverlayRef, fingerprint, createdAt, createdBy)`
- `PeopleTimeBaseProjection(employmentId, reportingPeriodId, employmentSummary, timeSummary, absenceSummary, balanceSummary, snapshotStatus, blockerCodes, builtFromRefs, projectionBuiltAt)`

#### State machines

- `PayrollInputSnapshot`
  - `draft -> finalized -> superseded`

#### Commands

- `buildPayrollInputSnapshot`
- `finalizePayrollInputSnapshot`
- `rebuildPeopleTimeBaseProjection`

#### Events

- `payroll_input_snapshot.built`
- `payroll_input_snapshot.finalized`
- `people_time_base.rebuilt`

#### Invariants

- snapshot får inte finaliseras från olåsta refs
- projection får inte behandlas som primär truth

#### Valideringar som blockerar fel

- deny om `ApprovedTimeSet.lockState != locked`
- deny om någon `AbsenceDecision` saknar låsbar status
- deny om `EmploymentTruthStatus.isPayrollReady = false`

#### Routes/API-kontrakt

- `POST /v1/payroll/input-snapshots`
- `POST /v1/payroll/input-snapshots/{id}/finalize`
- `GET /v1/time/employment-base`

#### Permissions/review-boundaries

- snapshot-finalisering: `payroll.prepare`
- projection rebuild: `ops.rebuild_projection`

#### Audit/evidence/receipt-krav

- snapshot ska bära fingerprint, source refs och operator receipt

#### Replay/recovery/dead-letter-regler

- snapshot replay med samma refs ska ge samma fingerprint

#### Migrations-/cutover-/rollback-regler

- people-time-base får inte användas som cutover-sanning utan matchande canonical refs

#### Officiella regler och källor

- ingen extern rättskälla krävs för fingerprintkravet; det är ett systemkrav

#### Tester som bevisar delfasen

- unit för fingerprint stability
- integration för locked-ref enforcement
- integration för blockerad fallback-path

### Delfas 8.11 People migration intake/diff/cutover model

#### Vad som ska byggas

- `PeopleMigrationBatch`
- `EmployeeMigrationSnapshot`
- `EmploymentMigrationSnapshot`
- `PeopleMigrationDiff`
- `PeopleCutoverDecision`

#### Exakta objekt

- `PeopleMigrationBatch(batchId, companyId, sourceSystemCode, status, receivedAt, approvedBy, executedAt)`
- `EmployeeMigrationSnapshot(snapshotId, batchId, employeeExternalRef, canonicalEmployeePayload, sourceHash)`
- `EmploymentMigrationSnapshot(snapshotId, batchId, employmentExternalRef, canonicalEmploymentPayload, sourceHash)`
- `PeopleMigrationDiff(diffId, batchId, entityType, entityKey, sourceFamily, fieldPath, expectedValue, actualValue, severity, resolutionStatus)`
- `PeopleCutoverDecision(decisionId, batchId, openDiffCount, approvedBy, approvedAt, evidenceBundleRef)`

#### State machines

- `PeopleMigrationBatch`
  - `received -> imported -> validated -> diff_open -> approved_for_cutover -> cutover_executed | rolled_back`

#### Commands

- `importPeopleMigrationBatch`
- `validatePeopleMigrationBatch`
- `computePeopleMigrationDiff`
- `approvePeopleCutover`
- `executePeopleCutover`
- `rollbackPeopleCutover`

#### Events

- `people_migration.imported`
- `people_migration.validated`
- `people_migration.diff_computed`
- `people_cutover.approved`
- `people_cutover.executed`

#### Invariants

- diff måste kunna adresseras per employee och per employment
- cutover får inte godkännas med blockerande diff kvar

#### Valideringar som blockerar fel

- deny om canonical `legalEmployerId` saknas i import
- deny om diff med severity blockerande finns kvar vid cutover

#### Routes/API-kontrakt

- `POST /v1/payroll/migrations`
- `POST /v1/payroll/migrations/{id}/validate`
- `POST /v1/payroll/migrations/{id}/diff`
- `POST /v1/payroll/migrations/{id}/approve-cutover`
- `POST /v1/payroll/migrations/{id}/execute-cutover`

#### Permissions/review-boundaries

- cutover approval: `migration.cutover_approve`
- execute/rollback: `migration.cutover_execute`

#### Audit/evidence/receipt-krav

- diff-set ska bära signoff chain
- cutover decision ska bära diff checksum och evidence bundle ref

#### Replay/recovery/dead-letter-regler

- execute/rollback ska vara idempotenta per batch

#### Migrations-/cutover-/rollback-regler

- första live pay run får inte ske innan `PeopleCutoverDecision` är godkänd

#### Officiella regler och källor

- ingen extern rättskälla krävs för diff-modellen; det är ett systemkrav

#### Tester som bevisar delfasen

- unit för entity-aware diff
- integration för blockerad cutover
- e2e för execute och rollback

### Delfas 8.12 Security/privacy/masked-support/read-audit model

#### Vad som ska byggas

- `SensitiveReadReceipt`
- `HrRevealGrant`
- `MaskedHrProjection`

#### Exakta objekt

- `SensitiveReadReceipt(receiptId, actorId, companyId, objectType, objectId, fieldScope, reasonCode, trustLevel, watermarkRef, createdAt)`
- `HrRevealGrant(grantId, actorId, objectScope, reasonCode, issuedAt, expiresAt, stepUpRef, approvedBy)`
- `MaskedHrProjection(objectType, objectId, maskedFields, blockerCodes, correlationId, revealRequired)`

#### State machines

- `HrRevealGrant`
  - `requested -> approved -> active -> expired | revoked`

#### Commands

- `readSensitiveHrObject`
- `requestHrRevealGrant`
- `approveHrRevealGrant`
- `revokeHrRevealGrant`

#### Events

- `sensitive_hr_read.recorded`
- `hr_reveal.requested`
- `hr_reveal.approved`
- `hr_reveal.revoked`

#### Invariants

- känslig HR-read ska alltid skapa `SensitiveReadReceipt`
- masked projection ska vara default

#### Valideringar som blockerar fel

- deny full reveal utan giltig `HrRevealGrant`
- deny reveal utan step-up när policy kräver det

#### Routes/API-kontrakt

- `GET /v1/hr/support-view/{objectType}/{objectId}`
- `POST /v1/hr/reveal-grants`
- `POST /v1/hr/reveal-grants/{id}/approve`
- `POST /v1/hr/reveal-grants/{id}/revoke`

#### Permissions/review-boundaries

- masked support-read: `support.hr_masked_read`
- reveal: `support.hr_reveal_request`
- approve reveal: separat approverroll

#### Audit/evidence/receipt-krav

- read receipt är obligatorisk
- reveal grant ska bära TTL, watermark och step-up ref

#### Replay/recovery/dead-letter-regler

- read receipts är append-only
- revoke replay får inte återaktivera grant

#### Migrations-/cutover-/rollback-regler

- inga gamla support-paths får följa med in i live om de saknar masked-by-default boundary

#### Officiella regler och källor

- [IMY: vad innebär obehörig åtkomst?](https://www.imy.se/vanliga-fragor-och-svar/vad-innebar-obehorig-atkomst/)

#### Tester som bevisar delfasen

- integration för masked support view
- integration för reveal TTL
- integration för append-only read receipts

## Vilka bevis som krävs innan något märks som HR-/time-/balance-mässigt korrekt eller production-ready

- `EmploymentTruth` måste vara komplett, effective-dated och utan otillåtna överlapp.
- `EmploymentContract` och `EmploymentAddendum` måste vara versionsstyrda och auditbara.
- `EmploymentPayoutInstruction` måste vara effect-dated, step-up-styrd och read-auditad.
- `ApprovedTimeSet` måste vara låst innan payroll snapshot.
- `AbsenceDecision` måste vara versionerad och låsbar.
- `VacationProfile` och `VacationYearCloseRun` måste klara svenska lagvektorer.
- `PayrollInputSnapshot` måste vara reproducerbar från locked refs.
- `PeopleMigrationDiff` måste kunna visas per employee och employment.
- känsliga HR-reads måste ge receipts och masked-by-default support view.

## Vilka risker som kräver mänsklig flaggning

- legal concurrency-undantag
- retroaktiva kontrakts- eller scopeändringar efter freeze
- payout account-ändring nära lönekörningscutoff
- identity merge/split
- post-termination correction
- people cutover med svårförklarade diffar
- semesterårs-close där historisk data är ofullständig eller felklassad
