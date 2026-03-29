# Parity Scorecards

Detta runbook styr fas `18.3` och gör konkurrentparity till en verifierbar release-gate.

## Syfte

Mäta svart på vitt om vi når parity mot definierade konkurrenter inom:

- finansplattformar
- CRM/project/service-plattformar
- field/build-vertikaler

Ingen generell release får gå vidare om ett kärnscorecard som krävs för målsegmentet är rött.

## Förutsättningar

- Minst en accepterad `PilotCohort` finns för de segment som konkurrenten kräver
- Alla obligatoriska kriterier för vald konkurrent är bedömda
- Alla go-live parity-gates är bedömda
- Varje kriterie- och gatebedömning har evidens

## API-flöde

### 1. Registrera scorecard

`POST /v1/release/parity-scorecards`

```json
{
  "companyId": "cmp_123",
  "competitorCode": "fortnox",
  "pilotCohortIds": [
    "cohort_123"
  ],
  "criteriaResults": [
    {
      "criterionCode": "finance_ready_tenant_setup",
      "status": "green",
      "evidenceRefs": [
        "evidence://finance_ready_tenant_setup"
      ]
    }
  ],
  "gateResults": [
    {
      "gateCode": "finance_hygiene",
      "status": "green",
      "evidenceRefs": [
        "gate://finance_hygiene"
      ]
    }
  ]
}
```

Förväntat resultat:

- `status = green` om alla kriterier och gates är gröna
- `status = blocked` om någon kriterie- eller gatepost är `amber` eller `red`

### 2. Lista scorecards

`GET /v1/release/parity-scorecards?companyId=...&competitorCode=...`

Används för att visa:

- senaste parity-läget per konkurrent
- vilka segmentkohorter som ligger bakom
- vilka kriterier som fortfarande blockerar parity

### 3. Exportera scorecard-evidens

`GET /v1/release/parity-scorecards/:parityScorecardId/evidence`

Evidence bundle måste innehålla:

- parity scorecard-matris
- länkade pilot cohort-referenser
- kriterieevidens
- gateevidens

## Statusregler

- `green`
  - inga `amber`
  - inga `red`
  - inga blockerade go-live-gates
- `blocked`
  - minst en `amber`
  - eller minst en `red`
  - eller minst en go-live-gate som inte är `green`

## Operativ gate

`18.3` är inte klar förrän följande är sant:

- `ParityScorecard` finns som first-class objekt
- finansparity kan visas grönt
- projekt/CRM-parity kan visas blockerad när ett verkligt gap finns
- field-parity kan visas grönt för construction/ID06-spåret
- route metadata listar release parity-rutterna utan dubbletter
