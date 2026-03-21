# ADR-0015 — Async jobs, queues and replay strategy

Status: Accepted  
Date: 2026-03-21

## Context

- OCR, exports, sökindex, submissiontransport och andra tunga processer måste köras asynkront.
- Transienta fel, okända utfall och behov av replay är oundvikliga.
- Operatörer behöver kunna triagera och återspela jobb utan att bryta idempotens eller affärsinvarians.

## Decision

- Vi inför ett varaktigt jobbobjekt med attempt-historik, retry-policy, timeout, dead-letter och replay-plan.
- Alla jobb ska ha idempotensnyckel, korrelations-id och explicit felklass.
- Retry får bara ske enligt jobbtypens policy; business-input-fel får inte återförsökas oförändrat.
- Dead-letter blir permanent operativ yta tills replay eller avslut är beslutat.
- Replay ska ske via kontrollerat nytt jobb eller godkänd återöppning, aldrig genom dold mutation av gamla attempts.

## Alternatives considered

- Enkel fire-and-forget-kö utan persistent jobbobjekt avvisades eftersom support och audit då blir otillräckliga.
- Oändlig retry-loop avvisades eftersom den riskerar att förstärka fel och skapa dubbelpåverkan.
- Manuell databasingrepp för replay avvisades eftersom det bryter spårbarheten.

## Consequences

- Varje jobbtyp måste få tydlig policy för retry, timeout och riskklass.
- Dead-letter-runbook och testplan blir obligatoriska.
- Högriskjobb kräver extra approvals vid replay.

## Verification

- [ ] jobb körs idempotent och attempts loggas append-only
- [ ] transienta och permanenta fel klassificeras olika
- [ ] dead-letter kan triageras och replayas säkert
- [ ] timeout och okänt utfall hanteras explicit
- [ ] korrelation mellan användaraction, domänhändelse och jobb kan visas
