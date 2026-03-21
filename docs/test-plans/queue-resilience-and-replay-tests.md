# Queue resilience and replay tests

## Mål

Målet är att verifiera att köer, jobbstatus, retry-policy, replay och dead-letter-hantering fungerar deterministiskt och säkert under både normallast och fel. Planen ska visa att meddelanden inte tappas, inte dupliceras okontrollerat och att operatör kan återställa flöden utan dold dataförlust.

## Scope

- asynkrona jobb för search projection, notifications, OCR, bankimport, submissions, exports och andra workers
- retry, backoff, timeout, cancellation, supersede, dead-letter och replay
- auditkoppling mellan användaråtgärd, domänhändelse, jobb och side effect
- köernas beteende vid beroendefel, schemabyte och worker-restart

## Fixtures

- seedade jobbklasser med kända retry-profiler och tidsgränser
- fixtures för transient 5xx, timeout, nätverksfel, permanent schemafel och domänblock
- golden payloads med idempotensnycklar och förväntade terminala tillstånd
- lastprofiler för normalvolym, toppvolym och återhämtningsvolym

## Testlager

1. Unit tests för state transitions, backoffberäkning, timeoutklassificering och idempotensbeslut.
2. Integrations- och komponenttester mot kö, worker, databas och observability.
3. Contract tests mot event- och jobbscheman samt dead-letter-payload.
4. E2E-tester genom domänhändelse till worker, side effect och audit explorer.
5. Chaos- och restoretester med stoppad worker, intermittent extern tjänst och queue-resume.

## Golden data

- dataset med avsiktligt duplicerade domänhändelser och förväntat exakt ett affärsutfall
- dataset med tekniska fel i försök 1–N och förväntad övergång till `succeeded`
- dataset med permanenta payloadfel och förväntad dead-letter eller manuell kö
- replaydataset som bevisar att historiskt jobb kan köras säkert efter fix

## Kontraktstester

- verifiera att jobbevent innehåller korrelations-id, idempotensnyckel, attempt-nummer och felklass
- verifiera att queue-konsumenter respekterar timeout och ack/nack-regler
- verifiera att replay-API eller adminaction kräver korrekt metadata och inte accepterar okänd jobbklass
- verifiera att dead-letter-payload innehåller tillräcklig diagnostik utan otillåtet känsligt innehåll

## E2E-scenarier

- skapa domänhändelse som producerar jobb och låt första attempt fallera transient; bekräfta automatisk retry och slutlig framgång
- skapa payloadfel som går till dead-letter; fixa orsaken och kör kontrollerad replay; verifiera ett korrekt utfall
- simulera worker-crash mitt under behandling; verifiera att jobbet inte fastnar i tyst förlust och inte ger dubbel side effect
- kör mass-retry över vald jobbklass; verifiera att domain-block-fall sorteras ut till manuell åtgärd
- följ hela auditkedjan från användarklick till jobb, replay och slutlig objektstatus

## Prestanda

- mäta throughput, ködjup, återhämtningstid och dead-letter-frekvens vid toppvolym
- verifiera att backoff och jitter förhindrar thundering herd efter extern incident
- verifiera att full replay av definierat scope ryms inom driftfönster utan oacceptabel latens för övriga köer

## Felvägar

- dubbel side effect trots samma idempotensnyckel
- jobb som fastnar i `running` efter workerkrasch
- replay som återanvänder föråldrad payload fast källdomänen ändrats
- operatörsretry av jobb som borde stoppas av policy eller periodlås
- dead-letter utan ägare eller klassificering

## Acceptanskriterier

- inga otillåtna dubbla affärsutfall uppstår i något test
- varje jobb når korrekt terminalstatus eller dokumenterad manuell status
- replay och mass-retry kan köras utan att bryta auditkedjan
- dead-letter-poster är reproducerbara och felsökningsbara
- systemet återhämtar sig efter workerstopp och beroendefel inom definierad målgräns

## Exit gate

Testplanen är klar när samtliga kötyper passerar resilience-, replay- och dead-letter-scenarier utan okända dubletter, tyst dataförlust eller oförklarade statusbrott.
