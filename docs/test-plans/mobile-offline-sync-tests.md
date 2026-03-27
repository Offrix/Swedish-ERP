> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Mobile offline sync tests

## Mål

Målet är att verifiera att offlinekön, lokal pending state, synkstatus, merge-regler och konflikt-UI fungerar korrekt för tillåtna offline-redigerbara objekt och att förbjudna offlineactions stoppas uttryckligt.

## Scope

- mobil/offline-klientens kö, lokala snapshotar och server-synk
- objekt som får redigeras offline samt objekt som aldrig får skapas eller godkännas offline
- retry/backoff, konfliktupptäckt, merge-regler och dubblettskydd
- audit trail för offlineflöden och supportreparation

## Fixtures

- fixtures med två enheter per användare, offline/tillbaka-online-sekvenser och kontrollerade klockskiften
- objekt med policy för `server wins`, `local wins` och `manual resolution`
- förbjudna offlineactions såsom sign-off, betalning, submission eller periodlåsning
- nätverksprofiler med total avbrott, intermittent paketförlust och hög latens

## Testlager

1. Unit tests för lokal operationslogg, idempotensnyckel, konfliktupptäckt och mergefunktioner.
2. Integrations- och komponenttester mellan klientlagring, syncmotor och server-API.
3. Contract tests för syncpayload, felkoder och konfliktformat.
4. E2E-tester på verkliga användarflöden över offline/online-övergångar.
5. Recovery-tester mot klientkorruption, app-uppgradering och supportledd reparation.

## Golden data

- golden flows för skapa, ändra, återöppna och radera inom tillåtna offlineobjekt
- golden konfliktfall med exakt förväntad merge eller manuell upplösning
- golden dubblettfall där samma avsikt inte får skapa flera serverobjekt
- golden auditkedjor som visar lokal och server sida av samma händelse

## Kontraktstester

- verifiera att sync-API uttryckligen klassificerar `conflict`, `duplicate`, `unsupported_offline_action`, `retryable` och `non_retryable`
- verifiera att klienten skickar versions- eller ETag-liknande information som krävs för konfliktbedömning
- verifiera att servern aldrig accepterar offlineaction för förbjuden objekttyp eller förbjuden statusövergång

## E2E-scenarier

- skapa tillåtet offlineobjekt, gå online och verifiera exakt ett serverobjekt med korrekt audit
- ändra samma objekt på två enheter och verifiera konflikt-UI och vald merge-strategi
- försök sign-off eller submission offline; verifiera tydligt block och auditad nekning
- simulera appkrasch mitt i sync; verifiera återupptagning utan tyst dataförlust
- kör supportledd konfliktreparation enligt runbook och verifiera slutresultat i klient och server

## Prestanda

- mäta synclatens per operationstyp efter återanslutning
- mäta köstorlek, batteri- och nätpåverkan vid bulk-sync
- verifiera att hög konfliktgrad inte orsakar oacceptabel UI-frysning eller massdubletter

## Felvägar

- lokal operation försvinner utan spår
- klient tror att sync lyckats fast servern avvisat
- samma offlineåtgärd skapar flera serverobjekt
- förbjuden offlineaction accepteras
- konflikt-UI saknar tillräcklig information för beslut

## Acceptanskriterier

- tillåtna offlineflöden synkar deterministiskt
- förbjudna offlineflöden blockeras konsekvent
- varje konflikt följer definierad merge-regel eller manuell resolution
- audit trail gör det möjligt att rekonstruera både lokal och servermässig historik

## Exit gate

Testplanen är klar när offline-klienten bevisligen hanterar nätavbrott, konflikter och dubblerisker utan okänd dataförlust eller otillåtna statusändringar.

