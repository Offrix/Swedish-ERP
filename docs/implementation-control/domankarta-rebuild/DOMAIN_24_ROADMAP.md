# DOMAIN_24_ROADMAP

## mål

Göra Domän 24 till plattformens group-, intercompany- och treasury-kärna så att företag kan växa från ett bolag till flera utan att lämna systemet.

## varför domänen behövs

Utan denna domän stannar plattformen i praktiken vid single-company. När kunden får flera bolag, interna flöden, shared services eller treasurybehov måste de byta system eller bygga manuella sidospår.

## bindande tvärdomänsunderlag

- `KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING.md` styr group hierarchy, intercompany counterparties, settlements, shared-service allocations, treasury visibility och elimination inputs i denna domän.
- `FAKTURAFLODET_BINDANDE_SANNING.md`, `LEVFAKTURAFLODET_BINDANDE_SANNING.md`, `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` och `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` styr seller- och buyertruth som intercompany bygger ovanpa.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr governance receipts, approvals och elimination evidence i denna domän.

## faser

- Fas 24.1 group hierarchy / multi-company root / route truth
- Fas 24.2 intercompany counterparties / policy hardening
- Fas 24.3 intercompany order / invoice / settlement hardening
- Fas 24.4 treasury / cash position / payment governance hardening
- Fas 24.5 shared services / allocation / elimination input hardening
- Fas 24.6 owner governance / board / dividend bridge hardening
- Fas 24.7 auth / search / reporting boundary hardening
- Fas 24.8 doc / runbook / legacy purge

## dependencies

- Domän 3 för ledger och bolagsgränser.
- Domän 5 och 6 för ÄR/AP-kedjor som intercompany ska länka till.
- Domän 11 för annual reporting, owner distributions och corporate tax.
- Domän 16 för support, exports och super-admin-gränser.

## vad som får köras parallellt

- 24.2 och 24.4 kan köras parallellt när group root är låst.
- 24.3 och 24.5 kan köras parallellt när counterparties och bolagsgränser finns.
- 24.6 kan köras parallellt när group root och owner bridge är definierade.

## vad som inte får köras parallellt

- 24.2 får inte markeras klar före 24.1.
- 24.3 får inte markeras klar före 24.2.
- 24.5 får inte markeras klar före 24.3.
- 24.7 får inte markeras klar före 24.1–24.6.

## exit gates

- group hierarchy och bolagsrelationer är first-class
- intercompany-flöden är first-class receipts med counterparties och settlement lineage
- treasury och shared-service allocations är first-class runtime
- owner distribution-domänen är korrekt länkad som consumer av group governance

## test gates

- group hierarchy tests
- intercompany order/invoice/settlement tests
- treasury and cash-governance tests
- allocation/elimination-input tests
- auth/search/report boundary tests

## delfaser

### Delfas 24.1 group hierarchy / multi-company root / route truth
- [ ] bygg `CompanyGroup`, `GroupMembership`, `IntercompanyPolicy`, `GroupGovernanceReceipt`
- [ ] skapa canonical route family `/v1/group/*`
- [ ] gör bolagsgrupp first-class i stället för implicit tenantlista
- [ ] verifiera route truth lint och group lineage

### Delfas 24.2 intercompany counterparties / policy hardening
- [ ] bygg `IntercompanyCounterparty`, `IntercompanyAgreement`, `IntercompanyPricingPolicy`, `IntercompanyApprovalProfile`
- [ ] gör relationen mellan bolag explicit och policyburen
- [ ] blockera fria interna transaktioner utan definierad counterparty-policy
- [ ] verifiera counterparty policy och approval gates

### Delfas 24.3 intercompany order / invoice / settlement hardening
- [ ] bygg `IntercompanyOrder`, `IntercompanyInvoice`, `IntercompanySettlement`, `IntercompanyMismatchCase`
- [ ] stöd order-to-invoice-to-settlement mellan bolag med receipt lineage
- [ ] gör mismatch och counterpart rejects first-class
- [ ] verifiera intercompany lifecycle och mismatch handling

### Delfas 24.4 treasury / cash position / payment governance hardening
- [ ] bygg `TreasuryAccount`, `CashPositionSnapshot`, `IntercompanyLoan`, `TreasuryTransferDecision`
- [ ] gör cash governance och interna pengaflöden first-class
- [ ] blockera treasury actions utan rätt owner/approval
- [ ] verifiera cash position, transfer och treasury approval

### Delfas 24.5 shared services / allocation / elimination input hardening
- [ ] bygg `SharedServiceAllocationPlan`, `AllocationExecutionReceipt`, `EliminationInput`, `ConsolidationBridgeRef`
- [ ] gör allokering och elimination inputs first-class
- [ ] bind shared service-costs till tydlig allocation policy
- [ ] verifiera allocation lineage och elimination input completeness

### Delfas 24.6 owner governance / board / dividend bridge hardening
- [ ] bygg `BoardResolution`, `OwnerDecision`, `DividendGovernanceBridge`, `HoldingStructureSnapshot`
- [ ] länka befintlig owner distribution-domän till group governance
- [ ] skilj bolagsbeslut från rena payout-events
- [ ] verifiera board/stamma lineage till dividend decision

### Delfas 24.7 auth / search / reporting boundary hardening
- [ ] bygg `GroupRoleGrant`, `CrossCompanySearchGrant`, `GroupReportingBoundary`, `CompanyScopeReceipt`
- [ ] lås vad som får ses och göras över bolagsgränser
- [ ] blockera tyst cross-company search och mutation
- [ ] verifiera boundary enforcement och audit trail

### Delfas 24.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för owner-distribution-docs och group-spår
- [ ] skapa canonical runbooks för intercompany, treasury och shared-service allocations
- [ ] håll owner-distribution-runbook på owner-distribution-nivå
- [ ] verifiera docs truth lint och legacy archive receipts
