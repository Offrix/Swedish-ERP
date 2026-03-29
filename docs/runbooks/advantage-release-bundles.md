# Advantage Release Bundles

Detta runbook styr fas `18.4` och gör competitor advantage till en verifierbar release-gate.

## Syfte

Bevisa svart på vitt att parity redan är grön i alla kärnkategorier och att våra market-winning differentiators är verkligt levererade innan produkten får marknadsföras som bättre än konkurrenterna.

Den här grinden kräver exakt fem differentiators:

- `tax_account_cockpit`
- `unified_receipts_recovery`
- `migration_concierge`
- `safe_trial_to_live`
- `project_profitability_mission_control`

Ingen extra move får ersätta dessa, och ingen av dem får markeras som `na`.

## Förutsättningar

- Minst en grön `ParityScorecard` finns för varje kategori:
  - `finance_platform`
  - `crm_project_service`
  - `field_vertical`
- Alla fem advantage moves är bedömda
- Varje move har evidens
- Release-beslutet körs i `pilot_parallel` eller motsvarande intern release governance-kontext

## API-flöde

### 1. Registrera advantage release bundle

`POST /v1/release/advantage-bundles`

```json
{
  "companyId": "cmp_123",
  "parityScorecardIds": [
    "parity_finance_123",
    "parity_service_123",
    "parity_field_123"
  ],
  "moveResults": [
    {
      "moveCode": "tax_account_cockpit",
      "status": "green",
      "evidenceRefs": [
        "advantage://tax_account_cockpit/green"
      ]
    },
    {
      "moveCode": "unified_receipts_recovery",
      "status": "green",
      "evidenceRefs": [
        "advantage://unified_receipts_recovery/green"
      ]
    },
    {
      "moveCode": "migration_concierge",
      "status": "green",
      "evidenceRefs": [
        "advantage://migration_concierge/green"
      ]
    },
    {
      "moveCode": "safe_trial_to_live",
      "status": "green",
      "evidenceRefs": [
        "advantage://safe_trial_to_live/green"
      ]
    },
    {
      "moveCode": "project_profitability_mission_control",
      "status": "green",
      "evidenceRefs": [
        "advantage://project_profitability_mission_control/green"
      ]
    }
  ],
  "notes": "All differentiators verified."
}
```

Förväntat resultat:

- `status = released` när alla tre parity-kategorier är gröna och alla fem moves är `green`
- `status = blocked` om någon parity-kategori saknas eller om någon move är `amber` eller `red`

### 2. Lista advantage bundles

`GET /v1/release/advantage-bundles?companyId=...`

Används för att visa:

- senaste advantage-läget per bolag
- vilka parity-scorecards som bär releasebeslutet
- vilka differentiators som fortfarande blockerar advantage

### 3. Läs detaljerad bundle

`GET /v1/release/advantage-bundles/:advantageReleaseBundleId`

Används för att visa:

- sammanfattad release readiness
- saknade parity-kategorier
- röda eller gula differentiators

### 4. Exportera evidence

`GET /v1/release/advantage-bundles/:advantageReleaseBundleId/evidence`

Evidence bundle måste innehålla:

- advantage release bundle-matris
- länkade parity-scorecards
- move-evidens för alla fem differentiators

## Statusregler

- `released`
  - parity är grön i `finance_platform`, `crm_project_service` och `field_vertical`
  - alla fem moves är `green`
- `blocked`
  - minst en parity-kategori saknas
  - eller minst en move är `amber`
  - eller minst en move är `red`

## Operativ gate

`18.4` är inte klar förrän följande är sant:

- `AdvantageReleaseBundle` finns som first-class objekt
- API-routes för create/list/read/evidence finns
- bundle blir `blocked` när parity-kategori saknas
- bundle blir `released` först när alla fem differentiators är gröna
- route metadata listar release advantage-rutterna utan dubbletter
