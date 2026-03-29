> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# DOMAIN_OWNERSHIP_AND_SOURCE_OF_TRUTH

Status: Bindande domänkarta och source-of-truth-regelverk.

Detta dokument definierar vad varje bounded context äger, vad andra domäner aldrig får äga, vilka signaler som får skapa bokföring, vilka som aldrig får göra det, och hur correction chains, receipts och audit ska fungera.

## Globala icke-förhandlingsbara regler

1. Ledger är enda domän som skapar journaler och journalrader.
2. Inga read models, UI-ytor, integrationsadaptrar eller AI-motorer får vara source of truth för affärsobjekt.
3. Integrationsdomänen äger transport, credentials, consent, provider health och receipts för externa leveranser; källdomänen äger affärsutfallet.
4. Review center äger reviewobjekt, assignment, decision och escalation; källdomänen äger sakobjektet.
5. Search är härledd data; searchresultat får aldrig styra beslutslogik.
6. Notification center, activity feed, work items och audit är fyra olika objektfamiljer och får aldrig återanvända varandras status som primär sanning.
7. Alla reglerade objekt är append-only eller correction-driven.
8. AI får föreslå, extrahera och klassificera; AI får aldrig ensam fatta slutligt boknings-, deklarations-, AGI-, HUS-, VAT-, ID06- eller accessbeslut.

## Canonical envelopes

### Command envelope

Fält:
- `command_id`
- `command_type`
- `tenant_id`
- `actor_id`
- `source_surface`
- `target_domain`
- `idempotency_key`
- `correlation_id`
- `causation_id`
- `requested_at`
- `payload`
- `expected_object_version`
- `reason_code`

### Event envelope

Fält:
- `event_id`
- `event_type`
- `producing_domain`
- `tenant_id`
- `object_type`
- `object_id`
- `object_version`
- `occurred_at`
- `correlation_id`
- `causation_id`
- `replay_flag`
- `replay_plan_id`
- `payload_hash`
- `payload`

### Audit envelope

Fält:
- `audit_event_id`
- `audit_class`
- `tenant_id`
- `actor_id`
- `action_class`
- `source_object_type`
- `source_object_id`
- `decision_code`
- `reason_code`
- `evidence_refs`
- `correlation_id`
- `emitted_at`

## Bounded contexts

### 1. auth-core

**Äger**
- autentiseringsmetoder
- identity factors
- credential policies
- session revision
- device trust primitives
- step-up requirements

**Source of truth objects**
- `IdentityAccount`
- `AuthFactor`
- `SessionRevision`
- `DeviceTrustRecord`
- `ChallengeRequest`

**Får aldrig äga**
- tenant membership
- affärsroller
- queue ownership
- sakobjektsbehörighet

**Commands**
- `register_passkey`
- `verify_totp`
- `start_step_up_challenge`
- `complete_step_up_challenge`
- `revoke_session`
- `revoke_device_trust`

**Events**
- `auth.session.started`
- `auth.session.elevated`
- `auth.session.revoked`
- `auth.factor.registered`
- `auth.device_trust.changed`

**State machines**
- `ChallengeRequest`: `requested -> pending -> completed | failed | expired | cancelled`
- `DeviceTrustRecord`: `pending -> trusted -> challenged -> revoked`

### 2. domain-org-auth

**Äger**
- tenant
- company
- memberships
- teams
- roles
- object grants
- queue grants
- delegation
- support scopes

**Source of truth objects**
- `Tenant`
- `Company`
- `Membership`
- `Team`
- `RoleAssignment`
- `ObjectGrant`
- `QueueGrant`
- `Delegation`
- `SupportScopeGrant`

**Får aldrig äga**
- login secrets
- BankID session tokens
- affärsdata för ledger, payroll, HUS eller projects

**Commands**
- `create_tenant`
- `assign_role`
- `grant_object_access`
- `grant_queue_access`
- `approve_delegation`
- `revoke_membership`

**Events**
- `tenant.created`
- `membership.changed`
- `role.assigned`
- `object_grant.changed`
- `queue_grant.changed`
- `delegation.approved`

**State machines**
- `Membership`: `invited -> active -> suspended -> revoked`
- `Delegation`: `draft -> pending_approval -> active -> expired -> revoked`

### 3. domain-core

**Äger**
- shared job metadata
- work items
- feature flags
- emergency disables
- resilience registry
- replay plans
- dead-letter cases
- support/backoffice core primitives

