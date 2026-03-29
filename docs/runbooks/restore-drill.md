> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Restore Drill

Den här runbooken är bindande för FAS 3.4 restore drills och chaos-övningar.

## Syfte

Bevisa att plattformen kan:
- återställa databasbackup inom mål-RTO/RPO
- bygga om projection/read models utan source-of-truth-drift
- tåla worker/process-restart utan okontrollerad köförlust

Ingen cutover, pilot eller production go-live är godkänd utan färska godkända restore drills enligt denna runbook.

## Obligatorisk coverage

Följande drilltyper måste ha minst en dokumenterad godkänd körning:
- `database_restore`
- `projection_rebuild`
- `worker_restart`

`worker_restart` kräver dessutom ett dokumenterat chaos-scenario med `scenarioCode=worker_restart`.

## Förberedelser

1. Säkerställ att aktuell restore plan är godkänd om drillen refererar till `restorePlanId`.
2. Säkerställ att rätt operatör kör drillen.
3. Kontrollera att observability visar aktuell provider health, queue age och invariants innan start.
4. Kontrollera att evidence pack-export fungerar för den kedja som ska verifieras.

## Databasåterställning

1. Skapa restore drill med `drillType=database_restore` och status `scheduled`.
2. Ange mål-RTO, mål-RPO och backupreferens i evidence.
3. Starta drillen via `POST /v1/ops/restore-drills/:restoreDrillId/start`.
4. Kör verifierad restore mot avsedd återställningspunkt.
5. Validera:
   - databas kommer upp
   - domänkritiska objekt finns
   - audit/evidence-kedjor är intakta
   - regulated submission history finns kvar
6. Slutför drillen via `POST /v1/ops/restore-drills/:restoreDrillId/complete` med faktiska RTO/RPO och verifieringssammanfattning.

## Projection rebuild

1. Skapa restore drill med `drillType=projection_rebuild` och status `scheduled`.
2. Ange berörda projection/read-model-koder i evidence.
3. Starta eller slutför drillen genom att köra verifierad rebuild enligt [C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\projection-rebuild.md](C:\Users\snobb\Desktop\Swedish%20ERP\docs\runbooks\projection-rebuild.md).
4. Validera:
   - rebuild ändrar inte source of truth
   - checkpoint parity återställs
   - saved views och workbench-kontrakt fungerar efter rebuild
5. Slutför drillen med faktiska RTO/RPO och evidence för parity.

## Worker restart chaos

1. Skapa restore drill med `drillType=worker_restart` och status `scheduled`.
2. Skapa chaos-scenario via `POST /v1/ops/chaos-scenarios` med:
   - `scenarioCode=worker_restart`
   - `failureMode=worker_process_crash`
   - `restoreDrillId`
3. Simulera kontrollerad worker/process-restart.
4. Validera:
   - claim expiry eller återclaim fungerar
   - replay/dead-letter-logik förblir intakt
   - queue backlog återhämtar sig inom måltid
   - worker structured logs och trace chains syns i observability
5. Slutför restore drillen med faktiska RTO/RPO och referens till chaos-scenariot i evidence.

## Misslyckad drill

Om en drill misslyckas:
- slutför med `status=failed`
- kontrollera att incident signal öppnas
- öppna eller uppdatera incident
- skapa ny drill i stället för att mutera historiken

## Verifiering före signoff

Kontrollera i `GET /v1/ops/observability` att:
- `runtimeControlPlane.restoreDrillCoverage.missingRestoreDrillTypes` är tom
- `workerRestartChaosCovered` är `true`
- inga öppna blockerande invariants finns för restore/recovery

## Dokumentation som måste finnas

Varje godkänd drill måste ha:
- restore drill record
- verifieringssammanfattning
- evidence-referenser
- auditspår
- eventuell chaos-scenarioreferens

