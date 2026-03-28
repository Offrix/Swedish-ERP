# Tax Account Difference Resolution

Detta runbook styr hur öppna skattekontoavvikelser hanteras innan close, filing eller cutover får fortsätta.

## Mål

- ingen öppen discrepancy case får glida igenom till close eller filing
- manuell klassificering ska vara spårbar till event, liability och aktör
- waiver får bara användas när avvikelsen medvetet hanteras utanför plattformen

## Ingångar

- `GET /v1/tax-account/discrepancy-cases`
- `GET /v1/tax-account/events`
- `GET /v1/tax-account/liabilities`
- `GET /v1/tax-account/offset-suggestions`

## Standardflöde för assessment-avvikelse

1. Läs discrepancy case och identifiera kopplat `taxAccountEventId`.
2. Verifiera om expected liability redan finns.
3. Om liability finns:
   - kör `POST /v1/tax-account/events/:taxAccountEventId/classify`
   - ange `reconciliationItemId`
   - ange `differenceCaseId`
   - ange tydlig `resolutionNote`
4. Verifiera att:
   - eventet inte längre är `unmatched`
   - discrepancy case är `resolved`
   - `balance.blockerCodes` är tom för just detta fall

## Standardflöde för settlement-avvikelse

1. Kör reconciliation eller läs `offset-suggestions`.
2. Godkänn endast explicit suggestion med `POST /v1/tax-account/offsets`.
3. Verifiera att credit-eventet har gått till `partially_matched` eller `closed`.
4. Verifiera att kopplade discrepancy cases inte längre blockerar close/filing.

## Review

Använd `POST /v1/tax-account/discrepancy-cases/:discrepancyCaseId/review` när:
- avvikelsen är förstådd
- nästa steg är känt
- resolution eller waiver ännu inte ska göras direkt

Review ska innehålla:
- varför fallet är granskat
- vilket nästa steg som förväntas
- vem som ansvarar för sista åtgärd

## Waiver

Använd `POST /v1/tax-account/discrepancy-cases/:discrepancyCaseId/waive` endast när:
- avvikelsen inte ska lösas i plattformen
- orsaken är dokumenterad
- ekonomisk eller regulatorisk konsekvens är accepterad

Waiver måste alltid bära:
- `waiverReasonCode`
- `resolutionNote`
- spårbar aktör via stark auth-session

## Förbjudet

- att boka bort discrepancy cases genom dold direct ledger-logik
- att ändra event till resolved utan explicit classify, resolve eller waive-flöde
- att låta open discrepancy passera close eller filing gates

## Exitkriterier

- `openDifferenceCaseCount = 0` för relevant företag eller relevant case-set
- `blockerCodes` tom eller uttryckligen accepterad via separat governance-beslut
- auditkedjan visar vem som reviewed, resolved eller waived fallet