**Source of truth objects**
- `Job`
- `JobAttempt`
- `ReplayPlan`
- `DeadLetterCase`
- `WorkItem`
- `FeatureFlag`
- `EmergencyDisable`
- `RestoreDrillRecord`

**Får aldrig äga**
- domain-specific review decisions
- ledger postings
- business submission payload semantics

**Commands**
- `enqueue_job`
- `schedule_retry`
- `open_dead_letter_case`
- `create_work_item`
- `activate_emergency_disable`
- `record_restore_drill`

**Events**
- `job.enqueued`
- `job.attempted`
- `job.dead_lettered`
- `work_item.created`
- `feature_flag.changed`
- `emergency_disable.activated`

**State machines**
- `Job`: `queued -> claimed -> running -> succeeded | retry_wait | dead_lettered | cancelled`
- `WorkItem`: `open -> claimed -> waiting_input -> resolved -> closed`
- `DeadLetterCase`: `open -> triaged -> replay_ready -> replayed | waived | closed`

### 4. domain-documents

**Äger**
- dokumentarkiv
- versionskedja
- OCR snapshots
- attachment metadata
- archive and evidence hashes

**Source of truth objects**
- `Document`
- `DocumentVersion`
- `OcrSnapshot`
- `DocumentAttachment`
- `ArchiveReceipt`

**Får aldrig äga**
- ekonomisk treatment
- payroll classification
- VAT decision
- journal creation

**Commands**
- `ingest_document`
- `store_ocr_snapshot`
- `attach_document`
- `lock_document_version`

**Events**
- `document.received`
- `document.version.created`
- `document.ocr.completed`
- `document.locked`

**State machines**
- `Document`: `received -> normalized -> archived -> linked -> superseded`
- `OcrSnapshot`: `pending -> completed | failed -> superseded`

### 5. domain-document-classification

**Äger**
- document treatment decisions
- person linking
- split lines
- downstream intents
- classification review reasons

**Source of truth objects**
- `ClassificationCase`
- `ClassificationLine`
- `PersonLinkDecision`
- `DownstreamIntent`
- `ClassificationCorrection`

**Får aldrig äga**
- AP invoice
- payroll pay line
- benefit final posting
- HUS claim

**Commands**
- `propose_classification`
- `approve_classification_case`
- `reject_classification_case`
- `create_downstream_intent`
- `supersede_classification`

**Events**
- `document.classification.proposed`
- `document.classification.review_required`
- `document.classification.approved`
- `document.downstream_intent.created`

**State machines**
- `ClassificationCase`: `draft -> proposed -> in_review -> approved | rejected -> superseded -> closed`
- `DownstreamIntent`: `created -> consumed | cancelled`

### 6. domain-import-cases

**Äger**
- multi-document import bundles
- import validation
- aggregate totals checks
- source system references
- import correction chain

**Source of truth objects**
- `ImportCase`
- `ImportCaseLine`
- `ImportBatch`
- `ImportValidationIssue`

**Får aldrig äga**
- AP final payable
- VAT final mapping
- journal creation

**Commands**
- `open_import_case`
- `attach_import_document`
- `validate_import_case`
- `approve_import_case`
- `supersede_import_case`

**Events**
- `import_case.opened`
- `import_case.validated`
- `import_case.approved`
- `import_case.divergence_detected`

**State machines**
- `ImportCase`: `open -> collecting -> validated -> approved | rejected -> superseded -> closed`

### 7. domain-ledger

**Äger**
- journals
- voucher series
- posting recipes application
- period locks
- reopen requests
- reversal and correction chains

**Source of truth objects**
- `LedgerJournal`
- `LedgerPosting`
- `VoucherSeries`
- `PostingRecipeBinding`
- `LedgerCorrectionLink`
- `PeriodLock`
- `ReopenRequest`

**Får aldrig äga**
- VAT rule evaluation
- payroll tax logic
- HUS eligibility
- direct UI approval state

**Commands**
- `create_journal_from_posting_intent`
- `validate_ledger_journal`
- `post_ledger_journal`
- `reverse_ledger_journal`
- `open_reopen_request`
- `lock_period`

**Events**
- `ledger.journal.validated`
- `ledger.journal.posted`
- `ledger.journal.reversed`
- `ledger.period.locked`
- `ledger.period.reopened`

**State machines**
- `LedgerJournal`: `draft -> validated -> posted -> reversed | superseded`
- `ReopenRequest`: `draft -> pending_review -> approved | rejected -> executed -> closed`

