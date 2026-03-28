# Payroll employer contribution decisions verification

## Scope

Verifies roadmap `12.2` for:
- age-based employer contribution decisions
- temporary youth reduction split
- växa support as explicit decision snapshot with tax-account consequence
- dual review on sensitive employer contribution decisions

## Preconditions

- `phase8PayrollEnabled=true`
- demo or test company exists
- at least one payroll-admin actor and one secondary approver actor exist

## Verification steps

1. Create an employee born in `1959` with monthly salary `30 000 SEK`.
2. Create a regular pay run for `202603`.
3. Verify:
   - `employerContributionDecision.outputs.decisionType = reduced_age_pension_only`
   - `ageBucket = year_start_67_plus`
   - `employerContributionPreviewAmount = 3 063`

4. Create an employee born in `2005` with monthly salary `30 000 SEK`.
5. Create a regular pay run for `202604`.
6. Verify:
   - `decisionType = temporary_youth_reduction`
   - `contributionComponents` contains:
     - `temporary_youth_reduction_band`
     - `standard_overflow_band`
   - `reducedContributionBase = 25 000`
   - `overflowContributionBase = 5 000`
   - `employerContributionPreviewAmount = 6 773,50`

7. Create an employee eligible for support-managed växa handling.
8. Create `EmployerContributionDecisionSnapshot` with:
   - `decisionType = vaxa`
   - `fullRate = 31.42`
   - `reducedRate = 10.21`
   - `baseLimit = 25 000`
   - evidence ref and decision reference
9. Verify that create returns `draft`.
10. Attempt approval with the same actor.
11. Verify `409 employer_contribution_decision_snapshot_dual_review_required`.
12. Approve with a second actor.
13. Create payroll run for the same employment.
14. Verify:
   - `decisionType = vaxa`
   - `employerContributionPreviewAmount = 4 123,50`
   - `referenceFullContributionAmount = 9 426`
   - `taxAccountReliefAmount = 5 302,50`
   - `taxAccountConsequence.consequenceTypeCode = vaxa_relief_credit`
   - `taxAccountConsequence.liabilityTypeCode = employer_contributions`

## Test commands

```powershell
node --test tests/unit/phase12-employer-contribution-decisions.test.mjs
node --test tests/integration/phase12-employer-contribution-decisions-api.test.mjs
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Exit criteria

- all targeted tests green
- full suite green
- roadmap `12.2` marked complete
- no remaining legacy-only path where `contributionClassCode` is the primary truth for new runs
