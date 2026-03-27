> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-007
- Title: Master Golden Scenario Catalog
- Status: Binding control baseline
- Owner: Product architecture, compliance architecture and QA architecture
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master golden scenario catalog
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-policy-matrix.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - documents
  - document classification
  - ledger
  - VAT
  - AR
  - AP
  - payroll
  - benefits
  - HUS
  - personalliggare
  - tax account
  - annual reporting
  - projects
  - field
- Related code areas:
  - packages/domain-*
  - packages/document-engine/*
  - packages/rule-engine/*
  - apps/api/*
  - apps/desktop-web/*
  - apps/field-mobile/*
  - tests/golden/*
  - tests/unit/*
  - tests/integration/*
  - tests/e2e/*
- Related future documents:
  - docs/test-plans/document-person-payroll-agi-tests.md
  - docs/test-plans/accounting-method-tests.md
  - docs/test-plans/fiscal-year-and-broken-year-tests.md
  - docs/test-plans/hus-edge-case-tests.md
  - docs/test-plans/payroll-migration-and-balance-tests.md
  - docs/test-plans/annual-reporting-by-legal-form-tests.md

# Purpose

Detta dokument är den bindande sanningskatalogen för tvärdomänscenarier som systemet måste klara.

Varje scenario ska senare mappas till:

- rulepacks
- policies
- domain tests
- integration tests
- E2E tests
- UI blockers
- journalutfall
- payroll- och AGI-effekter
- VAT-, HUS- och submissionutfall
- audit trail
- replay/idempotens

# Scenario template

Varje scenario ska minst beskrivas med:

- Scenario ID
- Title
- Business context
- Actors
- Preconditions
- Inputs
- Rulepacks involved
- Required decisions
- Expected UI blockers or prompts
- Expected accounting impact
- Expected payroll impact
- Expected AGI impact
- Expected VAT impact
- Expected HUS impact
- Expected documents and receipts
- Expected audit trail
- Negative path
- Replay/idempotency expectation

# Cross-domain scenario groups

1. Document classification and personal impact
2. Import, VAT and accounting method
3. Payroll, balances and AGI
4. HUS and project-linked billing
5. Personalliggare and field
6. Close, annual reporting and tax account
7. Corrections, locked states and replay

# Full scenario catalog

## GS-001 — Private spend on company card

- **Business context:** Anställd har gjort privat köp med företagskort.
- **Actors:** Employee, reviewer, finance, payroll if settlement via net deduction.
- **Preconditions:** Dokument finns, företagskort är kopplat till anställd, period är öppen.
- **Inputs:** Kvitto, korttransaktion, anställd, belopp, merchant data.
- **Rulepacks involved:** `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`, `SE-BEN-WELLNESS` if misclassified attempt, `SE-INVOICE-LEGAL-FIELDS` not relevant.
- **Required decisions:** Är köpet privat, ska det återbetalas kontant, via nettolöneavdrag eller behandlas som förmån.
- **Expected UI blockers or prompts:** Blockera bolagskostnad och ingående moms när privatindikator är aktiv. Kräver behandlingstyp innan approval.
- **Expected accounting impact:** Debit employee receivable or payroll deduction clearing, credit card clearing. Ingen bolagskostnad. Ingen avdragsgill moms.
- **Expected payroll impact:** Ingen om kontant återbetalning. Nettolöneavdrag om vald settlement. Förmån endast om bolaget avstår återkrav.
- **Expected AGI impact:** Ingen vid receivable/net deduction. Ja om waived receivable becomes taxable benefit.
- **Expected VAT impact:** No deductible input VAT.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Original document, card transaction ref, review decision, settlement receipt.
- **Expected audit trail:** Document received, classification proposed, reviewer decision, resulting AP/payroll/receivable command, settlement completion.
- **Negative path:** User tries to post as expense. System blocks on private-spend classification and missing approval decision.
- **Replay/idempotency expectation:** Same document hash plus same card transaction ref must not create duplicate receivable or duplicate deduction.

## GS-002 — Reimbursable outlay

- **Business context:** Anställd har lagt ut privat för bolagets räkning.
- **Actors:** Employee, finance reviewer, approver.
- **Preconditions:** Valid receipt exists, employee and expense period known.
- **Inputs:** Receipt, employee, amount, cost center/project, attestation.
- **Rulepacks involved:** `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`, `SE-CAPITALIZATION` when asset candidate exists, `SE-VAT-CORE`.
- **Required decisions:** Is it company cost, is VAT deductible, is it reimbursable rather than benefit.
- **Expected UI blockers or prompts:** Require employee, attestation and treatment. Prompt if VAT uncertain or threshold/asset question exists.
- **Expected accounting impact:** Debit cost or asset, debit deductible VAT when allowed, credit employee outlay liability.
- **Expected payroll impact:** None if paid outside payroll. Optional payroll reimbursement route must remain reimbursement, not salary.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Deductible only if receipt and scenario support input VAT.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Receipt, expense claim or reimbursement record, approval record, payout receipt.
- **Expected audit trail:** Document archive, classification decision, reimbursement approval, payout completion.
- **Negative path:** Missing employee or invalid receipt blocks reimbursement approval.
- **Replay/idempotency expectation:** Duplicate upload of same receipt must trigger duplicate detection and must not create extra liability.

## GS-003 — Taxable benefit

- **Business context:** Arbetsgivaren bekostar något som ska behandlas som skattepliktig förmån.
- **Actors:** Finance reviewer, payroll specialist.
- **Preconditions:** Benefit-supporting document or manual benefit event exists.
- **Inputs:** Benefit type, value basis, employee, period.
- **Rulepacks involved:** `SE-AGI-CORE`, `SE-EMPLOYER-CONTRIBUTIONS`, `SE-MEAL-BENEFITS` or other benefit pack.
- **Required decisions:** Benefit type, valuation basis, payroll period, any net deduction.
- **Expected UI blockers or prompts:** Must choose benefit category and valuation basis before payroll ingestion. Review required if document-driven.
- **Expected accounting impact:** No direct posting from documents. Posting happens via payroll posting on approved pay run.
- **Expected payroll impact:** Benefit line added to pay run, tax base increased, possibly no cash payout increase.
- **Expected AGI impact:** Benefit amount included in AGI on correct individual line mapping.
- **Expected VAT impact:** According to original purchase treatment; benefit itself does not create new VAT logic.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Benefit event, payroll calculation snapshot, AGI submission receipt, payroll posting receipt.
- **Expected audit trail:** Document or manual event, reviewer decision, payroll inclusion, AGI receipt, posting id.
- **Negative path:** Attempt to post benefit directly to ledger without payroll should fail.
- **Replay/idempotency expectation:** Reprocessing the same benefit event into the same pay run must not duplicate the line.

## GS-004 — Net salary deduction

- **Business context:** Employee liability or agreed deduction recovered via nettolöneavdrag.
- **Actors:** Finance, payroll.
- **Preconditions:** Approved receivable or deduction reason exists.
- **Inputs:** Employee, amount, reason, deduction period.
- **Rulepacks involved:** `SE-AGI-CORE`, `TENANT-BALANCES` only if balance-linked, `TENANT-COLLECTIVE-AGREEMENT` when agreement limits matter.
- **Required decisions:** Deduction amount, whether deduction is settlement only or linked to benefit.
- **Expected UI blockers or prompts:** Deduction cannot exceed available net payout if policy forbids negative or insufficient pay outcome.
- **Expected accounting impact:** Receivable cleared against payroll settlement clearing when pay run posts.
- **Expected payroll impact:** Net pay reduced. Gross and tax base unchanged unless linked benefit exists.
- **Expected AGI impact:** None unless paired benefit exists.
- **Expected VAT impact:** None.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Deduction authorization or decision, pay run snapshot, payslip.
- **Expected audit trail:** Receivable creation, deduction setup, payroll approval, settlement posting.
- **Negative path:** If deduction would create prohibited negative net pay, system blocks or splits according to policy.
- **Replay/idempotency expectation:** A deduction instruction may only be consumed once per targeted pay run version.

## GS-005 — Wellness within threshold

- **Business context:** Friskvårdskvitto inom gällande skattefri gräns och godkänd aktivitet.
- **Actors:** Employee, reviewer, payroll or AP depending on payment mode.
- **Preconditions:** Employee identified, activity in approved catalog, current year count below threshold.
- **Inputs:** Receipt date, amount, employee, activity code, prior annual total.
- **Rulepacks involved:** `SE-BEN-WELLNESS`, `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`.
- **Required decisions:** Approved activity, correct year, correct employee.
- **Expected UI blockers or prompts:** Require employee and activity. Warning if near annual threshold.
- **Expected accounting impact:** Company cost or reimbursement liability depending payment path. No taxable benefit.
- **Expected payroll impact:** None or only non-taxable reimbursement handling if payroll route chosen.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Follow expense treatment rules for underlying receipt.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Receipt, wellness decision snapshot, annual counter snapshot.
- **Expected audit trail:** Decision references threshold count and activity class.
- **Negative path:** Unsupported activity or missing employee blocks approval.
- **Replay/idempotency expectation:** Annual counter must not double count same receipt on replay.

## GS-006 — Wellness over threshold

- **Business context:** Friskvårdskvitto passerar eller ligger över skattefri gräns.
- **Actors:** Reviewer, payroll.
- **Preconditions:** Employee identified, threshold count already near or exceeded.
- **Inputs:** Receipt, employee, amount, prior annual total.
- **Rulepacks involved:** `SE-BEN-WELLNESS`, `SE-AGI-CORE`, `SE-EMPLOYER-CONTRIBUTIONS`.
- **Required decisions:** Which part if any remains tax-free under the chosen rule model, and from which point taxable benefit applies.
- **Expected UI blockers or prompts:** Must show threshold history and require confirmation before payroll impact intent is created.
- **Expected accounting impact:** Expense side stays tied to purchase or reimbursement. Taxable benefit impact posts via payroll.
- **Expected payroll impact:** Taxable benefit line created for taxable portion or full amount depending rule outcome.
- **Expected AGI impact:** Taxable portion included.
- **Expected VAT impact:** Underlying receipt VAT follows expense rules.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Receipt, threshold evaluation, benefit event, payroll artifacts.
- **Expected audit trail:** Annual counter snapshot and crossover explanation must be stored.
- **Negative path:** System must not silently treat over-threshold case as tax-free.
- **Replay/idempotency expectation:** Re-evaluating after policy update must preserve original historical decision unless explicit correction path is invoked.

## GS-007 — Mixed document split

- **Business context:** Ett dokument innehåller flera ekonomiska behandlingar.
- **Actors:** Reviewer, finance, payroll when relevant.
- **Preconditions:** OCR extracted lines or manual split possible.
- **Inputs:** One document with multiple lines or manual allocation.
- **Rulepacks involved:** `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`, `SE-CAPITALIZATION`, `SE-VAT-CORE`.
- **Required decisions:** Split into company cost, private share, project allocations, asset share and possibly benefit.
- **Expected UI blockers or prompts:** Approval disabled until every amount is fully assigned and total split equals gross total.
- **Expected accounting impact:** Multiple postings or downstream intents from one original document.
- **Expected payroll impact:** Only the lines classified to payroll/benefit/deduction create payroll effects.
- **Expected AGI impact:** Only payroll-related lines affect AGI.
- **Expected VAT impact:** Per split line based on eligible VAT treatment.
- **Expected HUS impact:** None unless HUS-related work line exists.
- **Expected documents and receipts:** Original document, split model, downstream object refs.
- **Expected audit trail:** Full amount continuity from original total to all splits.
- **Negative path:** Sum mismatch or unassigned remainder blocks approval.
- **Replay/idempotency expectation:** Reopening and resplitting creates new decision history but preserves original chain.

## GS-008 — Import with later customs

- **Business context:** Supplier invoice arrives before tullhandling och importmomsunderlag.
- **Actors:** AP, VAT reviewer.
- **Preconditions:** Import scenario detected.
- **Inputs:** Supplier invoice first, customs documents later.
- **Rulepacks involved:** `SE-VAT-CORE`, `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`.
- **Required decisions:** Create import case, hold final VAT and import treatment until customs leg received.
- **Expected UI blockers or prompts:** AP may draft invoice but final import VAT treatment flagged incomplete until customs leg attached.
- **Expected accounting impact:** Initial supplier invoice may book purchase and payable according to method. Import VAT and customs not finalized until later documents.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Import VAT decision waits for customs assessment details; unsupported direct deduction blocked.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Supplier invoice, customs doc, import case record.
- **Expected audit trail:** Import case links all documents and later recalculation.
- **Negative path:** Attempt to finalize import VAT without customs document must block.
- **Replay/idempotency expectation:** Attaching same customs doc twice must not duplicate customs leg.

## GS-009 — Import with later freight/spedition

- **Business context:** Freight or spedition invoice arrives after main import invoice.
- **Actors:** AP, VAT reviewer.
- **Preconditions:** Import case exists.
- **Inputs:** Main import invoice, later freight/spedition invoice.
- **Rulepacks involved:** `SE-VAT-CORE`, `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES`.
- **Required decisions:** Add later charges to import case and classify their VAT/cost treatment.
- **Expected UI blockers or prompts:** Prompt to attach new doc to existing import case if supplier, dates or references match.
- **Expected accounting impact:** Additional payable or clearing entries without corrupting original import chain.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Freight/spedition lines follow their own VAT logic and may affect import cost base depending rule outcome.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Freight invoice, spedition invoice, import case recalculation receipt.
- **Expected audit trail:** Original import case version plus recalculated version.
- **Negative path:** Posting as ordinary domestic supplier invoice without link to import case should raise review warning or blocker by policy.
- **Replay/idempotency expectation:** Same later charge must not be linked twice.

## GS-010 — Asset candidate over threshold

- **Business context:** Dokument avser anskaffning som ska aktiveras som anläggningstillgång.
- **Actors:** AP reviewer, finance.
- **Preconditions:** Amount and useful life indicate potential asset.
- **Inputs:** Invoice lines, useful life estimate, grouping key.
- **Rulepacks involved:** `SE-CAPITALIZATION`, `SE-VAT-CORE`.
- **Required decisions:** Asset versus expense, asset class, start date for depreciation.
- **Expected UI blockers or prompts:** Mandatory asset review if threshold/useful life criteria met.
- **Expected accounting impact:** Debit asset acquisition account and deductible VAT if allowed, credit payable or clearing. Later depreciation lifecycle begins.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Standard according to purchase type.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Invoice, asset creation record, capitalization decision.
- **Expected audit trail:** Rulepack result and reviewer override if any.
- **Negative path:** User tries direct expense with no review; system blocks on capitalization candidate.
- **Replay/idempotency expectation:** Same document must not create duplicate asset record.

## GS-011 — Asset candidate with natural connection

- **Business context:** Flera relaterade inköp ska bedömas tillsammans som naturligt samband.
- **Actors:** AP reviewer, finance.
- **Preconditions:** Multiple documents or lines belong to same functional unit.
- **Inputs:** Grouping key, related invoices, dates, amounts.
- **Rulepacks involved:** `SE-CAPITALIZATION`.
- **Required decisions:** Grouped assessment across linked items.
- **Expected UI blockers or prompts:** Prompt reviewer to link related lines/documents before final expense decision.
- **Expected accounting impact:** Combined capitalization if grouped total and use criteria require it.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Underlying purchase VAT unchanged by grouping decision.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Linked document set, grouping decision evidence.
- **Expected audit trail:** Natural-connection reasoning must be stored.
- **Negative path:** Artificial split to stay under threshold must be blocked by grouping review.
- **Replay/idempotency expectation:** Recalculation preserves group history and does not double-post.

## GS-012 — Cash accounting method

- **Business context:** Company uses kontantmetod. Customer invoice issued before payment and year-end handling matters.
- **Actors:** Finance.
- **Preconditions:** Company accounting method is cash. Fiscal year known.
- **Inputs:** Invoice issue date, payment date, fiscal year end, open item state.
- **Rulepacks involved:** `SE-ACCOUNTING-METHOD`, `SE-VAT-CORE`, `SE-FISCAL-YEAR`.
- **Required decisions:** When to post to ledger and when year-end accrual/upbooking is needed.
- **Expected UI blockers or prompts:** Method shown clearly in company profile and invoice/accounting views. Year-end close must prompt for unpaid items.
- **Expected accounting impact:** During year, reskontra exists but ledger/VAT follow payment timing. At year-end, unpaid items are booked up according to method rules.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Follows cash method timing.
- **Expected HUS impact:** HUS still requires payment evidence before claim.
- **Expected documents and receipts:** Method profile, year-end method adjustment records.
- **Expected audit trail:** Method version used on each posting.
- **Negative path:** Mid-year method change without change request must be blocked.
- **Replay/idempotency expectation:** Replaying payment import must not create duplicate ledger recognition.

## GS-013 — Invoice accounting method

- **Business context:** Company uses faktureringsmetod. Standard customer invoice flow.
- **Actors:** Finance.
- **Preconditions:** Method profile set to invoice.
- **Inputs:** Issue date, payment date.
- **Rulepacks involved:** `SE-ACCOUNTING-METHOD`, `SE-VAT-CORE`.
- **Required decisions:** Issue readiness and VAT classification.
- **Expected UI blockers or prompts:** None beyond invoice legality and VAT rules.
- **Expected accounting impact:** On issue, receivable and revenue/VAT posted. Payment later clears receivable.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** VAT recognized on invoice according to method and scenario.
- **Expected HUS impact:** HUS basis may be created at issue but claim still waits for payment rules.
- **Expected documents and receipts:** Invoice, delivery receipt, payment allocation.
- **Expected audit trail:** Method version stored with posting.
- **Negative path:** System must not defer ledger posting until payment under invoice method.
- **Replay/idempotency expectation:** Repeated delivery attempt must not create extra postings.

## GS-014 — Broken fiscal year

- **Business context:** Company uses brutet räkenskapsår.
- **Actors:** Finance, close owner.
- **Preconditions:** Fiscal year profile approved and periods generated.
- **Inputs:** Fiscal year start/end, reporting period, close state.
- **Rulepacks involved:** `SE-FISCAL-YEAR`, `SE-ACCOUNTING-METHOD`, `SE-CLOSE-BLOCKERS`.
- **Required decisions:** Period boundaries, short/extended year handling, close sequence.
- **Expected UI blockers or prompts:** All close, report and annual screens must show the actual fiscal year, not calendar year shortcuts.
- **Expected accounting impact:** Period locks, closing and reporting follow defined fiscal periods.
- **Expected payroll impact:** Payroll remains monthly by payroll calendar but reports reconcile against fiscal year in close.
- **Expected AGI impact:** None directly beyond reconciliation.
- **Expected VAT impact:** VAT periods may differ from fiscal year and must reconcile explicitly.
- **Expected HUS impact:** None directly.
- **Expected documents and receipts:** Fiscal year approval, period generation records.
- **Expected audit trail:** Any year-change request fully audited.
- **Negative path:** Retroactive edit of active fiscal year must block.
- **Replay/idempotency expectation:** Period generation rerun must be idempotent and not duplicate periods.

## GS-015 — HUS accepted

- **Business context:** ROT/RUT-fall där claim godkänns fullt.
- **Actors:** Billing, HUS specialist, customer.
- **Preconditions:** Correct invoice, payment received, service and buyer data valid.
- **Inputs:** HUS invoice, payment, buyer data, property/service data.
- **Rulepacks involved:** `SE-HUS-CORE`, `SE-INVOICE-LEGAL-FIELDS`, `SE-VAT-CORE`.
- **Required decisions:** Service eligibility, labour amount, claim readiness.
- **Expected UI blockers or prompts:** Issue blocked without mandatory HUS fields. Claim submit blocked before payment and readiness.
- **Expected accounting impact:** Customer receivable for paid share, HUS receivable for claimed share, bank inflows clear both separately.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Invoice VAT calculated on full invoice basis according to rules.
- **Expected HUS impact:** Claim submitted, accepted, payout received.
- **Expected documents and receipts:** Invoice, payment record, claim payload, submission receipts, payout record.
- **Expected audit trail:** Full chain from invoice to payout.
- **Negative path:** Missing property/buyer info blocks claim.
- **Replay/idempotency expectation:** Repeat submit with same claim version must not create duplicate authority submission.

## GS-016 — HUS partially accepted

- **Business context:** Claim godkänns bara delvis.
- **Actors:** HUS specialist, finance.
- **Preconditions:** Claim submitted and authority decision received.
- **Inputs:** Partial decision, rejected amount reason.
- **Rulepacks involved:** `SE-HUS-CORE`.
- **Required decisions:** How rejected amount becomes customer receivable or internal loss according to policy.
- **Expected UI blockers or prompts:** Must resolve rejected amount before case can close.
- **Expected accounting impact:** Approved portion clears HUS receivable. Rejected portion transferred to customer receivable or exception account by approved policy.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** No new VAT decision beyond invoice chain unless correction scenario applies.
- **Expected HUS impact:** Case remains open until rejection handled.
- **Expected documents and receipts:** Decision receipt, adjustment record, customer follow-up record if applicable.
- **Expected audit trail:** Decision normalization and debt transfer reason.
- **Negative path:** System must not auto-close case on partial decision.
- **Replay/idempotency expectation:** Same partial decision receipt must not create duplicate adjustment.

## GS-017 — HUS recovery

- **Business context:** Previously paid HUS-belopp återkrävs.
- **Actors:** HUS specialist, finance.
- **Preconditions:** Payout already booked.
- **Inputs:** Recovery notice, recovery reason, amount.
- **Rulepacks involved:** `SE-HUS-CORE`, `SE-CLOSE-BLOCKERS` if period closed.
- **Required decisions:** Customer debt transfer, loss handling, correction timing.
- **Expected UI blockers or prompts:** Recovery cannot silently reduce historical payout. Must create explicit recovery chain.
- **Expected accounting impact:** Recovery receivable or exception booking created; original payout history preserved.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Only changes if invoicing chain explicitly requires correction, otherwise separate recovery.
- **Expected HUS impact:** Case enters recovery state and closes only after resolution.
- **Expected documents and receipts:** Recovery notice, recovery object, settlement record.
- **Expected audit trail:** Original claim, original payout, recovery decision and settlement.
- **Negative path:** Direct overwrite of original claim or payout blocked.
- **Replay/idempotency expectation:** Duplicate recovery notice import must not duplicate debt.

## GS-018 — Payroll migration with balances

- **Business context:** Customer migrerar in historiska saldon och YTD till nytt lönesystem.
- **Actors:** Payroll specialist, migration operator, approver.
- **Preconditions:** Mapping set prepared, target periods known.
- **Inputs:** Employee master, YTD payroll values, balance imports, agreement mappings.
- **Rulepacks involved:** `TENANT-BALANCES`, `TENANT-COLLECTIVE-AGREEMENT`, `SE-AGI-CORE`, `SE-EMPLOYER-CONTRIBUTIONS`.
- **Required decisions:** Mapping correctness, opening cutover date, unresolved diffs.
- **Expected UI blockers or prompts:** Cutover blocked until diff report approved and critical errors zero.
- **Expected accounting impact:** Opening payroll balances and liabilities imported with explicit migration journal where needed.
- **Expected payroll impact:** New pay runs start with imported YTD and balance state.
- **Expected AGI impact:** Historical AGI not resubmitted unless correction needed, but YTD controls must align.
- **Expected VAT impact:** None.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Import batch, mapping set, diff report, signoff package.
- **Expected audit trail:** Every imported source value linked to source system and cutover batch.
- **Negative path:** Migration finalize without approved mapping or with unresolved critical diff must block.
- **Replay/idempotency expectation:** Re-running same approved import batch must not duplicate imported balances.

## GS-019 — Collective agreement edge case

- **Business context:** Time entry spans overtime, OB and flex or comp rules under agreement.
- **Actors:** Employee, manager, payroll specialist.
- **Preconditions:** Agreement assigned to employment and schedule exists.
- **Inputs:** Time entries, schedule, employment, agreement version.
- **Rulepacks involved:** `TENANT-COLLECTIVE-AGREEMENT`, `TENANT-BALANCES`, `SE-AGI-CORE`.
- **Required decisions:** Overtime class, OB class, whether hours become pay or balance.
- **Expected UI blockers or prompts:** Approval UI must show agreement-derived interpretation and exceptions.
- **Expected accounting impact:** Only via payroll posting once pay run approved.
- **Expected payroll impact:** Correct pay lines and/or balance transactions created.
- **Expected AGI impact:** Taxable pay additions included correctly.
- **Expected VAT impact:** None.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Time records, agreement version snapshot, pay calculation details.
- **Expected audit trail:** Agreement version used and derived calculation path stored.
- **Negative path:** No valid agreement mapping should block final payroll calculation for affected employee.
- **Replay/idempotency expectation:** Recalculation with same agreement version and time inputs must be stable.

## GS-020 — Project cost from payroll

- **Business context:** Approved pay run must allocate labour cost accurately to projects.
- **Actors:** Payroll specialist, controller, project manager.
- **Preconditions:** Time/project allocations approved, pay run approved.
- **Inputs:** Pay run results, project allocations, employer contributions, benefits, pension amounts.
- **Rulepacks involved:** `TENANT-COLLECTIVE-AGREEMENT`, `TENANT-BALANCES`, `SE-EMPLOYER-CONTRIBUTIONS`, `SE-PENSION-SALARY-EXCHANGE`.
- **Required decisions:** Allocation base and treatment of indirect portions.
- **Expected UI blockers or prompts:** If required project allocation basis missing, pay run posting or project cost materialization blocks.
- **Expected accounting impact:** Payroll posting in ledger remains canonical; project costing gets derived but traceable cost lines.
- **Expected payroll impact:** None beyond approved pay run.
- **Expected AGI impact:** None beyond ordinary run.
- **Expected VAT impact:** None.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Pay run, allocation snapshot, project cost snapshot.
- **Expected audit trail:** Each project cost line points back to pay run and allocation source.
- **Negative path:** Unallocated time in mandatory allocation scope blocks project cost finalization.
- **Replay/idempotency expectation:** Rebuild of project cost snapshot must replace derived projection without duplicating source payroll results.

## GS-021 — Personalliggare kiosk offline

- **Business context:** Kiosk tappar uppkoppling men måste fortfarande registrera check-in/out.
- **Actors:** Worker, site manager, backoffice if repair needed.
- **Preconditions:** Trusted kiosk device, workplace active.
- **Inputs:** Offline attendance events with local timestamps and device id.
- **Rulepacks involved:** `SE-PERSONALLIGGARE-CORE`.
- **Required decisions:** Accept queue, resolve clock drift or duplicates on sync.
- **Expected UI blockers or prompts:** Mobile/kiosk UI must clearly show offline state and unsynced events count.
- **Expected accounting impact:** None.
- **Expected payroll impact:** None directly, though attendance may later inform time validation.
- **Expected AGI impact:** None.
- **Expected VAT impact:** None.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Offline envelope, sync receipt, correction record if needed.
- **Expected audit trail:** Original offline events preserved, repair action append-only.
- **Negative path:** Offline correction or deletion of prior events must not be allowed locally.
- **Replay/idempotency expectation:** Same offline envelope must not be ingested twice.

## GS-022 — Annual close AB

- **Business context:** Aktiebolag gör årsstängning och årsrapportering.
- **Actors:** Finance lead, approver, signatory.
- **Preconditions:** Fiscal year closed enough, blockers resolved.
- **Inputs:** Ledger, reconciliations, tax account, payroll, VAT, HUS, asset register, close checklist.
- **Rulepacks involved:** `SE-FISCAL-YEAR`, `SE-CLOSE-BLOCKERS`, `SE-ACCOUNTING-METHOD`.
- **Required decisions:** Close signoffs, package generation, signatory completion.
- **Expected UI blockers or prompts:** Annual package cannot finalize until blockers and required evidence are clear.
- **Expected accounting impact:** Final closing journals and carry-forward logic according to company type and chosen framework.
- **Expected payroll impact:** Payroll reconciliation only.
- **Expected AGI impact:** Reconciled against annual totals; no direct new AGI unless correction path.
- **Expected VAT impact:** VAT reconciliation must be complete.
- **Expected HUS impact:** HUS receivables and recoveries must reconcile.
- **Expected documents and receipts:** Close checklist, report snapshots, annual package version, filing receipts.
- **Expected audit trail:** Signoffs, version freeze, submission receipt chain.
- **Negative path:** Missing tax account reconciliation or unresolved review blockers blocks sign/finalize.
- **Replay/idempotency expectation:** Rebuilding annual package creates new version, never overwrites signed version.

## GS-023 — Annual close sole trader

- **Business context:** Enskild firma close and declaration support.
- **Actors:** Finance or bureau user.
- **Preconditions:** Legal form set to sole trader.
- **Inputs:** Year ledger, own withdrawals/insättningar, tax-relevant data.
- **Rulepacks involved:** `SE-FISCAL-YEAR`, `SE-ACCOUNTING-METHOD`, `SE-CLOSE-BLOCKERS`.
- **Required decisions:** Sole-trader-specific package composition and declaration basis.
- **Expected UI blockers or prompts:** Legal-form-specific package path shown; AB-specific paths hidden.
- **Expected accounting impact:** Close and carry-forward respect sole-trader equity logic.
- **Expected payroll impact:** None unless payroll exists.
- **Expected AGI impact:** Only ordinary reconciliations if employer.
- **Expected VAT impact:** Reconciled as normal.
- **Expected HUS impact:** Reconciled if applicable.
- **Expected documents and receipts:** Sole-trader close package, declaration basis.
- **Expected audit trail:** Legal form and package generation version stored.
- **Negative path:** Using AB package flow for sole trader must block.
- **Replay/idempotency expectation:** Package regeneration creates new unsent version only.

## GS-024 — Annual close HB/KB

- **Business context:** Handelsbolag eller kommanditbolag close.
- **Actors:** Finance or bureau user.
- **Preconditions:** Legal form set accordingly.
- **Inputs:** Year ledger, partner/share data, package data.
- **Rulepacks involved:** `SE-FISCAL-YEAR`, `SE-CLOSE-BLOCKERS`.
- **Required decisions:** Entity type, partner distribution basis, package composition.
- **Expected UI blockers or prompts:** Partner/share information required before package finalize.
- **Expected accounting impact:** Close package generated with correct legal-form-specific structure.
- **Expected payroll impact:** None beyond ordinary employer reconciliation.
- **Expected AGI impact:** None beyond ordinary employer reconciliation.
- **Expected VAT impact:** Reconciled.
- **Expected HUS impact:** Reconciled if relevant.
- **Expected documents and receipts:** Legal-form package and signoff artifacts.
- **Expected audit trail:** Partner/share snapshot stored with version.
- **Negative path:** Missing partner distribution data blocks package build.
- **Replay/idempotency expectation:** Same legal-form package version cannot be re-signed after superseded.

## GS-025 — VAT reverse charge

- **Business context:** Inköp eller försäljning med omvänd moms.
- **Actors:** Finance reviewer.
- **Preconditions:** Counterparty and scenario indicate reverse charge possibility.
- **Inputs:** Invoice, counterparty type, VAT number status, goods/service classification.
- **Rulepacks involved:** `SE-VAT-CORE`, `SE-INVOICE-LEGAL-FIELDS`.
- **Required decisions:** Confirm reverse-charge scenario and required legal text/box mapping.
- **Expected UI blockers or prompts:** Mandatory scenario fields and legal text; block if VAT number or business context missing where required.
- **Expected accounting impact:** Appropriate reverse-charge postings and/or box lines according to scenario.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Correct self-assessment or reverse-charge mapping.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Invoice and VAT decision snapshot.
- **Expected audit trail:** VAT decision rationale with counterparty evidence.
- **Negative path:** Ambiguous scenario should create review_required, not auto-decide.
- **Replay/idempotency expectation:** Re-deciding same invoice with unchanged inputs must be stable.

## GS-026 — VAT import

- **Business context:** Importmoms scenario.
- **Actors:** AP, VAT reviewer.
- **Preconditions:** Import case or customs data exists.
- **Inputs:** Supplier invoice, customs assessment, freight and charges.
- **Rulepacks involved:** `SE-VAT-CORE`.
- **Required decisions:** Import VAT base, box mapping, deductible portion.
- **Expected UI blockers or prompts:** Block final VAT declaration if import case unresolved.
- **Expected accounting impact:** Purchase, customs and import VAT lines reflected correctly via AP/import/ledger chain.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Import boxes and input VAT according to resolved case.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Customs docs, import case, VAT decision.
- **Expected audit trail:** Linked-document chain and recalculation history.
- **Negative path:** Supplier invoice alone should not allow confident import VAT finalization.
- **Replay/idempotency expectation:** Import case recalculation must be deterministic for same linked set.

## GS-027 — VAT credit note

- **Business context:** Kreditnota ska spegla originalmomsbeslut.
- **Actors:** Finance.
- **Preconditions:** Original invoice exists.
- **Inputs:** Credit note with reference to original invoice.
- **Rulepacks involved:** `SE-VAT-CORE`, `SE-INVOICE-LEGAL-FIELDS`.
- **Required decisions:** Full or partial credit, original relation and date handling.
- **Expected UI blockers or prompts:** Credit note cannot issue without original reference.
- **Expected accounting impact:** Reversal or reduction of original receivable/payable and revenue/cost as applicable.
- **Expected payroll impact:** None.
- **Expected AGI impact:** None.
- **Expected VAT impact:** Mirror or proportional reversal of original VAT decision.
- **Expected HUS impact:** If HUS-linked invoice, downstream HUS correction workflow must be triggered or blocked according to state.
- **Expected documents and receipts:** Credit note, original invoice ref, VAT decision mirror.
- **Expected audit trail:** Link from credit to original preserved.
- **Negative path:** Free-standing credit note with no original relation must block.
- **Replay/idempotency expectation:** Re-issuing same credit note id must not duplicate reversal.

## GS-028 — Locked period correction

- **Business context:** Fel upptäcks i låst period.
- **Actors:** Finance, approver.
- **Preconditions:** Period locked, original posting exists.
- **Inputs:** Correction request, reason, affected object refs.
- **Rulepacks involved:** `SE-CLOSE-BLOCKERS`, `SE-FISCAL-YEAR`.
- **Required decisions:** Reopen request or explicit correction in open period, depending policy.
- **Expected UI blockers or prompts:** Silent edit impossible. Must choose approved correction path and give reason.
- **Expected accounting impact:** Reversal/correction chain only; original journal untouched.
- **Expected payroll impact:** If payroll-originated, payroll correction route may be needed instead of plain ledger correction.
- **Expected AGI impact:** If AGI affected, separate AGI correction scenario must be triggered.
- **Expected VAT impact:** If VAT-affected and already declared, VAT correction route required.
- **Expected HUS impact:** If HUS-affected, HUS correction or recovery route required.
- **Expected documents and receipts:** Correction request, approval, new journal or domain correction object.
- **Expected audit trail:** Original object, reopen or correction decision, resulting entries.
- **Negative path:** Direct edit of posted record in locked period is forbidden.
- **Replay/idempotency expectation:** Same correction request should not create duplicate corrections.

## GS-029 — AGI correction

- **Business context:** Tidigare AGI måste rättas.
- **Actors:** Payroll specialist.
- **Preconditions:** Original AGI submission exists.
- **Inputs:** Corrected payroll data, reason, original submission ref.
- **Rulepacks involved:** `SE-AGI-CORE`, `SE-EMPLOYER-CONTRIBUTIONS`, `SE-SINK` if relevant.
- **Required decisions:** Correction target, corrected employee lines, new submission version.
- **Expected UI blockers or prompts:** Cannot overwrite original AGI. Must create correction submission linked to original.
- **Expected accounting impact:** May create payroll correction posting where underlying pay run changes.
- **Expected payroll impact:** Correction pay run or correction lines as policy dictates.
- **Expected AGI impact:** New correction submission with linked original reference.
- **Expected VAT impact:** None.
- **Expected HUS impact:** None.
- **Expected documents and receipts:** Original submission ref, correction package, technical and business receipts.
- **Expected audit trail:** Full before/after diff, original preserved.
- **Negative path:** Direct edit of submitted AGI package forbidden.
- **Replay/idempotency expectation:** Re-submit same correction version must be blocked or deduped at submission layer.

## GS-030 — Tax account offset

- **Business context:** Inbetalning eller återbetalning kvittas mot flera skatteposter.
- **Actors:** Finance, close owner.
- **Preconditions:** Tax account events imported, relevant VAT/AGI/F-tax events exist.
- **Inputs:** Tax account statement rows, bank statement rows, domain refs.
- **Rulepacks involved:** `SE-TAX-ACCOUNT-MAPPING`, `SE-CLOSE-BLOCKERS`.
- **Required decisions:** Match, offset and unresolved-item resolution.
- **Expected UI blockers or prompts:** Unmatched tax account items remain open and visible in close workbench.
- **Expected accounting impact:** Tax account subledger updated, bank and liability/receivable positions reconciled, manual adjustment only through explicit approved command.
- **Expected payroll impact:** AGI-related obligations reflected in reconciliation state.
- **Expected AGI impact:** None directly beyond reconciliation and correction triggers if mismatch found.
- **Expected VAT impact:** VAT payable/refundable matched to tax account state.
- **Expected HUS impact:** HUS recovery or payout may appear as reconcilable events if applicable.
- **Expected documents and receipts:** Imported tax statement, reconciliation snapshot, offset records.
- **Expected audit trail:** Statement event mapping version and manual resolution reasons.
- **Negative path:** UI must not allow “mark as reconciled” without explicit evidence or approved adjustment.
- **Replay/idempotency expectation:** Same statement import file or provider event must not create duplicate tax account events.

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- alla 30 scenarier ovan finns som framtida golden testkandidater
- varje scenario har tydliga rulepacks, UI blockers och cross-domain outputs
- varje scenario kan mappas till minst en domain-test och minst en E2E-test
- varje scenario har replay/idempotenskrav
- inga kritiska svenska kärnscenarier från Batch 1 saknas
- scenario-katalogen används som bindande sanningslista för framtida testplaner, inte som lös inspirationslista