### 8. domain-accounting-method

**Äger**
- accounting method profile
- eligibility assessments
- change requests
- year-end catch-up requirement

**Source of truth objects**
- `AccountingMethodProfile`
- `MethodEligibilityAssessment`
- `MethodChangeRequest`
- `YearEndCatchUpRun`

**Får aldrig äga**
- VAT decision results
- journal entries
- legal-form obligations

**Commands**
- `assess_method_eligibility`
- `activate_accounting_method_profile`
- `request_method_change`
- `run_year_end_catch_up`

**Events**
- `accounting_method.assessed`
- `accounting_method.activated`
- `accounting_method.change_requested`
- `accounting_method.year_end_catch_up.created`

**State machines**
- `AccountingMethodProfile`: `draft -> active -> superseded -> retired`
- `MethodChangeRequest`: `draft -> pending_review -> approved | rejected -> executed`

### 9. domain-fiscal-year

**Äger**
- fiscal year profile
- fiscal years
- period generation
- broken year eligibility
- year change requests

**Source of truth objects**
- `FiscalYearProfile`
- `FiscalYear`
- `FiscalPeriod`
- `FiscalYearChangeRequest`

**Får aldrig äga**
- annual filing package
- VAT decision
- journal creation

**Commands**
- `create_fiscal_year_profile`
- `generate_fiscal_periods`
- `request_fiscal_year_change`
- `activate_fiscal_year`

**Events**
- `fiscal_year.created`
- `fiscal_year.activated`
- `fiscal_year.change_requested`
- `fiscal_period.generated`

**State machines**
- `FiscalYear`: `draft -> active -> hard_closed -> superseded`
- `FiscalYearChangeRequest`: `draft -> pending_review -> approved | rejected -> executed`

### 10. domain-vat

**Äger**
- VAT decisions
- VAT box mapping
- declaration versions
- VAT review cases
- correction chain for VAT submissions

**Source of truth objects**
- `VatDecision`
- `VatDeclarationVersion`
- `VatDeclarationMapping`
- `VatReviewCase`
- `VatCorrectionCase`

**Får aldrig äga**
- invoice truth
- supplier invoice truth
- ledger journals
- bank payments

**Commands**
- `evaluate_vat_treatment`
- `approve_vat_decision`
- `materialize_vat_declaration`
- `submit_vat_declaration`
- `open_vat_correction_case`

**Events**
- `vat.decision.proposed`
- `vat.decision.approved`
- `vat.declaration.materialized`
- `vat.declaration.submission.ready`
- `vat.declaration.corrected`

**State machines**
- `VatDecision`: `proposed -> in_review -> approved | rejected -> superseded`
- `VatDeclarationVersion`: `draft -> validated -> signed -> submitted -> technically_acknowledged -> business_acknowledged -> final_outcome -> correction_required | retry_required -> closed`

### 11. domain-ar

**Äger**
- quotes
- sales orders
- customer invoices
- credit notes
- issue gates
- receivable lifecycle

**Source of truth objects**
- `Quote`
- `SalesOrder`
- `CustomerInvoice`
- `InvoiceVersion`
- `CreditNote`
- `InvoiceIssueGate`

**Får aldrig äga**
- VAT engine
- bank settlement truth
- HUS claim truth
- ledger posting

**Commands**
- `create_quote`
- `approve_quote_version`
- `issue_customer_invoice`
- `issue_credit_note`
- `mark_invoice_ready_for_collection`

**Events**
- `ar.quote.approved`
- `ar.invoice.issued`
- `ar.invoice.cancelled`
- `ar.credit_note.issued`
- `ar.invoice.ready_for_collection`

**State machines**
- `CustomerInvoice`: `draft -> ready_for_issue -> issued -> partially_paid -> paid | credited | cancelled`
- `Quote`: `draft -> approved -> superseded -> won | lost`

### 12. domain-ap

**Äger**
- supplier invoices
- expense/asset split
- payment readiness
- payable lifecycle

**Source of truth objects**
- `SupplierInvoice`
- `SupplierInvoiceVersion`
- `Payable`
- `PaymentReadinessCase`

**Får aldrig äga**
- import case truth
- bank execution truth
- ledger posting
- payroll treatment

**Commands**
- `create_supplier_invoice_from_import`
- `approve_supplier_invoice`
- `mark_supplier_invoice_payment_ready`
- `open_supplier_invoice_correction`

