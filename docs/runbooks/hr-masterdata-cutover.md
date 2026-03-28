# HR Masterdata Cutover

## Syfte

Säkra att HR är enda sanning för employee, employment, organization placement, salary basis, cost center och service line innan payroll, project costing eller migration använder snapshoten.

## Cutover-checklista

1. Verifiera att varje aktiv employee har minst ett aktivt employment.
2. Verifiera att varje employment som ska användas i payroll har:
   - aktiv placement
   - aktiv salary basis
   - aktiv employment contract
3. Verifiera att placement-fönster inte överlappar per employment.
4. Verifiera att salary-basis-fönster inte överlappar per employment.
5. Verifiera att contract-fönster inte överlappar per employment.
6. Verifiera att manager-assignment-fönster inte överlappar per employment.
7. Identifiera alla retroaktiva HR-ändringar med `reviewRequired=true` och säkra reviewreferens innan första pay run.
8. Verifiera att cost center och service line är satta på placement där project costing eller payroll-cost allocation kräver det.
9. Kör snapshot-kontroll för varje employment som ska användas i pilot:
   - `completeness.hasActivePlacement = true`
   - `completeness.hasActiveSalaryBasis = true`
   - `completeness.hasActiveContract = true`
   - `completeness.readyForPayrollInputs = true`

## Blockers

- Inget pay-run-underlag får byggas från employment snapshots som saknar aktiv placement, salary basis eller contract.
- Retroaktiva ändringar utan reviewspår får inte gå vidare till payroll cutover.
- Överlappande effective-dated fönster måste korrigeras innan pilot.

## Operativ verifiering

1. Läs snapshot för varje pilot-employment via `/v1/hr/employees/:employeeId/employments/:employmentId/snapshot`.
2. Läs placements via `/v1/hr/employees/:employeeId/placements`.
3. Läs salary bases via `/v1/hr/employees/:employeeId/salary-bases`.
4. Diffa mot migrationskälla eller legacy-export.
5. Dokumentera signoff per employee/employment-grupp.

## Auditkrav

- Alla retroaktiva placement-, salary-basis-, contract- och manager-ändringar ska bära reason code eller reviewreferens.
- All cutover-signoff ska länkas till evidence bundle för migration/payroll readiness.
