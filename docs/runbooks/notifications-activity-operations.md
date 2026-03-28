# Notifications and Activity Operations

## Syfte

Detta runbook beskriver drift av notification- och activity-familjerna efter fas 15.3:
- persisted notification digests
- snooze release
- notification escalation scan
- append-only activity feed och detail-read

## När den används

- när operatörer verifierar inbox, digest eller escalation-beteende
- när worker-scheman för digest, snooze release eller escalation-scan ändras
- när trial/live måste jämföras för notification-runtime
- innan fas 15.3 markeras klar eller återöppnas

## Obligatoriska kontroller

1. Bygg digest för både user- och team-recipient.
   - digesten ska persisteras som egen `notification_digest`
   - samma fingerprint får inte skapa dubbla aktiva digest-poster
2. Snooza en levererad notification och kör release efter `snoozedUntil`.
   - notification ska återgå till aktiv status
   - `snoozedUntil` ska rensas
   - audit/action history ska innehålla `release_snooze`
3. Kör escalation scan för äldre high/critical notifications.
   - första breach ska skapa `notification_escalation`
   - senare breach-window ska skapa recurring escalation och supersede äldre öppen escalation
4. Verifiera activity-feed.
   - object route och detail route ska visa samma entry för behörig aktör
   - backoffice-only activity får inte läcka till vanliga operators

## Verifiering

- riktade tester:
  - `tests/unit/phase14-notifications-activity.test.mjs`
  - `tests/integration/phase14-notifications-activity-api.test.mjs`
  - `tests/unit/phase14-async-jobs.test.mjs`
  - `tests/integration/api-route-metadata.test.mjs`
- full gate:
  - `node scripts/run-tests.mjs all`
  - `node scripts/lint.mjs`
  - `node scripts/typecheck.mjs`
  - `node scripts/build.mjs`
  - `node scripts/security-scan.mjs`

## Vanliga fel

- **Fel:** snoozed notifications dyker fortfarande upp i unread digest.  
  **Åtgärd:** verifiera `isNotificationUnread` och att release-jobbet har körts.
- **Fel:** escalation scan skapar samma breach flera gånger.  
  **Åtgärd:** verifiera breach-level-beräkning och att tidigare open-escalation supersedas.
- **Fel:** activity detail route returnerar 403 för legitim objektläsning.  
  **Åtgärd:** verifiera viewer scope, team scope och backoffice-flagga.

## Exit gate

Fas 15.3 är inte klar förrän:
- digest, snooze release och escalation fungerar i engine, API och worker
- activity feed är append-only och detail-routen är permission-trimmad
- full gate är grön