**Events**
- `ap.invoice.created`
- `ap.invoice.posted`
- `ap.invoice.payment_ready`
- `ap.invoice.corrected`

**State machines**
- `SupplierInvoice`: `draft -> in_review -> approved -> posted -> partially_paid -> paid | disputed | corrected`

### 13. domain-banking

**Äger**
- bank accounts
- statements
- statement lines
- payment orders
- payout batches
- reconciliation cases

**Source of truth objects**
- `BankConnection`
- `BankAccount`
- `StatementBatch`
- `StatementLine`
- `PaymentOrder`
- `PayoutBatch`
- `BankReconciliationCase`

**Får aldrig äga**
- ledger posting truth
- AP/AP invoice truth
- tax account truth

**Commands**
- `authorize_bank_connection`
- `import_statement_batch`
- `create_payment_order`
- `submit_payment_order`
- `record_bank_return`
- `open_reconciliation_case`

**Events**
- `bank.connection.authorized`
- `bank.statement.imported`
- `bank.payment_order.submitted`
- `bank.payment_order.returned`
- `bank.reconciliation.review_required`

**State machines**
- `PaymentOrder`: `draft -> validated -> submitted -> technically_acknowledged -> settled | failed | cancelled`
- `StatementBatch`: `received -> normalized -> imported -> reconciled | partially_reconciled`

### 14. domain-tax-account

**Äger**
- skattekontohändelser
- offset relations
- discrepancy cases
- settlement status per liability

**Source of truth objects**
- `TaxAccountEvent`
- `OffsetRelation`
- `TaxDiscrepancyCase`
- `TaxSettlementSnapshot`

**Får aldrig äga**
- AGI source totals
- VAT source totals
- bank truth
- journal creation without approval

**Commands**
- `import_tax_account_event`
- `classify_tax_account_event`
- `offset_tax_account_event`
- `open_tax_discrepancy_case`
- `approve_tax_adjustment_posting_intent`

**Events**
- `tax_account.event.imported`
- `tax_account.event.classified`
- `tax_account.offset.applied`
- `tax_account.discrepancy.opened`

**State machines**
- `TaxAccountEvent`: `imported -> classified -> matched | partially_matched | unmatched -> settled`
- `TaxDiscrepancyCase`: `open -> in_review -> approved_adjustment | no_action -> closed`

### 15. domain-hr

**Äger**
- people
- employees
- employments
- schedules
- statutory profiles
- employment document links

**Source of truth objects**
- `Person`
- `Employee`
- `Employment`
- `EmploymentSchedule`
- `StatutoryProfile`

**Får aldrig äga**
- pay lines
- AGI lines
- benefits valuation
- personalliggare attendance truth

**Commands**
- `create_employee`
- `create_employment`
- `update_statutory_profile`
- `end_employment`

**Events**
- `employee.created`
- `employment.created`
- `employment.changed`
- `statutory_profile.updated`

**State machines**
- `Employment`: `draft -> active -> suspended -> ended`

### 16. domain-time

**Äger**
- time entries
- absence entries
- approvals
- payable hours baselines

**Source of truth objects**
- `TimeEntry`
- `AbsenceEntry`
- `TimeApproval`
- `TimePeriod`

**Får aldrig äga**
- personalliggare legal attendance truth
- pay calculation
- project cost snapshots

**Commands**
- `record_time_entry`
- `approve_time_entry`
- `record_absence`
- `lock_time_period`

**Events**
- `time.entry.recorded`
- `time.entry.approved`
- `absence.recorded`
- `time.period.locked`

**State machines**
- `TimeEntry`: `draft -> submitted -> approved | rejected -> locked`
- `AbsenceEntry`: `draft -> approved -> locked | corrected`

### 17. domain-balances

**Äger**
- generic balance accounts
- transactions
- carry-forward
- expiry

**Source of truth objects**
- `BalanceType`
- `BalanceAccount`
- `BalanceTransaction`
- `CarryForwardRun`
- `ExpiryRun`

**Får aldrig äga**
- payroll pay lines
- time truth
- agreement truth

**Commands**
- `open_balance_account`
- `post_balance_transaction`
- `run_balance_carry_forward`
- `run_balance_expiry`

**Events**
- `balance.account.opened`
- `balance.transaction.posted`
- `balance.carry_forward.completed`
- `balance.expiry.completed`

**State machines**
- `BalanceAccount`: `open -> active -> closed`
- `BalanceTransaction`: `draft -> posted -> corrected | voided_by_correction`

