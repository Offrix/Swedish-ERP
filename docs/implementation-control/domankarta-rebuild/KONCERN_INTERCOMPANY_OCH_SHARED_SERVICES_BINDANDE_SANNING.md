# KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för koncern, intercompany, shared services, treasury bridges och group boundaries.

## Syfte

Detta dokument ska låsa hur flera bolag, interna affärsflöden, shared-service-allokeringar, treasury-samband och eliminationsunderlag modelleras utan att reduceras till flera losa tenants eller manuella sidospaar.

## Omfattning

Detta dokument omfattar:
- group hierarchy
- intercompany counterparties
- intercompany orders, invoices, settlements och disputes
- shared service allocations
- internal loans, cash pool visibility och treasury governance
- elimination inputs och governance receipts
- company-scoped visibility vs group-scoped visibility

Detta dokument omfattar inte:
- full koncernredovisningsmotor
- legal filinglogik som ägs av annual-bibeln
- owner distributions, som ägs av owner-bibeln

## Absoluta principer

- varje bolag ska fortsatt vara egen juridisk och bokföringsmassig enhet
- intercompany får inte bokas som extern affar utan explicit counterparty och policy
- shared services får inte blandas med vanliga leverantörs- eller kundrelationer
- group visibility får inte bryta company isolation utan explicit policy
- treasury visibility får inte ge mutation utan governance receipts
- interna flöden måste vara speglade på bada sidor eller blockeras som asymmetriska

## Bindande dokumenthierarki för koncern, intercompany och shared services

- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`, `FAKTURAFLODET_BINDANDE_SANNING.md`, `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md`, `LEVFAKTURAFLODET_BINDANDE_SANNING.md` och `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` äger seller- och buyertruth som intercompany bygger ovanpa
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` och `BAS_KONTOPOLICY_BINDANDE_SANNING.md` äger voucher- och account-family truth
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` äger annual och koncernnara reporting outputs
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger governance approvals, sign-off och treasury-read evidence
- Domän 24 får inte definiera avvikande group-, intercompany-, shared-service- eller treasurytruth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `CompanyGroup`
- `GroupMembership`
- `IntercompanyCounterparty`
- `IntercompanyPolicy`
- `TransferPricingProfile`
- `SharedServiceAllocationPolicy`
- `IntercompanyDocumentLink`
- `IntercompanySettlement`
- `TreasuryVisibilityReceipt`
- `InternalLoanReceipt`
- `EliminationInputReceipt`

## Kanoniska state machines

- `CompanyGroup`: `draft -> active | suspended | archived`
- `IntercompanyCounterparty`: `draft -> active | blocked | retired`
- `IntercompanySettlement`: `draft -> open -> settled | disputed | cancelled`
- `SharedServiceAllocationPolicy`: `draft -> active | superseded | retired`
- `InternalLoanReceipt`: `draft -> active | repaid | written_down | cancelled`

## Kanoniska commands

- `CreateCompanyGroup`
- `AddGroupMembership`
- `RegisterIntercompanyCounterparty`
- `PublishIntercompanyPolicy`
- `PublishTransferPricingProfile`
- `PublishSharedServiceAllocationPolicy`
- `RegisterIntercompanySettlement`
- `RegisterInternalLoanReceipt`
- `RecordEliminationInput`
- `RecordTreasuryVisibilityReceipt`

## Kanoniska events

- `CompanyGroupCreated`
- `GroupMembershipAdded`
- `IntercompanyCounterpartyRegistered`
- `IntercompanyPolicyPublished`
- `TransferPricingProfilePublished`
- `SharedServiceAllocationPolicyPublished`
- `IntercompanySettlementRegistered`
- `InternalLoanReceiptRegistered`
- `EliminationInputRecorded`
- `TreasuryVisibilityReceiptRecorded`

## Kanoniska route-familjer

- `POST /group`
- `POST /group/memberships`
- `POST /intercompany/counterparties`
- `POST /intercompany/policies`
- `POST /intercompany/transfer-pricing`
- `POST /intercompany/settlements`
- `POST /shared-services/policies`
- `POST /internal-loans`
- `POST /elimination-inputs`
- `POST /treasury-visibility-receipts`

## Kanoniska permissions och review boundaries

- group creation och membership changes är governance actions
- intercompany policies får inte publiceras av samma actor som ensam bokar interna flöden
- treasury visibility och cross-company read access måste scopeas explicit
- elimination inputs får inte skapas av support utan finance governance
- internal loan och cash-pool policykrav måste ha SoD mellan creator och approver

## Nummer-, serie-, referens- och identitetsregler

- varje group ska ha `GRP-YYYY-NNNNN`
- varje intercompany counterparty ska ha `ICP-YYYY-NNNNN`
- varje transfer-pricing profile ska ha `TPR-YYYY-NNNNN`
- varje shared service policy ska ha `SSP-YYYY-NNNNN`
- varje intercompany settlement ska ha `ICS-YYYY-NNNNN`
- varje elimination input receipt ska ha `ELI-YYYY-NNNNN`

## Valuta-, avrundnings- och omräkningsregler

- intercompany flows ska bevara source currency, target currency och FX lineage
- valuations och allocations får inte avrundas på ett satt som bryter bolagsvisa underlag
- cross-currency intercompany får inte bli green om seller och buyer inte delar samma valuation lineage

## Replay-, correction-, recovery- och cutover-regler

- group membership history måste vara replaybar
- intercompany settlement corrections måste ske via owning truth docs och governance receipts
- multi-company cutover får inte hoppa över intercompany counterparty receipts
- elimination inputs måste vara periodspecifika och får inte muteras i efterhand utan supersession lineage

## Huvudflödet

1. group och memberships etableras
2. intercompany counterparties, transfer pricing och shared-service policies publiceras
3. interna orders, invoices och settlements kor genom vanliga financial flows men med intercompany truth
4. internal loans, treasury visibility och shared-service allocations registreras med governance receipts
5. elimination inputs byggs per period och group scope
6. reporting visar bolagssanning och group-sanning utan att blanda scope

## Bindande scenarioaxlar

- group shape: parent-subsidiary, sister companies, shared service center
- flow type: intercompany sale, cost recharge, shared service allocation, treasury transfer, internal loan
- currency: same-currency, cross-currency
- legal timing: same period, cross-period
- settlement posture: open, netting, external payout, disputed
- visibility posture: company-only, group-read, treasury-read

## Bindande policykartor

- `GRP-POL-001 flow_type_to_required_counterparty`
- `GRP-POL-002 shared_service_type_to_allocation_basis`
- `GRP-POL-003 settlement_posture_to_allowed_paths`
- `GRP-POL-004 group_scope_to_visibility_policy`
- `GRP-POL-005 elimination_input_to_required_evidence`
- `GRP-POL-006 internal_loan_to_required_governance_receipts`
- `GRP-POL-007 asymmetric_posting_block_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `GRP-P0001` group membership active with `legal_entity_ids[]`
- `GRP-P0002` intercompany counterparty active with `company_a`, `company_b`, `policy_code`
- `GRP-P0003` intercompany sale linked to seller and buyer receipts with mirrored state
- `GRP-P0004` shared-service allocation recorded with `basis`, `source_cost_pool`, `target_company`
- `GRP-P0005` elimination input recorded with `voucher_refs[]`, `period`, `group_scope`
- `GRP-P0006` treasury visibility receipt recorded with read-only outcome
- `GRP-P0007` internal loan or cash-pool movement recorded with lender, borrower, value_date and governance receipt
- `GRP-P0008` disputed intercompany balance remains open and visible on both sides
- `GRP-P0009` asymmetric internal posting blocked before settlement or elimination path

## Bindande rapport-, export- och myndighetsmappning

- bolagsvisa rapporter får inte blandas med group views
- elimination inputs ska kunna exporteras till annual truth docs
- shared-service allocations ska kunna sparas till both company-specific and group views
- treasury-read scope ska inte exponera mutation paths eller filing scopes

## Bindande scenariofamilj till proof-ledger och rapportspar

- `GRP-A001` parent-subsidiary group setup -> `GRP-P0001`, `GRP-P0002`
- `GRP-B001` intercompany invoice chain -> `GRP-P0003`
- `GRP-B002` asymmetric internal posting attempt -> `GRP-P0009`
- `GRP-C001` shared-service allocation -> `GRP-P0004`
- `GRP-D001` elimination input prep -> `GRP-P0005`
- `GRP-E001` treasury visibility only -> `GRP-P0006`
- `GRP-E002` internal loan or cash-pool bridge -> `GRP-P0007`
- `GRP-Z001` disputed internal balance -> `GRP-P0008`

## Tvingande dokument- eller indataregler

- every intercompany relation must identify both legal entities
- every shared-service allocation must carry explicit basis
- every elimination input must carry voucher or receipt refs
- every internal loan or treasury bridge must carry governance ref, maturity or on-demand policy and interest policy if relevant
- every group view must carry scope marker showing whether data is company, group or treasury-read

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `GRP-R001 missing_counterparty`
- `GRP-R002 missing_allocation_basis`
- `GRP-R003 blocked_cross_company_visibility`
- `GRP-R004 missing_elimination_evidence`
- `GRP-R005 missing_internal_loan_governance`
- `GRP-R006 asymmetric_internal_posting`

