# DOMAIN_21_ANALYSIS

## Scope

Domän 21 täcker företagets operativa arbetsyta:
- inbox, requests, tasks, approvals och deadlines
- notifieringar, activity feed, ownership och uppföljning
- cross-domain work items, decision log och exception center
- kalender- och mailkoppling som integrationsgräns, inte full ersättare för M365/Google

Verifierad repo-evidens:
- `packages/db/migrations/20260321030000_phase2_company_inbox.sql:1-71`
- `packages/db/migrations/20260324150000_phase14_notifications_activity.sql:1-89`
- `apps/api/src/server.mjs:2738-2805`
- `packages/domain-notifications/src/engine.mjs:144-193`
- `docs/domain/activity-feed.md`
- `docs/domain/notification-center.md`
- `docs/domain/work-items-deadlines-notifications.md`
- `docs/domain/bureau-portfolio-client-requests-and-approvals.md`
- `docs/runbooks/fas-2-company-inbox-verification.md`
- `docs/runbooks/notifications-activity-operations.md`
- `docs/runbooks/work-item-queue-operations.md`

Officiella källor låsta för domänen:
- [Microsoft Approvals](https://support.microsoft.com/en-us/office/what-is-approvals-a9a01c95-e0bf-4d20-9ada-f7be3fc283d3)
- [Microsoft Create an approval](https://support.microsoft.com/en-us/office/create-an-approval-6548a338-f837-4e3c-ad02-8214fc165c84)
- [Microsoft Tasks in Teams](https://support.microsoft.com/en-us/office/use-the-tasks-app-in-teams-e32639f3-2e07-4b62-9a8c-fd706c12c070)

Domslut:
- Repo:t har verkliga byggstenar för inbox, notifications och activity.
- Repo:t saknar fortfarande en sammanhållen företagsarbetsyta som bär tasks, approvals, requests, decision logs och ägarskap tvärs över domänerna.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen unified workspace root, approvals är splittrade mellan domäner, requests är fragment, workbench är inte canonical runtime.

## Verified Reality

- `verified reality` inbox channels och email ingest attachments finns i DB-modellen. Proof: `packages/db/migrations/20260321030000_phase2_company_inbox.sql:1-71`.
- `verified reality` inbox-routes för kanalregistrering och email-ingest finns i API:t. Proof: `apps/api/src/server.mjs:2738-2805`.
- `verified reality` notifications och activity entries finns som first-class tabeller. Proof: `packages/db/migrations/20260324150000_phase14_notifications_activity.sql:1-89`.
- `verified reality` notifications kan listas och summeras i runtime. Proof: `packages/domain-notifications/src/engine.mjs:144-193`.

## Partial Reality

- `partial reality` work items, requests och approvals finns bara domänvis eller dokumentmässigt, inte som företagsgemensam workspace-kärna.
- `partial reality` workbench-tänk finns i docs, men saknar en canonical workspace aggregate som bär uppgifter, beslut, deadlines och inbox i samma sanning.

## Legacy

- `legacy` review center, bureau requests, notifications och inbox lever som parallella delspår i stället för en enhetlig workspace root. Riktning: `rewrite`.
- `legacy` work-item- och notification-docs beskriver delar av problemet men inte en verklig workspace-kärna. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad, men dagens dokumentdrivna workbench-begrepp riskerar att fungera som falsk ersättning för saknad runtime.

## Misleading / False Completeness

- `misleading` inbox + notifications + activity kan se ut som färdig företagsarbetsyta, men de saknar first-class requests, approvals, deadlines, ownership och decision log.
- `misleading` workbench-beskrivningar i docs kan misstas för canonical runtime trots att object family saknas.

## Workspace Findings

- `critical` unified workspace source of truth saknas. Farligt eftersom operativt arbete annars splittras över inbox, review center, bureau requests, notifications och manuella rutiner. Riktning: `replace`.
- `high` approvals är splittrade mellan olika domäner och saknar gemensam approval engine med delegation, escalation och receipts. Riktning: `create`.
- `high` requests och tasks saknas som first-class cross-domain objects. Farligt eftersom attest, internbegäran, uppföljning och intern drift inte kan drivas i en gemensam yta. Riktning: `create`.
- `medium` kalender- och mailkoppling finns inte som tydlig integrationsgräns. Farligt eftersom systemet inte blir företagets faktiska arbetsyta. Riktning: `create`.

## Doc / Runbook Findings

- `high` `docs/domain/work-items-deadlines-notifications.md`, `docs/domain/notification-center.md` och `docs/domain/activity-feed.md` måste skrivas om så att de blir consumer docs till en verklig workspace core. Riktning: `rewrite`.
- `high` nya runbooks för workspace requests, approvals och exception center måste skapas. Riktning: `create`.

## Go-Live Blockers

- Ingen canonical workspace object family för tasks, requests, approvals och decision logs.
- Ingen unified ownership- och deadline-sanning.
- Ingen proper workbench/exception-center runtime.
- Ingen tydlig integrationsgräns till kalender/mail utan att försöka bygga full ersättare för externa verktyg.