### 18. domain-collective-agreements

**Äger**
- agreement families
- versions
- tenant assignments
- local supplements
- compiled rulepack outputs

**Source of truth objects**
- `AgreementFamily`
- `AgreementVersion`
- `TenantAgreementAssignment`
- `LocalSupplement`
- `AgreementExtractionRun`
- `AgreementRulepackVersion`

**Får aldrig äga**
- payroll result
- HR employment truth
- balances truth

**Commands**
- `ingest_agreement_document`
- `extract_agreement_candidate`
- `approve_agreement_version`
- `activate_tenant_assignment`
- `compile_agreement_rulepack`

**Events**
- `agreement.document.ingested`
- `agreement.extraction.completed`
- `agreement.version.approved`
- `agreement.assignment.activated`
- `agreement.rulepack.compiled`

**State machines**
- `AgreementVersion`: `draft -> extracted -> in_review -> approved -> compiled -> active -> superseded`
- `TenantAgreementAssignment`: `draft -> active -> superseded -> retired`

### 19. domain-payroll

**Äger**
- pay periods
- pay runs
- pay lines
- deductions
- AGI constituents and submission periods
- payroll corrections
- payment batches for salary
- garnishment calculations

**Source of truth objects**
- `PayRun`
- `PayLine`
- `AgiSubmissionPeriod`
- `AgiEmployeeConstituent`
- `PayrollCorrection`
- `PayrollPaymentBatch`
- `GarnishmentDeductionResult`

**Får aldrig äga**
- raw document archive
- time truth
- bank settlement truth
- ledger journal creation

**Commands**
- `calculate_pay_run`
- `approve_pay_run`
- `post_pay_run`
- `materialize_agi_period`
- `submit_agi_period`
- `open_payroll_correction`
- `calculate_garnishment`

**Events**
- `payroll.run.calculated`
- `payroll.run.approved`
- `payroll.run.posted`
- `payroll.agi.submission.ready`
- `payroll.agi.submitted`
- `payroll.correction.opened`
- `payroll.garnishment.calculated`

**State machines**
- `PayRun`: `draft -> calculating -> calculated -> approved -> posted -> payment_prepared -> closed -> corrected`
- `AgiSubmissionPeriod`: `draft -> ready_for_sign -> signed -> submitted -> technically_acknowledged -> business_acknowledged -> correction_required | retry_required -> closed`

### 20. domain-benefits

**Äger**
- benefit events
- benefit valuations
- taxability decisions
- payroll dispatch intents

**Source of truth objects**
- `BenefitEvent`
- `BenefitValuation`
- `BenefitDecision`
- `BenefitPayrollIntent`

**Får aldrig äga**
- payroll pay lines
- AGI submission
- ledger journals

**Commands**
- `create_benefit_event`
- `value_benefit`
- `approve_benefit_event`
- `dispatch_benefit_to_payroll`

**Events**
- `benefit.event.created`
- `benefit.event.review_required`
- `benefit.event.approved`
- `benefit.intent.created`

**State machines**
- `BenefitEvent`: `draft -> classified -> valued -> approved -> dispatched_to_payroll -> corrected -> closed`

### 21. domain-travel

**Äger**
- trips
- travel expenses
- traktamente calculations
- mileage decisions
- payroll intents and AP intents for travel

**Source of truth objects**
- `TravelTrip`
- `TravelExpense`
- `AllowanceDecision`
- `MileageDecision`

**Får aldrig äga**
- payroll pay lines
- bank card statement truth
- ledger journals

**Commands**
- `record_trip`
- `classify_travel_expense`
- `calculate_allowance`
- `dispatch_travel_to_payroll_or_ap`

**Events**
- `travel.trip.recorded`
- `travel.expense.classified`
- `travel.allowance.calculated`
- `travel.intent.created`

**State machines**
- `TravelExpense`: `draft -> in_review -> approved -> dispatched -> corrected -> closed`

### 22. domain-pension

**Äger**
- pension bases
- salary exchange agreements
- special payroll tax intents
- pension provider export intents

**Source of truth objects**
- `PensionBase`
- `SalaryExchangeAgreement`
- `PensionInstruction`
- `SpecialPayrollTaxIntent`

**Får aldrig äga**
- payroll run truth
- provider transport truth
- ledger journals

**Commands**
- `activate_salary_exchange_agreement`
- `calculate_pension_base`
- `create_pension_instruction`

