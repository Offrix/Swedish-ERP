# Pilot Cohorts

Detta runbook styr segmentkohorter i fas `18.2`.

## Syfte

Bevisa att varje målsegment har minst en accepterad pilotkohort med återanvändbar cutover-mall, rollback-evidens och segmenttäckning innan generell release.

## Segment

- `finance_payroll_ab`
- `service_project_company`
- `hus_business`
- `construction_service_id06`
- `enterprise_sso_customer`

Varje segment kräver en definierad scenariomängd. Kohorten får inte accepteras förrän alla obligatoriska scenarier täcks av länkade, färdigställda pilotexekveringar.

## Förutsättningar

- Alla länkade `pilot_execution`-objekt har `status = completed`
- Varje pilot tillhör samma bolag som kohorten
- Segmentkrävda scenarier är passerade i minst en länkad pilot
- Finance, implementation och support approval finns
- Minst en återanvändbar cutover template har evidens
- Minst en rollback evidence finns

## API-flöde

### 1. Starta kohort

`POST /v1/pilot/cohorts`

```json
{
  "companyId": "cmp_123",
  "segmentCode": "service_project_company",
  "label": "Service project cohort"
}
```

Förväntat resultat:

- `status = planned`
- `coverageSummary.readyForAcceptance = false`

### 2. Länka färdiga pilotexekveringar

`POST /v1/pilot/cohorts/:pilotCohortId/pilots`

```json
{
  "pilotExecutionIds": [
    "pilot_123"
  ]
}
```

Förväntat resultat:

- `status = running`
- `coverageSummary.completedPilotCount >= minimumPilotCount`
- `coverageSummary.missingScenarioCodes = []` innan acceptans

### 3. Acceptera kohort

`POST /v1/pilot/cohorts/:pilotCohortId/assess`

```json
{
  "decision": "accepted",
  "approvalActorIds": [
    "usr_finance",
    "usr_support"
  ],
  "reusableCutoverTemplateRefs": [
    "cutover-template://service-project/v1"
  ],
  "rollbackEvidenceRefs": [
    "runbook://rollback/verified"
  ]
}
```

Förväntat resultat:

- `status = accepted`
- frozen cohort evidence bundle skapas
- inga kvarvarande blocker codes

### 4. Exportera kohortevidens

`GET /v1/pilot/cohorts/:pilotCohortId/evidence`

Evidence måste innehålla:

- cohort coverage matrix
- länkade pilot execution-referenser
- återanvändbar cutover template evidence
- rollback evidence

## Rejection path

Om kohorten inte kan accepteras används:

`POST /v1/pilot/cohorts/:pilotCohortId/assess`

med:

- `decision = rejected`
- minst en `blockerCode`
- noterad orsak

## Operativ gate

`18.2` är inte klar förrän följande är sant:

- unit-, integration- och e2e-flöden är gröna
- segmentkohort finns som first-class objekt
- accepted cohort exporterar evidence bundle
- construction/service-segmentet bevisar extra scenarier för `project_profitability` och `personalliggare_id06`
- API route metadata listar cohort-rutterna utan dubbletter
