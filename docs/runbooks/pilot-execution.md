# Pilot Execution

Detta runbook styr intern dogfood och finance pilot enligt fas `18.1`.

## Syfte

Bevisa att ett finance-ready bolag kan köras genom kärnflödena `finance_core`, `vat_cycle`, `payroll_agi`, `hus_claim`, `tax_account_reconciliation`, `annual_reporting` och `support_operations` med verifierbar rollbackberedskap och signoff.

## Förutsättningar

- Bolaget har `CompanySetupProfile.status = finance_ready`
- Eventuell trialmiljö är isolerad och blockerar live economic effect
- Eventuell parallel run-plan är skapad och tillhör samma bolag
- Approvals finns från:
  - `implementation`
  - `finance`
  - `support`
- Rollbackstrategi är vald
- Rollback evidence finns innan completion

## API-flöde

### 1. Starta pilot

`POST /v1/pilot/executions`

Payload:

```json
{
  "companyId": "cmp_123",
  "label": "Internal finance pilot",
  "trialEnvironmentProfileId": "trial_123",
  "parallelRunPlanId": "pr_123"
}
```

Förväntat resultat:

- `status = in_progress`
- sju scenarios materialiseras som `pending`
- finance readiness snapshot fryses på piloten

### 2. Kör och registrera scenarios

`POST /v1/pilot/executions/:pilotExecutionId/scenarios/:scenarioCode`

Tillåtna statusar:

- `passed`
- `blocked`
- `failed`

Minimikrav per scenario:

- minst en verifierbar `evidenceRef`
- blocker codes när status är `blocked` eller `failed`

### 3. Verifiera support- och rollbackberedskap

Före completion måste piloten ha:

- passerade scenarios i alla sju kärnflöden
- approvals från implementation, finance och support
- `rollbackStrategyCode`
- minst en `rollbackEvidenceRef`

### 4. Slutför pilot

`POST /v1/pilot/executions/:pilotExecutionId/complete`

Payload:

```json
{
  "approvalActorIds": [
    "usr_finance",
    "usr_support"
  ],
  "rollbackStrategyCode": "restore_previous_live_and_reconcile",
  "rollbackEvidenceRefs": [
    "runbook://rollback/verified"
  ],
  "notes": "Internal dogfood pilot complete"
}
```

Förväntat resultat:

- `status = completed`
- `gateStatus = completed`
- evidence bundle skapas
- `CompanySetupProfile.status` flyttas till `pilot`

### 5. Exportera evidence

`GET /v1/pilot/executions/:pilotExecutionId/evidence`

Evidence-paketet måste innehålla:

- finance readiness snapshot
- scenarioutfall
- rollback evidence
- relaterade objekt för trial och parallel run när sådana finns

## Felhantering

- `pilot_execution_finance_not_ready`
  - bolaget är inte finance-ready
- `pilot_execution_scenarios_incomplete`
  - alla scenarios är inte `passed`
- `pilot_execution_rollback_evidence_required`
  - rollback evidence saknas
- `pilot_execution_approval_coverage_incomplete`
  - implementation/finance/support saknar komplett signoff

## Operativ gate

`18.1` är inte klar förrän följande är sant:

- unit-, integration- och e2e-flöden är gröna
- route metadata listar pilotrutterna
- evidence export visar trial/parallel-run-länkning när de används
- company setup profile stannar i `pilot` efter refresh