**Events**
- `pension.salary_exchange.activated`
- `pension.base.calculated`
- `pension.instruction.created`

### 23. domain-projects

**Äger**
- generic project core
- budgets
- forecasts
- profitability snapshots
- work packages
- cost allocation snapshots

**Source of truth objects**
- `Project`
- `ProjectBudgetVersion`
- `ProjectForecastSnapshot`
- `ProjectActualCostSnapshot`
- `ProjectProfitabilitySnapshot`
- `WorkPackage`

**Får aldrig äga**
- field dispatch truth
- personalliggare legal attendance truth
- ledger posting
- payroll run truth

**Commands**
- `create_project`
- `approve_project_budget`
- `materialize_profitability_snapshot`
- `allocate_cost_to_project`

**Events**
- `project.created`
- `project.budget.approved`
- `project.snapshot.materialized`
- `project.cost_allocated`

**State machines**
- `Project`: `draft -> active -> on_hold -> completed -> closed`
- `ProjectBudgetVersion`: `draft -> approved -> superseded`

### 24. domain-field

**Äger**
- work orders
- service orders
- dispatch assignments
- material usage
- on-site evidence
- signatures
- sync envelopes and conflict records

**Source of truth objects**
- `WorkOrder`
- `ServiceOrder`
- `DispatchAssignment`
- `MaterialUsage`
- `FieldEvidence`
- `SignatureRecord`
- `SyncEnvelope`
- `ConflictRecord`

**Får aldrig äga**
- project truth
- personalliggare legal attendance truth
- invoice issuance truth
- ledger posting

**Commands**
- `create_work_order`
- `dispatch_work_order`
- `record_material_usage`
- `capture_signature`
- `sync_field_envelope`
- `resolve_sync_conflict`

**Events**
- `field.work_order.created`
- `field.dispatch.assigned`
- `field.material.recorded`
- `field.signature.captured`
- `field.conflict.detected`
- `field.conflict.resolved`

**State machines**
- `WorkOrder`: `draft -> planned -> dispatched -> in_progress -> completed -> invoicing_ready -> closed`
- `SyncEnvelope`: `queued_offline -> sent -> acknowledged | conflicted`

### 25. domain-personalliggare

**Äger**
- workplace registration
- attendance events and corrections
- industry pack activation
- attendance exports
- employer/contractor attendance snapshots

**Source of truth objects**
- `Workplace`
- `WorkplaceRegistration`
- `AttendanceEvent`
- `AttendanceCorrection`
- `IndustryPackActivation`
- `AttendanceExport`

**Får aldrig äga**
- time entries
- payroll hours
- project budget
- ID06 card truth

**Commands**
- `register_workplace`
- `capture_attendance_event`
- `correct_attendance_event`
- `export_attendance_control_file`

**Events**
- `personalliggare.workplace.registered`
- `personalliggare.attendance.captured`
- `personalliggare.attendance.corrected`
- `personalliggare.export.created`

**State machines**
- `WorkplaceRegistration`: `draft -> registered -> active -> suspended -> closed`
- `AttendanceEvent`: `captured -> synced -> corrected | voided_by_correction`

### 26. domain-id06

**Äger**
- person-company binding against ID06 evidence
- card lifecycle
- workplace assignment
- work pass generation
- loggningsindex linkage
- access validation results

**Source of truth objects**
- `ID06Identity`
- `ID06Card`
- `EmployerBinding`
- `WorkplaceAssignment`
- `WorkPass`
- `ID06AccessValidation`
- `DeviceAttestation`

**Får aldrig äga**
- personalliggare attendance truth
- project truth
- payroll truth
- bank or auth credentials

**Commands**
- `register_id06_identity`
- `bind_id06_card`
- `assign_workplace_access`
- `validate_id06_access`
- `generate_work_pass`
- `revoke_id06_binding`

**Events**
- `id06.identity.registered`
- `id06.card.bound`
- `id06.workplace_assigned`
- `id06.access.validated`
- `id06.work_pass.generated`
- `id06.binding.revoked`

**State machines**
- `ID06Card`: `registered -> active -> suspended -> revoked -> expired`
- `WorkPass`: `opened -> closed -> corrected | invalidated`

### 27. domain-egenkontroll

**Äger**
- checklist templates
- checklist instances
- deviations
- sign-off

**Source of truth objects**
- `ChecklistTemplate`
- `ChecklistInstance`
- `Deviation`
- `ChecklistSignoff`

**Får aldrig äga**
- field dispatch
- project budgets
- invoice truth

