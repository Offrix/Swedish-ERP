> Statusnotis: Detta dokument ar inte primar sanning. Bindande styrning fore UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument ar historiskt input- eller stodmaterial och far inte overstyra dem.

# Payroll history import verification

## Syfte

Verifiera att payroll-adjacent historik ar komplett, reproducerbar och signerbar innan forsta pilot-payrun.

## Nar den anvands

- vid 11.4 payroll history import
- fore approval av payroll migration batch
- fore forsta live- eller pilot-cutover for lon

## Maste vara sant

- employee master snapshot finns for varje migrerad anstalld
- employment history finns och ar kronologiskt sammanhangen utan overlap
- YTD basis finns och ar signerad mot kallrapport
- AGI history har reported-through period och receipt- eller submission-spor
- benefit history och travel history ar importerad dar sadan historik finns
- evidence mapping tacker employee_master, employment_history, ytd_basis och agi_history
- evidence mapping tacker benefit_history och travel_history nar sadana objekt finns

## Verifieringssteg

1. Lista payroll migration batch och kontrollera `historyImportSummary`.
2. Lista employee migration summary och kontrollera `historyCoverage` per employment.
3. Bekrafta att `missingRequiredEvidenceAreas` ar tom for live-batchar.
4. Bekrafta att `historyEvidenceBundle` finns och ar frozen.
5. Jamfor imported YTD mot signerad kallrapport.
6. Jamfor AGI carry-forward refs mot senaste verkliga AGI-kedja.
7. Bekrafta att benefit- och travelhistorik har evidence mapping och source refs.
8. Kontrollera att balance baselines ar registrerade for alla kravda balance types.
9. Kor validation och bekrafta `blockingIssueCount = 0`.
10. Signera diffbeslut och cutover-approval for batchen.

## Blockerande fel

- saknad employee master snapshot
- saknad employment history
- saknad required evidence mapping for live-batch
- saknad balance baseline for required balance type
- YTD eller AGI mismatch utan signerad forklaring

## Exit gate

- [ ] every imported employment has complete history coverage
- [ ] history evidence bundle is frozen and traceable
- [ ] validation is green
- [ ] diff gate is closed
- [ ] batch is safe for cutover approval