## Bindande faltspec eller inputspec per profil

- group: `group_id`, `members[]`, `governance_owner`
- counterparty: `company_a`, `company_b`, `policy_code`, `effective_from`
- transfer-pricing profile: `pricing_basis`, `markup_policy`, `cost_pool_refs[]`, `review_owner`
- shared-service policy: `basis`, `cost_pool`, `distribution_targets[]`
- internal loan: `lender_company`, `borrower_company`, `principal`, `currency`, `governance_ref`
- elimination input: `period`, `voucher_refs[]`, `group_scope`

## Scenariofamiljer som hela systemet måste tacka

- group creation
- intercompany invoice
- intercompany settlement
- shared service recharge
- internal loan or cash-pool movement
- elimination input prep
- treasury visibility without mutation
- disputed internal balance
- asymmetric internal posting

## Scenarioregler per familj

- internal flows must keep both sides explicit
- shared-service allocations must never hide source pool
- treasury visibility must stay read-only
- disputed balances must remain disputed until resolved
- one-sided internal posting must block instead of waiting för låter cleanup

## Blockerande valideringar

- intercompany flow blocked om counterparty saknas
- allocation blocked om basis saknas
- group view blocked om visibility policy bryts
- elimination input blocked om evidence saknas
- internal loan blocked om governance ref saknas
- settlement blocked om mirrored company-side state saknas

## Rapport- och exportkonsekvenser

- group dashboards must show that data is group-aggregated
- company reports must remain company-scoped by default
- elimination exports must preserve voucher lineage
- treasury-read exports must be marked read-only and non-filing

## Förbjudna förenklingar

- "flera tenants = koncern"
- internal flows bokade som vanliga externa flows utan intercompany flag
- shared-service allocations utan basis
- treasury mutation from visibility screen
- one-sided postings that rely on låter manual elimination

## Fler bindande proof-ledger-regler för specialfall

- `GRP-P0010` cross-currency intercompany settlement must preserve FX lineage on both companies
- `GRP-P0011` elimination input may not be green without source voucher refs from both sides when both sides exist
- `GRP-P0012` group visibility must not leak unrelated company detail without policy
- `GRP-P0013` shared-service allocation supersession must preserve prior basis and replacement lineage

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `GRP-P0003` must create mirrored internal state across both companies
- `GRP-P0004` must create allocation receipt state
- `GRP-P0008` must create disputed state
- `GRP-P0009` must create blocked asymmetry state that stops settlement and elimination

## Bindande verifikations-, serie- och exportregler

- voucher and seriestruth fortsatt ägs av owning financial truth docs
- this document only binds cross-company linkage, mirrored state and evidence
- exports must preserve company scope, group scope and elimination scope separately

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- flow type x currency
- group shape x visibility policy
- settlement posture x dispute status
- allocation basis x cost pool
- same-period x cross-period

## Bindande fixture-klasser för koncern, intercompany och shared services

- `GRP-FXT-001` simple parent-subsidiary
- `GRP-FXT-002` shared-service center
- `GRP-FXT-003` cross-currency internal trade
- `GRP-FXT-004` disputed internal balance
- `GRP-FXT-005` cash-pool or internal loan

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_company_a_state`
- `expected_company_b_state`
- `expected_group_visibility`
- `expected_elimination_input`
- `expected_governance_receipts[]`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT som egen seriepolicy

## Bindande expected outcome per central scenariofamilj

- intercompany invoice must create mirrored seller and buyer state plus explicit intercompany linkage
- shared-service allocation must preserve source pool, basis and target-company lineage
- internal loan or cash-pool movement must remain governance-bound and not mutate company scope invisibly
- asymmetric internal posting must block before settlement

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- group setup -> active memberships plus counterparties
- internal invoice -> mirrored company states
- shared service -> explicit allocation receipt
- internal loan -> governance-bound treasury receipt
- elimination prep -> voucher-linked elimination input
- treasury read -> read-only visibility receipt
- dispute -> open visible disputed state

## Bindande testkrav

- mirrored-state tests för every intercompany financial flow
- visibility-boundary tests för company, group and treasury scopes
- allocation-basis completeness tests
- asymmetric-posting blocker tests
- internal-loan governance tests
- elimination-lineage tests

## Källor som styr dokumentet

- [Årsredovisningslag (1995:1554)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/)
- [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- [BAS: Kontoplaner för 2026](https://www.bas.se/kontoplaner/)
