# Fas 15.2 verifiering: search, object profiles och workbenches

## Mål

Verifiera att object profiles, workbenches och saved views är permission-trimmade, kompatibla och rebuild-säkra innan nästa delfas öppnas.

## Körordning

1. Kör riktade unit- och integrationstester för fas 15.2.
2. Kör `search`-reindex i test- eller pilotmiljö om projektioner nyligen ändrats.
3. Kör saved-view compatibility scan för den yta som har ändrats.
4. Bekräfta att object profiles returnerar blockers, sections, actions och permission summary från projektionerna.
5. Bekräfta att workbench-counters, rows och saved views materialiseras deterministiskt.

## Obligatoriska kontroller

- `GET /v1/object-profiles/:objectType/:objectId` returnerar:
  - sections från projektionen
  - blockers från projektionen eller kontraktet
  - allowed actions
  - permission summary
- samma route returnerar `403 object_profile_forbidden` när viewer scope inte matchar search document scope
- `GET /v1/workbenches/:workbenchCode` returnerar:
  - rows permission-trimmade server-side
  - counters som bygger på samma projektioner
  - saved view list för aktuell yta
  - active saved view när `savedViewId` skickas
- `POST /v1/saved-views/compatibility-scan` markerar brutna saved views deterministiskt med reason code
- search är aldrig source of truth; profile/workbench får bara visa materialiserad read-model-data

## Rekommenderade kommandon

```powershell
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase15-search-workbench-runtime.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase15-search-workbench-api.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase35-search-read-model-contracts.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase35-search-read-model-api.test.mjs
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Felbilder som blockerar fasen

- object profile kan läsas trots att permission scope nekar
- workbench visar rows utanför viewer scope
- saved view blir aktiv trots inkompatibel filter- eller sortdefinition
- compatibility scan är icke-deterministisk mellan två körningar med samma projectionsläge
- counters avviker från rows eller blocker badges

## Exit gate

Fasen är klar först när:

- riktade tester är gröna
- full verifiering är grön
- saved-view compatibility scan fungerar
- object profiles och workbenches är permission-trimmade
- roadmapens 15.2 kan markeras klar utan manuell reservation