### 28. domain-hus

**Äger**
- HUS classification outcome
- case lifecycle
- buyer allocation
- claim versions
- claim readiness blockers
- claim decision and recovery candidates

**Source of truth objects**
- `HusCase`
- `HusServiceLine`
- `HusBuyerAllocation`
- `HusClaimVersion`
- `HusDecision`
- `HusRecoveryCandidate`

**Får aldrig äga**
- invoice truth
- customer payment truth
- bank settlement truth
- ledger journal creation

**Commands**
- `classify_hus_case`
- `lock_hus_claim_version`
- `submit_hus_claim`
- `record_hus_decision`
- `open_hus_recovery_case`

**Events**
- `hus.case.classified`
- `hus.claim.version_locked`
- `hus.claim.submitted`
- `hus.claim.decided`
- `hus.recovery.opened`

**State machines**
- `HusCase`: `draft -> classified -> invoice_blocked | invoiced -> customer_partially_paid | customer_paid -> claim_draft -> claim_submitted -> claim_partially_accepted | claim_accepted | claim_rejected -> paid_out | recovery_pending -> closed`

### 29. domain-reporting

**Äger**
- report snapshots
- saved views
- report derivations from locked source objects
- close blocker aggregations

**Source of truth objects**
- `ReportSnapshot`
- `SavedView`
- `CloseBlockerAggregate`

**Får aldrig äga**
- ledger truth
- VAT decisions
- annual filing truth

### 30. domain-annual-reporting

**Äger**
- annual packages
- evidence packs
- signoff chain
- filing submissions and corrections

**Source of truth objects**
- `AnnualPackage`
- `AnnualEvidencePack`
- `AnnualFilingSubmission`
- `AnnualCorrectionCase`

**Får aldrig äga**
- fiscal year truth
- legal form truth
- ledger truth

**Commands**
- `build_annual_package`
- `start_annual_signoff`
- `submit_annual_filing`
- `open_annual_correction_case`

**Events**
- `annual.package.built`
- `annual.package.signed`
- `annual.filing.submitted`
- `annual.filing.decision.recorded`

**State machines**
- `AnnualPackage`: `draft -> ready_for_signoff -> signoff_in_progress -> signed -> submitted -> receipt_received -> correction_required | superseded -> closed`
- `AnnualFilingSubmission`: `draft -> sent -> technical_receipt_received -> domain_accepted | domain_rejected | transport_failed -> superseded`

### 31. domain-integrations

**Äger**
- provider adapters
- connections
- credentials metadata
- consents
- contract tests
- operation receipts
- webhook subscriptions and deliveries
- generic submission transport

**Source of truth objects**
- `IntegrationConnection`
- `CredentialSetMetadata`
- `ConsentGrant`
- `ProviderHealthRecord`
- `IntegrationOperation`
- `WebhookSubscription`
- `WebhookDelivery`
- `SubmissionEnvelope`
- `SubmissionReceipt`

**Får aldrig äga**
- payroll AGI semantics
- VAT semantics
- HUS semantics
- annual package semantics
- ledger truth

**Commands**
- `create_connection`
- `refresh_consent`
- `run_contract_test`
- `execute_integration_operation`
- `deliver_webhook`
- `submit_envelope`
- `record_submission_receipt`

**Events**
- `integration.connection.created`
- `integration.connection.authorized`
- `integration.health.changed`
- `integration.operation.succeeded`
- `integration.operation.failed`
- `webhook.delivery.attempted`
- `webhook.delivery.dead_lettered`
- `submission.receipt.recorded`

**State machines**
- `IntegrationOperation`: `created -> queued -> running -> succeeded | failed | dead_lettered`
- `WebhookDelivery`: `queued -> attempting -> delivered | retry_wait | dead_lettered | disabled`
- `SubmissionEnvelope`: `draft -> validated -> signed -> submitted -> technical_acknowledgement -> business_acknowledgement -> final_outcome | retry_required | correction_required -> closed`

### 32. domain-notifications

**Äger**
- notifications
- deliveries
- user actions
- dedupe rules

**Source of truth objects**
- `Notification`
- `NotificationDelivery`
- `NotificationAction`

### 33. domain-activity

**Äger**
- activity entries
- timeline relations
- actor/object/event projections

**Source of truth objects**
- `ActivityEntry`
- `ActivityRelation`

### 34. domain-search

**Äger**
- projection registry
- indexing status
- search orchestration
- not business truth

