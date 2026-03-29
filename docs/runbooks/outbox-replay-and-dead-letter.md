> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Outbox replay and dead-letter

## Syfte

Detta runbook styr operatorarbete kring durable async jobs, claim expiry, poison-pill-detektion, dead-letter och replay-planer.

## När den används

- när en worker-process dör mitt i en attempt och claim expires
- när en jobbkedja hamnar i `dead_lettered`
- när dead-letter markerats som poison pill
- när replay behöver planeras, godkännas och köras utan direkt databasåtgärd

## Grundregler

1. Dead-letter löser bara tekniskt stoppad bearbetning, aldrig affärsbeslut.
2. Replay går alltid via `plan -> approve -> execute`.
3. Poison-pill betyder att jobbkedjan visat deterministiskt terminalt beteende och inte får fortsätta loopa i kö.
4. Claim expiry efter processdöd får requeueas bara så länge poison-tröskel inte passerats.

## Poison-pill-kriterier

- `job_handler_missing`
- upprepad persistent failure med samma error fingerprint
- claim-expiry-loop som når poison-tröskel eller max attempts

## Steg för steg

1. Identifiera jobbet.
   - kontrollera `jobId`, `jobType`, `companyId`, `correlationId`, `attemptCount`, `claimExpiryCount`
2. Läs attempts.
   - bekräfta om senaste attempt slutade med `worker_claim_expired`, persistent error eller saknad handler
3. Läs dead-letter.
   - kontrollera `terminalReason`
   - kontrollera `poisonPillDetected`
   - kontrollera `poisonReasonCode`
   - kontrollera `replayAllowed`
4. Avgör åtgärd.
   - requeue har redan skett automatiskt om claim expiry var recoverable
   - poison pill kräver operatortriage, inte ny ad hoc-körning
   - affärsfel kräver domänkorrigering före replay
5. Planera replay.
   - skapa replay-plan
   - använd separat approver
   - kör replay först efter approval
6. Verifiera resultat.
   - replay-plan ska gå till `scheduled`, sedan `running`, sedan terminalt utfall
   - inga nya orphan attempts får finnas öppna efter claim-expiry-recovery

## Verifiering

- claim-expired attempts är stängda och spårbara
- recoverable jobs ligger åter i `queued`
- poison pills ligger i `dead_lettered` med poison metadata
- replay-planer har full approval chain
- incident/evidence kan härledas via correlation id

## Exit gate

Runbooken är klar när operator kan hantera claim-expiry-failover, poison-pill-detektion, dead-letter och replay utan direkt databasingrepp.

