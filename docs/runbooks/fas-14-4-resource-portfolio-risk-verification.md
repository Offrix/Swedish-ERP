# Fas 14.4 verifiering — resource, portfolio och riskstyrning

## Syfte

Verifiera att project core nu bär riktiga objekt och read models för:

- capacity reservations
- assignment planning
- skills/roles-demand
- project risk register
- project status-driven portfolio health
- budget vs actual vs forecast på både projekt- och portfolio-nivå

## Förutsättningar

- `phase10ProjectsEnabled=true`
- stark autentisering aktiv för muterande projektroutes
- minst ett företag med HR-, AR- och project-runtime tillgängligt

## Verifieringssteg

1. Skapa eller välj ett aktivt projekt med `billingModelCode` och `revenueRecognitionModelCode`.
2. Skapa en project budgetversion med minst en cost line och en revenue line.
3. Skapa minst en `project_resource_allocation` för relevant employment/reporting period.
4. Materialisera `project_forecast_snapshot`.
5. Skapa `project_status_update` med blocker code och progress.
6. Skapa `project_capacity_reservation` med:
   - employment
   - role
   - skillCodes
   - capacity window
   - reserved/billable minutes
7. Flytta reservationen till `approved`.
8. Skapa `project_assignment_plan` länkat till reservationen.
9. Flytta assignment plan till `approved` och därefter `in_progress`.
10. Skapa `project_risk` med severity, probability, owner, mitigation och due date.
11. Läs:
    - `/v1/projects/:projectId/capacity-reservations`
    - `/v1/projects/:projectId/assignment-plans`
    - `/v1/projects/:projectId/risks`
    - `/v1/projects/:projectId/workspace`
    - `/v1/projects/portfolio/nodes`
    - `/v1/projects/portfolio/summary`

## Förväntat resultat

- workspace visar:
  - `capacityReservationCount`
  - `assignmentPlanCount`
  - `openProjectRiskCount`
  - `criticalProjectRiskCount` när relevant
  - `resourceCapacitySummary`
  - `budgetActualForecastSummary`
  - `currentPortfolioNode`
- `warningCodes` innehåller risk-/capacity-varningar när de verkligen gäller
- `currentPortfolioNode` använder status update + riskläge för `healthCode` och `atRiskFlag`
- portfolio nodes visar:
  - budget, actual, forecast
  - role demand
  - skill demand
  - employment capacity
- portfolio summary summerar:
  - project counts
  - open/high/critical risks
  - budget/revenue/cost/margin
  - reserved/assigned/actual minutes

## Negativa kontroller

- assignment plan får inte kunna godkännas mot icke-godkänd reservation
- mismatched employment/role mellan reservation och assignment plan ska blockeras
- field-only användare ska nekas portfolio- och project workspace-routes
- risk/status-kedjor får inte tillåta ogiltiga terminalövergångar

## Auditkrav

Verifiera audit events för:

- `project.capacity_reservation.created`
- `project.capacity_reservation.status_changed`
- `project.assignment_plan.created`
- `project.assignment_plan.status_changed`
- `project.risk.created`
- `project.risk.status_changed`

## Evidence

Verifiera att `exportProjectEvidenceBundle` nu innehåller:

- `projectCapacityReservations`
- `projectAssignmentPlans`
- `projectRisks`
- `resourceCapacitySummary`
- `budgetActualForecastSummary`
- `currentPortfolioNode`

## Exit gate

Fas 14.4 är inte klar förrän:

- alla nya routes är publicerade
- route contracts är korrekta
- workspace bär nya objekt och sammanfattningar
- portfolio summary fungerar för flera projekt
- risk- och capacity-varningar materialiseras korrekt
- unit-, integration-, surface-access- och route-metadata-sviter är gröna