**Source of truth objects**
- `SearchProjectionContract`
- `IndexStatus`
- `SearchCursor`
- `SearchResultPreview`

## Förbjudna kopplingar

1. UI -> database direct writes
2. UI -> ledger posting generation
3. UI -> permission calculation
4. UI -> search permission trimming
5. AR -> VAT decisioning utan VAT engine
6. AP -> import aggregation utan import-case engine
7. documents -> direct payroll or ledger writes
8. benefits -> AGI lines utan payroll
9. time -> pay calculation
10. projects -> journal creation
11. field -> invoice issue
12. personalliggare -> reuse of time entries as attendance truth
13. ID06 -> attendance truth
14. integrations -> direct mutation of business object status efter submit
15. support/backoffice -> direkt mutation av signed/submitted objects
16. AI automation -> bypass av review center, rulepack registry eller policy hooks
17. search index -> source of truth
18. notification center -> work-item truth
19. activity feed -> audit truth
20. annual reporting -> självderiverad legal form eller fiscal year

## Signaler som får skapa ledger posting intents

Följande affärssignaler får skapa `PostingIntent`. De får inte skapa journalrader direkt.

- `ar.invoice.issued`
- `ar.credit_note.issued`
- `ap.invoice.posted`
- `payroll.run.posted`
- `bank.payment_order.settled`
- `bank.statement.line.matched_and_approved`
- `tax_account.event.classified_and_approved`
- `hus.claim.accepted_or_recovered_when_accounting_effect_arises`
- `annual.close.adjustment.approved`
- `manual_journal.approved`
- `asset.capitalization.approved`
- `expense.accrual.approved`

Varje `PostingIntent` måste bära:
- `posting_intent_id`
- `source_domain`
- `source_object_type`
- `source_object_id`
- `economic_effect_type`
- `posting_recipe_code`
- `rulepack_code`
- `rulepack_version`
- `effective_date`
- `currency`
- `amounts`
- `dimensions`
- `reason_code`
- `approval_ref_when_required`

## Signaler som aldrig får ge direktbokning

- `document.received`
- `document.ocr.completed`
- `document.classification.proposed`
- `time.entry.recorded`
- `time.entry.approved`
- `review_item.approved`
- `notification.created`
- `activity.recorded`
- `personalliggare.attendance.captured`
- `id06.access.validated`
- `webhook.received`
- `integration.operation.succeeded`
- `ai.classification.suggested`
- `search.projection.materialized`
- `project.snapshot.materialized`
- `support.impersonation.started`

## Correction chains

Varje reglerat objekt måste ha explicit correction lineage.

### Journaler
`original_journal_id -> reversal_journal_id -> replacement_journal_id`

### VAT
`vat_decision_id -> superseding_vat_decision_id`
`vat_declaration_version_id -> correction_version_id`

### Payroll
`pay_run_id -> correction_pay_run_id`
`agi_submission_period_id -> correction_period_id`

### HUS
`hus_claim_version_id -> superseding_claim_version_id`
`hus_decision_id -> recovery_case_id`

### Annual reporting
`annual_package_id -> superseding_package_id`
`annual_filing_submission_id -> correction_submission_id`

### Attendance
`attendance_event_id -> correction_event_id`
`work_pass_id -> corrected_work_pass_id`

## Reviewgränser

Review center måste skapas när:
- confidence är låg
- rulepack säger review required
- personpåverkan kan ändra lön, AGI, förmån, pension eller nettolöneavdrag
- VAT är tvetydig
- HUS blockerlistan inte är grön
- tax account mismatch kvarstår
- periodlås kräver reopen
- collective agreement extraction saknar entydig canonical mapping
- ID06/attendance/contractor relation saknar bevis
- break-glass eller write-capable impersonation begärs

## Auditkrav

Alla kommandon som påverkar reglerad data måste auditlogga:
- aktör
- roll/scope
- tenant
- objekt
- före/efter-version
- rulepack code/version
- reason code
- approvals
- evidence refs
- correlation id
- source surface
- client type

## Exit gate

Detta dokument är uppfyllt först när:
- alla ovanstående bounded contexts finns i kod eller explicit markerats som nya packages att skapa
- source of truth är implementerat per objektfamilj
- förbjudna kopplingar verkställs i kod
- posting intents används konsekvent
- correction chains är materialiserade och testade
- audit, review och receipt ownership är separerade
- UI och integrationsytor endast konsumerar read models och commands, aldrig affärssanning direkt

