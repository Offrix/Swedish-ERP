# Phase 15.5 Mission Control Verification

## Purpose

Verify that mission control is a real operator runtime, not a wrapper around saved widgets.

## Required routes

- `GET /v1/mission-control/dashboards`
- `GET /v1/mission-control/dashboards/:dashboardCode`

## Preconditions

- Desktop-capable operator session with `company.read`
- Trial, migration, payroll AGI, project portfolio and close data available for the company
- If finance close rows should be included, `bureauOrgId` must resolve to the operating bureau org

## Verification steps

1. Request `GET /v1/mission-control/dashboards?companyId=<companyId>&bureauOrgId=<bureauOrgId>`.
2. Confirm the response returns exactly these dashboard codes:
   - `project_portfolio`
   - `finance_close`
   - `payroll_submission`
   - `cutover_control`
   - `trial_conversion`
3. Request `GET /v1/mission-control/dashboards/project_portfolio?companyId=<companyId>`.
4. Confirm project counters and rows are derived from canonical project portfolio nodes and not search documents.
5. Request `GET /v1/mission-control/dashboards/finance_close?companyId=<companyId>&bureauOrgId=<bureauOrgId>`.
6. Confirm close rows expose real checklist status and hard-stop blocker counts.
7. Request `GET /v1/mission-control/dashboards/payroll_submission?companyId=<companyId>`.
8. Confirm AGI rows expose current AGI state, validation counts and linked authority submission state when present.
9. Request `GET /v1/mission-control/dashboards/cutover_control?companyId=<companyId>`.
10. Confirm cutover rows expose validation gate state, blocked counts, escalation policy and correction counts from migration cockpit.
11. Request `GET /v1/mission-control/dashboards/trial_conversion?companyId=<companyId>`.
12. Confirm trial rows expose isolation status, promotion status, parallel run status and provider policy markers.
13. Execute the same list route with a non-desktop role such as `field_user`.
14. Confirm the request fails with `403 desktop_surface_role_forbidden`.

## Exit criteria

- All five dashboards materialize from source-of-truth domains
- Desktop-only enforcement is active
- No dashboard depends on search as source of truth
- Counters and rows stay deterministic under a fixed clock
