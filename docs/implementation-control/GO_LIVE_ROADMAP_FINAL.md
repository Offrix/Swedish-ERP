# GO_LIVE_ROADMAP_FINAL — Swedish ERP

Datum: 2026-03-29  
Status: enda bindande byggordning  
Granskare/författare: GPT 5.4 Pro — slutlig go-live-styrning och byggordning

Detta dokument ersätter `GO_LIVE_ROADMAP.md`, `PHASE_IMPLEMENTATION_BIBLE.md` och äldre byggordningar där de krockar med innehållet här.  
Historiska `[x]`-markeringar i tidigare dokument är **inte** bindande acceptansbevis.

## Hur nuvarande roadmap och bible har behandlats

### Det som behålls

- Nuvarande roadmap och bible har rätt **produktpositionering**: plattformen ska vara generell svensk företagsplattform, inte byggcentrerad.
- Nuvarande docs har rätt **makroordning** i att finance/payroll måste komma före general project core och vertikala packs.
- Nuvarande docs har rätt **trial/live-separationsriktning** och rätt intuition om operator-first support/backoffice.
- Nuvarande docs har rätt **rulepack/provider-baseline-tänk** och rätt intuition om unified receipts/recovery.

### Det som är otillräckligt eller för vagt

- Nuvarande docs använder många `[x]`-markeringar och återverifieringsnotiser som inte kan behandlas som bindande acceptansbevis för kodbasen här och nu.
- Secret governance, crypto och storage-regler är för abstrakta. De säger inte svart på vitt vad som måste krypteras, hash:as, tokeniseras eller förbjudas i snapshots.
- Migration/cutover är för cockpitorienterat och inte tillräckligt definierat som generell motor för många svenska källsystem och byråer.
- Owner distributions/aktieutdelning saknas som riktig domänkapabilitet.
- SIE4 import/export saknas som first-class kapabilitet trots att den är kritisk för revision, migration och byråsamarbete.
- Corporate tax / Inkomstdeklaration 2 är för tunt specificerat för att kunna byggas utan tolkning.
- Transaktionsgränserna är inte tillräckligt hårt definierade; mutate-then-persist-problemet måste lösas tekniskt, inte bara dokumentärt.

### Det som skrivs om i denna finala roadmap

- Historiska `[x]`-markeringar blir icke-bindande.
- Faserna skrivs om så att bank-grade security, SIE4, owner distributions och generell migration får explicit plats.
- Blocker-traceability skrivs om så att alla F-001–F-066 får exakt fasplats.
- Paritet och advantage definieras som hårda gater, inte inspirationsavsnitt.

## Absoluta regler

1. Produkten är en generell svensk företagsplattform. Bygg/field/personalliggare/ID06 är vertikala pack, inte produktkärna.
2. Backend måste vara färdig och bevisad före UI-kontraktsfrysning. UI är aldrig acceptansbevis.
3. Inga simuleringar, seeds eller stubs får räknas som live coverage.
4. Alla regulatoriska värden, tabeller, procentsatser och format måste ligga i rulepacks eller baseline-register med effective dating.
5. All live-relevant state måste vara durable, versionssatt, replaybar och återställbar.
6. Alla secrets, auth factors, provider credentials, signing secrets och webhook secrets följer bank-grade security-arkitekturen i implementationsbiblioteket.
7. Trial och live är alltid tekniskt, kryptografiskt och operativt separerade.
8. Ingen regulated flow får sakna receipts/evidence chain.
9. Ingen high-risk action får sakna action class, trust requirement, review boundary och audit trail.
10. Alla findings i `GO_LIVE_BLOCKERS_AND_FIXES.md` och alla nya obligatoriska arbetsobjekt nedan måste ha en plats i byggordningen.

## Markörlegend

- `[NEW BUILD]` ny kapabilitet eller ny modul
- `[HARDEN]` befintlig kod finns men måste göras driftmässig
- `[REWRITE]` nuvarande lösning är strukturellt fel och måste skrivas om
- `[REPLACE]` nuvarande mekanism eller provider måste ersättas
- `[REMOVE/DEPRECATE]` ska tas bort eller göras icke-bindande
- `[MIGRATE]` data, state, callers eller artefakter måste flyttas
- `[SECURE]` säkerhetskrav som inte får lämnas till tolkning
- `[OPERATIONALIZE]` runbooks, gater, processer och operatörsstöd måste bli verkliga

## Hårda blockerare som gäller omedelbart

- Inga historiska `[x]` i gamla styrdokument får tolkas som färdig implementation.
- Ingen live eller pilot på nuvarande mutate-then-persist-path.
- Ingen live auth/session/factor path innan TOTP/provider secrets flyttats ur vanlig durable state.
- Ingen live finance/payroll/VAT/HUS innan canonical value kernel är på plats.
- Ingen live migration/cutover innan rollback är tekniskt verklig och checkpointad.
- Ingen AB-go-live utan owner distributions / KU31 / kupongskatt-stöd.
- Ingen bred svensk byrå- eller revisionsgo-live utan SIE4 import/export.
- Ingen parity- eller advantage-claim innan scorecards i fas 18 är gröna.

## Fasberoenden i kortform

| Fas | Namn | Beroenden | Måste vara grön före |
| --- | --- | --- | --- |
| 0 | Styrningsreset, supersession och scope-låsning | Ingen | nästa beroende fas / go-live gate |
| 1 | Canonical value kernel, objektsemantik och runtime-ärlighet | 0 | nästa beroende fas / go-live gate |
| 2 | Durable persistence, transaktionsgränser, outbox, replay och recovery | 1 | nästa beroende fas / go-live gate |
| 3 | Bank-grade security foundation och dataklassificering | 2 | nästa beroende fas / go-live gate |
| 4 | Audit, evidence, observability, canonical contracts och permission resolution | 3 | nästa beroende fas / go-live gate |
| 5 | Rulepack-registry, regulatoriska baselines och provider-baselines | 4 | nästa beroende fas / go-live gate |
| 6 | Identity trust, MFA, BankID, passkeys, tenant bootstrap och trial/live isolation | 5 | nästa beroende fas / go-live gate |
| 7 | Finansiell grund: legal form, fiscal year, accounting method, ledgerkärna, close och SIE4 | 6 | nästa beroende fas / go-live gate |
| 8 | AR, AP, VAT, banking och tax account som sammanhängande financial truth | 7 | nästa beroende fas / go-live gate |
| 9 | Documents, OCR, klassificering, import cases och review center | 8 | nästa beroende fas / go-live gate |
| 10 | HR, time, balances, collective agreements och migration intake | 9 | nästa beroende fas / go-live gate |
| 11 | Payroll, AGI, benefits, travel, pension och garnishment | 10 | nästa beroende fas / go-live gate |
| 12 | HUS, regulated submissions, annual reporting, corporate tax och owner distributions | 11 | nästa beroende fas / go-live gate |
| 13 | Generell project core, WIP, profitability, field och vertikala packs | 12 | nästa beroende fas / go-live gate |
| 14 | Reporting, search, notifications, activity och operativa workbenches | 13 | nästa beroende fas / go-live gate |
| 15 | Integrationsplattform, public API, partner API, webhooks och verkliga adapters | 14 | nästa beroende fas / go-live gate |
| 16 | One-click migration/import engine, bureau mode, cutover, parallel run och rollback | 15 | nästa beroende fas / go-live gate |
| 17 | Operations, support, backoffice, incidents, replay och runbook-drivna driftgränser | 16 | nästa beroende fas / go-live gate |
| 18 | Pilot, parity gate, advantage gate, UI-contract freeze och GA | 17 | nästa beroende fas / go-live gate |

## Tillåtna parallellfönster

### Parallellfönster A
- Fas 1 helper-utrensning kan gå parallellt med fas 0-spårbarhet och mock-/seedinventering.
- Inga affärsbeteenden får ändras utanför canonical value kernel innan fas 1 är grön.

### Parallellfönster B
- Fas 2 durability och fas 3 security foundation får överlappa när value kernel och dataklassificeringens grundobjekt är låsta.
- Fas 4 contract/evidence-arbete kan starta när fas 2 commit-path är definierad.

### Parallellfönster C
- Fas 5 rulepacks/baselines kan löpa parallellt med fas 6–8 så länge alla domäner konsumerar publicerade refs i stället för hårdkodade värden.
- Fas 9 documents/review kan gå parallellt med delar av fas 10.

### Parallellfönster D
- Fas 11 payroll kan byggas parallellt i interna spår efter att fas 10:s HR/time/balance/agreement contracts är låsta.
- Fas 12 HUS/annual/owner distributions kan delas upp internt, men regulated submissions engine måste vara gemensam.

### Parallellfönster E
- Fas 15 integrations control plane kan gå parallellt med delar av fas 16 migration engine.
- Fas 17 operations/runbooks kan börja så snart fas 14 workbenches finns.

## Förbjudna parallellismer

- Fas 7–12 på gamla money/clone helpers.
- Fas 11 före fas 10.
- Fas 12.5 owner distributions payout före fas 12.4 annual/tax pack.
- Fas 13 vertikala packs före 13.1 general project core och 13.2 WIP-ledger.
- Fas 16 live cutover före fas 2, 3, 6, 7, 8, 11, 12 och 15.
- Fas 18 GA före fas 17.

## Fas 0 — Styrningsreset, supersession och scope-låsning

**Mål**  
Ogiltigförklara gamla självattesterade statusmarkeringar, göra denna roadmap och implementationsbiblioteket till enda bindande styrning, och låsa produkten som generell svensk företagsplattform.

**Varför fasen behövs**  
Nuvarande roadmap och bible har bra struktur men deras [x]-markeringar kan inte behandlas som leveransbevis. Utan ett hårt styrningsreset fortsätter gammal dokumentlogik att styra fel ordning och fel riskaptit.

**Beroenden**  
Ingen

**Får köras parallellt med**  
Dokumentstädning, spårbarhetsmatris och mock-/seedinventering.

**Får inte köras parallellt med**  
Ingen ny affärslogik, ingen ny live-adapter, ingen UI-byggnation.

**Delfaser**  
- [x] 0.1 [REWRITE][REMOVE/DEPRECATE] Ogiltigförklara historiska `[x]` och markera `GO_LIVE_ROADMAP.md` samt `PHASE_IMPLEMENTATION_BIBLE.md` som historiska input, inte som acceptansbevis.
- [ ] 0.2 [REWRITE] Behåll det som är rätt i nuvarande styrning: generell plattform, trial/live-separation, provider-baselines, project core efter finance/payroll och operator-first support.
- [ ] 0.3 [NEW BUILD] Skriv full blocker-traceability för alla findings F-001–F-066 samt nya obligatoriska arbetsobjekt som saknas i gamla dokument.
- [ ] 0.4 [REMOVE/DEPRECATE] Förbjud seed-, stub-, simulator- och phasebucket-antaganden som live coverage.
- [ ] 0.5 [NEW BUILD] Lås in saknade men obligatoriska kapabiliteter: bank-grade security, 1-klick migration/import, SIE4 import/export, aktieutdelning/owner distributions, corporate tax/tax declaration pack.
- [ ] 0.6 [OPERATIONALIZE] Sätt absoluta no-go-regler för live, parity och advantage.

**Exit gate**  
- Båda finaldokumenten finns och är ensamt bindande.
- Historiska statusmarkeringar är uttryckligen icke-bindande.
- Alla 66 blockers och nya obligatoriska byggposter har en fasplats.

**Test gate**  
- Spårbarhetsmatris komplett och versionslåst i repo.

**Security gate**  
- Inga production-secrets eller live-providerflöden får slås på före fas 3 och 6.

**Audit/replay/runtime gate**  
- Beslutslogg för supersession och no-go-regler finns som evidence-bundle.

**Migration/cutover gate**  
- Ingen kundmigration eller trial-promotion före fas 16.

**Blockerar nästa steg**  
- Fas 1 får inte starta utan styrningsreset.

**Blockerar go-live**  
- All gammal styrningskonflikt blockerar go-live.

**Blockerar competitor parity**  
- Fel scope blockerar parity eftersom fel saker byggs först.

**Blockerar competitor advantage**  
- Winning moves går inte att operationalisera utan gemensam styrning.

## Fas 1 — Canonical value kernel, objektsemantik och runtime-ärlighet

**Mål**  
Skapa en enda sanning för pengar, procentsatser, kvantiteter, valutakurser, kloning, normalisering och identitets-/formatvalidering innan någon regulatorisk kedja får byggas vidare.

**Varför fasen behövs**  
Repoet använder inkompatibla `roundMoney`, `normalizeMoney`, `copy` och `clone` över domäner. Så länge värdekärnan inte är enhetlig kommer varje senare domänbygge att reproducera fel matematik och fel serialisering.

**Beroenden**  
0

**Får köras parallellt med**  
Förberedande repo- och lint-arbete, värdeobjektstester, inventering av alla lokala helpers.

**Får inte köras parallellt med**  
Ingen ny ledger/postinglogik, ingen ny payroll/VAT/HUS-logik, ingen ny rapportlogik på gamla money-helpers.

**Delfaser**  
- [ ] 1.1 [REWRITE][HARDEN] Inför `packages/domain-core/src/value-kernel.mjs` med canonical `MoneyAmount`, `Rate`, `Quantity`, `FxRate`, `roundMoney`, `normalizeAmount`, `normalizePositiveAmount`, `normalizeSignedAmount`, `roundRate`, `roundQuantity`.
- [ ] 1.2 [REPLACE][REMOVE/DEPRECATE] Byt ut alla lokala `copy`/`clone`/`structuredClone`/`JSON.parse(JSON.stringify())` mot ett kontrollerat clone-API med definierad behandling av datum, `undefined`, `Map`, `Set`, binärdata och snapshots.
- [ ] 1.3 [REWRITE][MIGRATE] Externalisera BAS/DSAM-tabeller och kontometadata från hårdkodad källkod till versionerad datafil med checksumma, källa och importerbar validering.
- [ ] 1.4 [HARDEN] Gör runtime mode och provider capability truth explicit: inga simulatorer, demo-seeds eller `supportsLegalEffect=false`-adaptrar får maskeras som live.
- [ ] 1.5 [NEW BUILD] Inför central valideringskärna för organisationsnummer, personnummer/samordningsnummer, OCR-/betalningsreferenser, VAT-nummer-normalisering (`GR`/`EL`) och datum/tidszonnormalisering.

**Exit gate**  
- Ingen ekonomisk eller regulatorisk domän använder lokal money/clone-helper.
- BAS/DSAM-data kommer från versionsstyrd källa, inte hårdkodad tabellmassa.
- Valideringskärnan används av auth, AR/AP, VAT, HUS, payroll och migration.

**Test gate**  
- Gemensam golden-suite för money/rate/fx/clone/identifier-validering.
- Repo-sökning/lint blockerar nya lokala `roundMoney`/`normalizeMoney`/`copy`/`clone`.

**Security gate**  
- Valideringskärnan får inte logga fullständiga personnummer, bankuppgifter eller hemligheter.

**Audit/replay/runtime gate**  
- Alla replacement-migreringar loggas med före/efter checksumma och affected modules.

**Migration/cutover gate**  
- Värdekärnan måste vara klar före importdiffar, parallel run och SIE4-mappning.

**Blockerar nästa steg**  
- Fas 2 och 7–12 blockerar utan canonical value kernel.

**Blockerar go-live**  
- Olika pengamatematik blockerar go-live direkt.

**Blockerar competitor parity**  
- Ingen parity mot bokförings- och lönekonkurrenter utan enhetliga belopp.

**Blockerar competitor advantage**  
- Migration concierge och project profitability blir opålitliga utan värdekärna.

## Fas 2 — Durable persistence, transaktionsgränser, outbox, replay och recovery

**Mål**  
Göra varje muterande kommando atomärt, idempotent, versionssatt och återställbart över alla domäner, inte bara ett urval i `CRITICAL_DOMAIN_KEYS`.

**Varför fasen behövs**  
Nuvarande plattform muterar ofta först och sparar sedan. Stora delar av produkten saknar central durability. Det är inte driftbart för ekonomi, lön, HUS, support eller migration.

**Beroenden**  
1

**Får köras parallellt med**  
Repositoriebyggande i domänvågor, projection-rebuilds, worker-hardening.

**Får inte köras parallellt med**  
Ingen live pilot, ingen submissions-transport, ingen migrationscutover på nuvarande mutate-then-persist-väg.

**Delfaser**  
- [ ] 2.1 [REWRITE][MIGRATE] Lägg alla produktionsdomäner bakom riktiga repositories med versionsfält, optimistic concurrency och explicit durabilitypolicy. Inga memory-only affärsdomäner tillåts.
- [ ] 2.2 [REWRITE][HARDEN] Ersätt mutate-then-persist med `command_journal + aggregate_state + domain_events + outbox_messages + evidence_refs` i samma commit. `apps/api/src/platform.mjs` får inte gissa read/write via metodnamn.
- [ ] 2.3 [REWRITE] Gör snapshot import/export schema-aware, versionsstyrd och fail-fast. Snapshot är återställningsartefakt, inte primär sanning.
- [ ] 2.4 [HARDEN] Bygg worker-attempt-livscykel med claim, heartbeat, retry, dead-letter, replay och säker fail-markering även när attempt-starten kraschar.
- [ ] 2.5 [REPLACE] Gör Postgres-migrationslagret bindande för runtime istället för sidovagn. CHECK/FK/UNIQUE/index måste spegla domänregler och användas av applikationen.
- [ ] 2.6 [OPERATIONALIZE] Inför restore checkpoints, replay drills, projection rebuild-gates och commit-lag-övervakning.

**Exit gate**  
- Alla muterande endpoints går genom atomär commit-path.
- Alla produktionsdomäner har durabilitypolicy och restart-bevis.
- Worker, replay och dead-letter är bevisat återupptagbara.

**Test gate**  
- Idempotency-tests, optimistic-concurrency-tests, crash-after-commit/crash-before-commit-tests, snapshot-version-tests, worker-recovery-tests.

**Security gate**  
- Commit-path får inte serialisera S3/S4-data till vanlig snapshot/export.
- Outbox får inte bära hemligheter i klartext.

**Audit/replay/runtime gate**  
- Varje commit genererar audit envelope med command id, aggregate version och correlation id.

**Migration/cutover gate**  
- Cutover och rollback måste referera riktiga checkpoints från denna fas.

**Blockerar nästa steg**  
- Fas 3–18 blockerar utan denna fas.

**Blockerar go-live**  
- Split-brain och memory-only state blockerar go-live.

**Blockerar competitor parity**  
- Ingen parity utan restart-tålighet och korrekt replay.

**Blockerar competitor advantage**  
- Migration concierge och support cockpit kräver robust commit-logik.

## Fas 3 — Bank-grade security foundation och dataklassificering

**Mål**  
Flytta hela produkten från ad hoc-hemligheter och plaintext-risk till explicit dataklassificering, KMS/HSM-styrd kryptering, tokenisering, blind indexes, rate limiting och riskkontroller.

**Varför fasen behövs**  
TOTP-secrets ligger i klartext, login/TOTP saknar throttling, API-edge saknar basala skydd och vanliga snapshots kan bli läckkanal. Det duger inte för löne-, skatte- och bankdata.

**Beroenden**  
2

**Får köras parallellt med**  
KMS/vault-spår, riskmotor, edge-hardening, data-classification refactors.

**Får inte köras parallellt med**  
Ingen live auth, ingen live providercredential, ingen live support-write, ingen filing eller payout på osäkrad grund.

**Delfaser**  
- [ ] 3.1 [NEW BUILD][SECURE] Inför central data- och secretklassificering (`S0` offentlig metadata, `S1` intern drift, `S2` business confidential, `S3` regulated personal/finance, `S4` secrets/factors/credentials, `S5` non-exportable signing keys).
- [ ] 3.2 [NEW BUILD][SECURE] Inför KMS/HSM-baserad envelope encryption, separat secrets-lager, blind-index/HMAC för uppslag och full snapshot-redaction för S4/S5-data.
- [ ] 3.3 [SECURE][REWRITE] Kryptera eller tokenisera personnummer, bankkonton, löne-/skattepayloads, provider tokens och webhook secrets enligt klassmatrisen. Sessiontokens lagras bara som HMAC-hash. TOTP-hemligheter lagras endast krypterade via secret-ref.
- [ ] 3.4 [SECURE][HARDEN] Härda API edge: body size limit, request timeout, origin policy, security headers, signed webhooks, anti-replay, abuse throttling, cookie/CSRF-regler där cookies används.
- [ ] 3.5 [SECURE][NEW BUILD] Bygg rate limiting, lockout, anomaly detection och risk scoring för login, TOTP, passkey enrollment, BankID initiation, provider callback spikes, exportmassor, support access och break-glass.
- [ ] 3.6 [SECURE][OPERATIONALIZE] Inför nyckelrotation, credential rotation, certifikatrotation, emergency revoke och incident response som operativ standard.

**Exit gate**  
- Ingen hemlighet, faktorhemlighet, provider token eller signing secret ligger i vanlig durable state eller snapshot.
- KMS/HSM, rotation, blind indexes och edge controls är i drift.
- Riskmotor och lockout fungerar för auth och high-risk actions.

**Test gate**  
- Secret redaction tests, key rotation tests, rate-limit tests, anti-replay webhook tests, masked-log tests, incident-revoke tests.

**Security gate**  
- Detta är säkerhetsfasen; ingen efterföljande fas får använda undantag utan explicit risk waiver signerat av security owner.

**Audit/replay/runtime gate**  
- Alla secret reads, rotations, break-glass och high-risk action-denials auditloggas och kopplas till incident/evidence.

**Migration/cutover gate**  
- Migration får aldrig läsa eller skriva kundhemligheter i klartext; source-consent och provider credentials måste gå via secret-lagret.

**Blockerar nästa steg**  
- Fas 4, 6, 15, 16 och 17 blockerar utan denna fas.

**Blockerar go-live**  
- Bank-grade security är absolut go-live-blocker.

**Blockerar competitor parity**  
- Enterprise och bureau adoption blockeras utan detta.

**Blockerar competitor advantage**  
- Säker trial-to-live och secure concierge är differentiatorer.

## Fas 4 — Audit, evidence, observability, canonical contracts och permission resolution

**Mål**  
Standardisera alla envelopes, auditspår, evidence packs, permission boundaries och driftlarm så att systemet går att styra, granska och supporta utan handpåläggning.

**Varför fasen behövs**  
Nuvarande kod har blandade route-familjer, varierande felkontrakt och för grova basbehörigheter. Utan hårda kontrakt och evidens blir resten dyrt att driva och svårt att bevisa.

**Beroenden**  
3

**Får köras parallellt med**  
Route-dekomposition och permission-policy kan gå parallellt med audit/evidence-implementation.

**Får inte köras parallellt med**  
Ingen ny partner/public API på gamla felkontrakt. Ingen support-write utan permission boundary från denna fas.

**Delfaser**  
- [ ] 4.1 [HARDEN] Inför canonical command-, event-, error-, receipt- och audit-envelope över alla domäner och workerflöden.
- [ ] 4.2 [NEW BUILD] Bygg evidence-bundle-kedja för filings, support, cutover, owner distributions, payroll approvals och close/reopen.
- [ ] 4.3 [HARDEN] Inför invariant alarms, queue-age alarms, projection-lag, provider-health, risk alarms och restore-drill telemetry.
- [ ] 4.4 [REWRITE] Bryt upp phasebucket-routes till domain-driven routefamiljer och tvinga inputvalidering, body limits, typed error codes och idempotency keys.
- [ ] 4.5 [REWRITE][SECURE] Skriv om permissions från grova roller till action/resource-policys med separation of duties, review boundaries och masked projections.

**Exit gate**  
- Alla muterande calls använder canonical envelopes och idempotency keys.
- Evidence-bundle finns för alla regulatoriska och finansiella high-risk actions.
- Route space och permission enforcement är domänstyrt, inte fasstyrt.

**Test gate**  
- Contract tests för commands/errors, permission matrix tests, evidence-integrity tests, observability smoke tests.

**Security gate**  
- Permission policies och review boundaries måste vara server-side och revisionsbara.

**Audit/replay/runtime gate**  
- Varje high-risk action måste ha actor, session, trust-level, evidence refs och correlation id.

**Migration/cutover gate**  
- Migration- och supportgränssnitten måste följa samma envelope-regler som affärs-API:t.

**Blockerar nästa steg**  
- Fas 5–18 blockerar utan stabila contracts och policies.

**Blockerar go-live**  
- Utan audit/evidence/permissions går systemet inte att försvara i revision eller incident.

**Blockerar competitor parity**  
- Paritet kräver stabila API- och permissionkontrakt.

**Blockerar competitor advantage**  
- Unified cockpits och partner-API blir inte vinnande utan detta.

## Fas 5 — Rulepack-registry, regulatoriska baselines och provider-baselines

**Mål**  
Göra alla lagstyrda procentsatser, tabeller, trösklar, klassificeringar, basbelopp och provider-format versionerade, effective-dated, historiskt pinnade och rollbackbara.

**Varför fasen behövs**  
Regler ligger idag delvis hårdkodade i kod. Felaktig 2025-ROT och 2026-konstanter visar att governance måste vara förstaklassig, inte ett årligt kodgrep.

**Beroenden**  
4

**Får köras parallellt med**  
Rulepackbyggande kan gå parallellt med domänimplementation så länge kärnregistret är låst.

**Får inte köras parallellt med**  
Ingen live-regeländring direkt i domänkod. Ingen provider-formatuppdatering utan baseline-publicering.

**Delfaser**  
- [ ] 5.1 [NEW BUILD] Utöka rule-engine till regulatoriska rulepacks för BAS/DSAM, arbetsgivaravgifter, skattetabeller, SINK/A-SINK, växa-stöd, benefits, traktamente, HUS, VAT-klassificeringar, periodregler och legal-form obligations.
- [ ] 5.2 [HARDEN] Inför provider baseline registry för BankID, signing archive, Peppol, ISO20022, Skatteverket transports, Bolagsverket annual, SIE4-format och migration file families.
- [ ] 5.3 [OPERATIONALIZE] Bygg publiceringsprocess med källa, checksumma, effectiveFrom/effectiveTo, signoff, rollback och golden test vectors från officiella källor.
- [ ] 5.4 [HARDEN] Gör historisk pinning obligatorisk: alla beslut, deklarationer och beräkningar måste bära rulepack- och baseline-ref.
- [ ] 5.5 [SECURE] Emergency override av rulepack kräver dual review, reason code, time-boxing och återgångsplan.

**Exit gate**  
- Alla regulatoriska värden och providerformat kommer från signerade rulepacks/baselines.
- Domäner bär pinned refs till använd regelversion.
- Årlig/halvårsvis regulatorisk uppdatering är operativt definierad.

**Test gate**  
- Golden test vectors mot officiella källor, date-cutover tests, rollback tests, checksum validation.

**Security gate**  
- Rulepack publication kräver signerad ändringskedja och minst två godkännare för regulated packs.

**Audit/replay/runtime gate**  
- Varje regeländring är evidence-packad med källa, beslut och testresultat.

**Migration/cutover gate**  
- Historiska importer måste mappas till rätt historisk regelversion.

**Blockerar nästa steg**  
- Fas 7–12 blockerar utan denna fas.

**Blockerar go-live**  
- Regulatoriska procentsatser/tabeller utan governance blockerar go-live.

**Blockerar competitor parity**  
- Paritet mot svenska finans-/lönesystem kräver årlig regleringssäkerhet.

**Blockerar competitor advantage**  
- Deterministisk historisk pinning är en stark differentiator.

## Fas 6 — Identity trust, MFA, BankID, passkeys, tenant bootstrap och trial/live isolation

**Mål**  
Bygga riktig identitets- och sessionssanning med broker, MFA, BankID/passkeys, orgbootstrap, step-up, supportgränser och hård trial/live-isolering.

**Varför fasen behövs**  
Auth måste både vara säkert och driftbart. Nuvarande kod har bra riktning men behöver bank-grade storage, rate limits, session indexing, strict trial/live split och explicit org bootstrap.

**Beroenden**  
5

**Får köras parallellt med**  
Session trust, tenant bootstrap och support attestation kan byggas parallellt efter factor model är låst.

**Får inte köras parallellt med**  
Ingen filing, payout, payroll approval, period reopen eller support-write utan step-up och trust model.

**Delfaser**  
- [ ] 6.1 [REPLACE][SECURE] Auth broker blir enda väg för BankID/federation; lokala passkeys/TOTP lever som factor types med secret refs, inte rå state.
- [ ] 6.2 [NEW BUILD][SECURE] Inför `SessionRevision`, `ChallengeRecord`, device trust, fresh step-up och action-classade TTL:er; sessionuppslag indexeras på tokenhash.
- [ ] 6.3 [HARDEN] Tenant/company bootstrap validerar organisationsnummer, legal form, VAT-registrering, fiscal-year profile och finance readiness redan vid skapande.
- [ ] 6.4 [NEW BUILD][MIGRATE] Trial/live separeras i tenant, credentials, receipts, sequence space, evidence, provider refs, jobs, dashboards och KMS-nycklar; promotion är aldrig in-place.
- [ ] 6.5 [SECURE][HARDEN] Support impersonation, break-glass och access attestation kräver masked views, allowlists, incident id, two-person approval och vattenmärkt session.
- [ ] 6.6 [SECURE][OPERATIONALIZE] Login/TOTP/passkey/BankID riskkontroller, lockouts, anomaly rules och recovery-flöden körs live.

**Exit gate**  
- Auth-factorer och sessioner följer bank-grade storage-regler.
- Trial och live är tekniskt och kryptografiskt separerade.
- High-risk actions kräver fresh step-up och rätt trust class.

**Test gate**  
- BankID/passkey/TOTP factor tests, session-index tests, orgnr validation tests, trial/live isolation tests, impersonation approval tests.

**Security gate**  
- All auth- och supportlogik är säkerhetskritisk och måste bära full audit/evidence.

**Audit/replay/runtime gate**  
- All factor enrollment/removal, login-fel, step-up, impersonation och break-glass loggas som audit-critical.

**Migration/cutover gate**  
- Identitets- och tenantpromotion måste kunna köras utan att bära över sessions, secrets eller legal receipts.

**Blockerar nästa steg**  
- Fas 7–18 blockerar för alla live actions utan denna fas.

**Blockerar go-live**  
- Ingen bank-grade auth/trial-live split = inget go-live.

**Blockerar competitor parity**  
- Enterprise och byråkunder blockerar utan SSO/MFA/trust model.

**Blockerar competitor advantage**  
- Secure trial-to-live och operator-safe support kräver denna fas.

## Fas 7 — Finansiell grund: legal form, fiscal year, accounting method, ledgerkärna, close och SIE4

**Mål**  
Göra huvudboken, företagsformen, räkenskapsåret, bokföringsmetoden, close-processen och SIE4 till verkliga grunddomäner med rätt svenska regler och rätt transaktionsspår.

**Varför fasen behövs**  
Nuvarande repo saknar bland annat opening balance-motor, depreciation, accruals, VAT clearing, SIE4 och korrekt FX/numbering/description governance. Utan detta finns ingen hållbar redovisningskärna.

**Beroenden**  
6

**Får köras parallellt med**  
Legal form/fiscal year kan gå parallellt med ledger kernel och SIE4, men close är sist i fasen.

**Får inte köras parallellt med**  
Ingen AR/AP/payroll/HUS- eller annual-automation på fel ledgerkärna.

**Delfaser**  
- [ ] 7.1 [HARDEN] Legal form och fiscal year profiles blir förstaklassiga obligationsmotorer; kalenderårskrav, deklarationsprofiler och close-krav styrs därifrån.
- [ ] 7.2 [REWRITE][SECURE] Ledger posting kernel skrivs om för nummer-vid-postning, obligatorisk beskrivning, verifikationsserier, dual control för manuella poster och soft-lock override, samt canonical posting intents.
- [ ] 7.3 [REWRITE][MIGRATE] BAS/DSAM chart externaliseras, accountClass rättas, fallback-konton verifieras och kontoplanen versioneras/testas mot källtabell.
- [ ] 7.4 [REWRITE] Utländsk valuta bokförs alltid i redovisningsvaluta (SEK eller explicit europrofil), med originalvaluta som metadata och separat revaluation/realized FX-motor.
- [ ] 7.5 [NEW BUILD] Opening balances, retained earnings transfer, accounting-method catch-up, fiscal-year open/close och resultatoverföring blir riktiga posting-flöden.
- [ ] 7.6 [NEW BUILD] Bygg depreciation, accrual/prepaid engine, VAT clearing 2610–2640 -> 2650 och `packages/domain-sie/src/index.mjs` för SIE4 import/export.
- [ ] 7.7 [HARDEN] Close/reopen/hard-close kräver rätt actor attribution, evidence och signoff chain.

**Exit gate**  
- Ledgern har korrekt chart, nummerpolicy, FX-policy och closepolicy.
- Opening balances, catch-up, VAT clearing, depreciation, accruals och SIE4 finns som riktiga motorer.
- Legal form/fiscal year/accounting method styr downstream-domäner.

**Test gate**  
- BAS accountClass tests, voucher numbering tests, description-required tests, FX SEK tests, opening-balance tests, retained-earnings tests, depreciation/accrual tests, SIE4 roundtrip tests.

**Security gate**  
- Manual journals, period reopen och close approvals kräver SoD och fresh step-up.

**Audit/replay/runtime gate**  
- Varje posting intent, close action, reopen, VAT clearing och SIE export ger evidence bundle.

**Migration/cutover gate**  
- SIE4 och opening balances är obligatoriska migrations- och revisorsgränssnitt.

**Blockerar nästa steg**  
- Fas 8–14 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen riktig ledgerkärna = inget go-live.

**Blockerar competitor parity**  
- SIE4, opening balance och close är minimiparitet mot svenska ekonomisystem.

**Blockerar competitor advantage**  
- Snabb migration, auditability och project profitability kräver stabil ledgergrund.

## Fas 8 — AR, AP, VAT, banking och tax account som sammanhängande financial truth

**Mål**  
Göra kundreskontra, leverantörsreskontra, moms, bankhändelser och skattekonto till en enda sammanhängande sanningskedja med riktiga `VatDecision`-objekt och ledgerbryggor.

**Varför fasen behövs**  
Nuvarande repo bokför delar av AR/AP men bygger inte deklarationssanning konsekvent. Banking och tax account saknar full ledger-spegel. VAT undantag och VIES saknas eller är tunna.

**Beroenden**  
7

**Får köras parallellt med**  
AR/AP kan utvecklas parallellt efter VAT truth model är låst; banking/tax account kan gå parallellt efter ledger bridge-pattern är klar.

**Får inte köras parallellt med**  
Ingen live fakturering, leverantörsbetalning, VAT filing eller bankautomation före full source-of-truth-kedja.

**Delfaser**  
- [ ] 8.1 [REWRITE] AR state machine härdas: draft->issued->partially_paid->paid->credited->written_off, med riktiga invoice requirements, advance payments, credit notes, bad debt VAT, OCR-kontroll och dröjsmålsränta enligt referensränta + 8.
- [ ] 8.2 [REWRITE] AP state machine härdas: domestic VAT går genom riktig `VatDecision`, F-skatt/A-skatt-konsekvenser modelleras, credits och payment blocks/release blir explicita.
- [ ] 8.3 [REWRITE][HARDEN] VAT truth model gör `VatDecision` obligatoriskt för alla VAT-affecting events; `GR`/`EL`, VIES, reverse charge-undantag, OSS, import VAT, pro rata och blocked deductions implementeras i scenariomotorn.
- [ ] 8.4 [NEW BUILD] Banking får statement/event core för avgifter, räntor, settlements och matchning, inte bara AP-disbursement rail.
- [ ] 8.5 [REWRITE] Tax account får komplett eventklassificering, offset-regler, ledger-spegel och discrepancy workbench.
- [ ] 8.6 [HARDEN] Accounting method blir verkställande policy över AR/AP/VAT/ledger i stället för separat annotering.

**Exit gate**  
- AR/AP/VAT/banking/tax account producerar samma ekonomiska och deklarativa sanning.
- Alla momsrelevanta händelser skapar `VatDecision` och rätt ledger-spår.
- Skattekonto och bankhändelser går att avstämma mot huvudbok.

**Test gate**  
- AR/AP/VAT E2E, VIES tests, GR/EL tests, prepayment VAT tests, bad-debt VAT tests, tax-account ledger tests, banking statement reconciliation tests.

**Security gate**  
- Payment initiation, write-off, tax-account manual adjustment och VAT override kräver dual review där policy säger så.

**Audit/replay/runtime gate**  
- Invoice issue, AP approval, VAT decision, tax-account offsets och bank settlement receipts är audit-critical.

**Migration/cutover gate**  
- Open items, VAT history, OCR refs, bank mappings och tax-account history måste kunna importeras och diffas.

**Blockerar nästa steg**  
- Fas 9–16 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen finansiell source-of-truth-kedja = inget go-live.

**Blockerar competitor parity**  
- AR/AP/VAT/bank/tax account är kärnparitet.

**Blockerar competitor advantage**  
- Tax account cockpit och guided migration kräver denna fas.

## Fas 9 — Documents, OCR, klassificering, import cases och review center

**Mål**  
Göra dokumentkedjan till ett säkert, evidence-bundet underlag för AP, travel, benefits, payroll, importmoms och support — utan att dokument blir felaktig affärssanning.

**Varför fasen behövs**  
Dokumentflöden måste vara pålitliga men får inte ersätta source-of-truth-domänerna. OCR, klassificering och review måste styra rätt domän med rätt blocker codes.

**Beroenden**  
8

**Får köras parallellt med**  
OCR/classification och review center kan byggas parallellt efter document chain är låst.

**Får inte köras parallellt med**  
Ingen automatisk downstream-posting från OCR utan klassificering, confidence och review boundary.

**Delfaser**  
- [ ] 9.1 [HARDEN] Originaldokument, versioner, checksummor, retentionklasser och evidence refs blir oföränderliga grundobjekt.
- [ ] 9.2 [HARDEN] OCR/extraction materialiserar canonical extraction projections med confidence, field lineage, attachment refs och payload hash.
- [ ] 9.3 [REWRITE] Document classification styr målobjekt, downstream domain, blocker codes och review boundary; person-/lönekänsligt innehåll får aldrig gå till sökindex i klartext.
- [ ] 9.4 [NEW BUILD] Import cases och correction requests blir eget styrt flöde för tull/importmoms, saknade underlag och replacement chains.
- [ ] 9.5 [HARDEN] Review center blir enda vägen för manuella undantag, inte spridda domänlokala flaggor.

**Exit gate**  
- Alla dokument har versionkedja, checksumma och retentionclass.
- OCR/klassificering producerar explicita candidates och blocker codes.
- Review center styr alla mänskliga undantag.

**Test gate**  
- Document version tests, OCR projection tests, classification routing tests, masked-search tests, import-case correction tests.

**Security gate**  
- Känsliga dokument och extraherad text följer dataklassificeringsmatrisen; endast maskade projektioner får indexeras.

**Audit/replay/runtime gate**  
- Alla classification overrides, review decisions och correction requests får audit/evidence.

**Migration/cutover gate**  
- Historiska dokument kan importeras, fingerprintsättas och länkas utan att bli legal source-of-truth av sig själva.

**Blockerar nästa steg**  
- Payroll, importmoms och support automation blockerar utan denna fas.

**Blockerar go-live**  
- Dokumentunderlag utan kontrollkedja blockerar go-live i AP/payroll/import.

**Blockerar competitor parity**  
- Automatisering utan review discipline ger sämre än konkurrenter.

**Blockerar competitor advantage**  
- Bättre document-to-decision chain är en differentiator mot enklare system.

## Fas 10 — HR, time, balances, collective agreements och migration intake

**Mål**  
Skapa en ren personalsanning med överlappskontroller, approved time/absence sets, semesterbalanser och körbar kollektivavtalsoverlay som payroll kan lita på.

**Varför fasen behövs**  
Payroll kan inte bli rätt om HR, time, balances och avtal bara är frikopplade eller halvmanuella. Migration av person- och YTD-data måste också börja här.

**Beroenden**  
9

**Får köras parallellt med**  
HR/time och balances/agreements kan gå parallellt efter source-of-truth-regler är låsta.

**Får inte köras parallellt med**  
Ingen live payroll eller project cost allocation före approved employment/time/agreement truth.

**Delfaser**  
- [ ] 10.1 [REWRITE] HR blockerar överlappande anställningar, kontrakt, placeringar och samtidiga aktiva scopes där de inte uttryckligen stöds.
- [ ] 10.2 [HARDEN] Time/absence/flex/overtime levererar `ApprovedTimeSet` och `AbsenceDecision` med låst payroll input per period.
- [ ] 10.3 [REWRITE] Balances engine blir källa för semesterdagar, carry-forward, expiry och semesterårsgränser.
- [ ] 10.4 [REWRITE] Collective agreements levererar körbara rates, OB-, jour-, beredskaps- och pension/semesterpåslag som payroll faktiskt konsumerar.
- [ ] 10.5 [NEW BUILD][MIGRATE] Migration intake definierar canonical employee master, employment history, YTD, absence, benefits, travel, pension and agreement snapshots.

**Exit gate**  
- En anställd har en entydig aktiv employment truth.
- Payroll-input kommer från approved sets och körbara agreement overlays.
- Historikimport för personal och YTD är definierad och testad.

**Test gate**  
- Employment overlap tests, approved-time freeze tests, balance expiry tests, agreement-rate resolution tests, migration-intake mapping tests.

**Security gate**  
- HR/payrollnära persondata följer S3-klassning och masked support views.

**Audit/replay/runtime gate**  
- Ändringar i employment scope, approved time, absence and agreement resolution är audit-kritiska.

**Migration/cutover gate**  
- YTD, employment history och agreement mappings måste diffas innan första live pay run.

**Blockerar nästa steg**  
- Fas 11 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen korrekt HR/time/agreement truth = ingen korrekt lön.

**Blockerar competitor parity**  
- Löneparitet kräver denna fas.

**Blockerar competitor advantage**  
- Automatisk kollektivavtalsdriven payroll och migration ger fördel.

## Fas 11 — Payroll, AGI, benefits, travel, pension och garnishment

**Mål**  
Bygga en verklig svensk payrollmotor med skattetabeller, SINK/A-SINK, sjuklön, karens, semester, AGI, särskild löneskatt, växa-stöd, negative net pay och anställdfordran.

**Varför fasen behövs**  
Nuvarande payroll har viktiga kopplingar men saknar kärnlogik: skattetabeller, A-SINK, korrekt expense reimbursement, automatisk sjuklön/karens, riktig semesterlogik och employee receivable-hantering.

**Beroenden**  
10

**Får köras parallellt med**  
Tax table engine, employer contributions, travel/benefits classification och vacation engine kan utvecklas parallellt efter payroll input-contracts är låsta.

**Får inte köras parallellt med**  
Ingen live pay run, AGI submission eller pay batch före regulatorisk correctness är bevisad.

**Delfaser**  
- [ ] 11.1 [REWRITE] Bygg tax table engine med municipality/table/column, engångsskatt, jämkning, SINK, A-SINK och emergency manual fallback endast under dual review.
- [ ] 11.2 [REWRITE] Bygg employer contribution engine med full rate, 67+-regim, youth reduction, 1937-or-earlier no-contribution, special cases och växa-stöd som 2026 refund process mot skattekonto.
- [ ] 11.3 [REWRITE] Splitta utlägg, kostnadsersättningar, traktamente, milersättning, benefits och pension contributions korrekt före skatt/AGI mapping. Travel receipt VAT separeras från payroll reimbursement.
- [ ] 11.4 [NEW BUILD] Inför sjuklön dag 2–14, karensavdrag, semesterlön, semestertillägg, sparade dagar och semesterskuld inklusive arbetsgivaravgifter.
- [ ] 11.5 [NEW BUILD] Negative net pay ger `EmployeeReceivable`, repayment/offset plan och riktig ledger-posting; garnishment styrs av beslutssnapshot och prioritetsordning.
- [ ] 11.6 [HARDEN] AGI build chain inkluderar employer-level contribution totals, correction versions, evidence and submission readiness.
- [ ] 11.7 [HARDEN] Payroll konsumerar time, benefits, travel, pension och collective agreements automatiskt genom versionerade input snapshots och project dimensions.

**Exit gate**  
- Payroll använder officiella tabeller/rulepacks och rätt 2026-regler.
- Utlägg, sjuklön, semester, garnishment och negative net pay fungerar regulatoriskt.
- AGI kan byggas och rättas med full evidence chain.

**Test gate**  
- Official tax-table vectors, SINK/A-SINK vectors, employer contribution vectors, sick-pay tests, vacation-law tests, expense reimbursement tests, negative-net-pay tests, AGI correction tests.

**Security gate**  
- Payroll approvals, emergency manual tax, garnishment override och payout batch kräver step-up och dual review enligt policy.

**Audit/replay/runtime gate**  
- Varje pay run, correction, AGI version, garnishment decision and receivable settlement får evidence bundle.

**Migration/cutover gate**  
- Payroll history, YTD, benefits, leave balances och tax decisions måste kunna importeras och parallel-runas.

**Blockerar nästa steg**  
- Fas 12–18 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen svensk payroll correctness = inget go-live.

**Blockerar competitor parity**  
- Löneparitet blockerar utan denna fas.

**Blockerar competitor advantage**  
- Automatisk negative net pay chain, växa refund och agreement-driven payroll är differentiatorer.

## Fas 12 — HUS, regulated submissions, annual reporting, corporate tax och owner distributions

**Mål**  
Slutföra alla reglerade flöden: HUS/ROT/RUT, AGI/VAT/HUS/annual submissions, årsredovisning, tax declaration och aktieutdelning/owner distributions med full ledger- och evidencekedja.

**Varför fasen behövs**  
Nuvarande repo saknar HUS-ledgerbridge, rätt signatory chain, corporate-tax-pack och owner-distribution domain. Det blockerar verkligt svenskt AB-go-live.

**Beroenden**  
11

**Får köras parallellt med**  
HUS och owner distributions kan byggas parallellt efter regulated submission core är låst; annual/tax declaration kan gå parallellt med HUS-ledgerbridge.

**Får inte köras parallellt med**  
Ingen live claim, ingen annual filing, ingen dividend payout före full receipts/evidence/signoff chain.

**Delfaser**  
- [ ] 12.1 [REWRITE] HUS truth model härdas: explicit `laborCostInclVatAmount`, buyer identity validation, rate windows, cap handling, `claim_ready` state och per-buyer allocation/evidence.
- [ ] 12.2 [NEW BUILD] HUS ledger and recovery chain: claim submission, acceptance, partial acceptance, payout, recovery och write-off får canonical posting intents och reconciliation.
- [ ] 12.3 [HARDEN] Regulated submissions engine blir gemensam transport- och receiptmotor för AGI, VAT, HUS, annual och kommande declarations, med retries, dead letters, corrections och submission evidence.
- [ ] 12.4 [REWRITE] Annual reporting och tax declaration pack kräver locked report snapshots, closing journals, K2/K3 profile, corporate tax computation, full signatory chain, SRU/iXBRL/official transport baselines.
- [ ] 12.5 [NEW BUILD] Bygg `packages/domain-owner-distributions/src/index.mjs` för aktieutdelning/owner distributions, shareholder register snapshots, free-equity checks, board/stämma approvals, dividend liability, payout chain, KU31 and kupongskatt support.

**Exit gate**  
- HUS har full claim-to-ledger-to-recovery chain.
- Annual reporting och tax declaration är verkliga regulated flows, inte bara packages.
- AB kan fatta, bokföra, betala och rapportera utdelning med full evidence chain.

**Test gate**  
- HUS acceptance/recovery tests, submission retry/correction tests, annual signatory tests, corporate tax pack tests, owner distribution/KU31 tests, kupongskatt tests.

**Security gate**  
- Submission send, annual sign, dividend payout, kupongskatt withholding och HUS override kräver step-up och chained approvals.

**Audit/replay/runtime gate**  
- All regulated submission and owner distribution activity är audit-critical med immutable receipts.

**Migration/cutover gate**  
- HUS history, shareholder registers, annual packages och tax history måste kunna importeras eller blockeras explicit med signoff.

**Blockerar nästa steg**  
- Fas 13–18 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen HUS/annual/tax/declarations/dividend capability = inget komplett svenskt go-live.

**Blockerar competitor parity**  
- AB parity blockerar utan annual/tax/dividend stöd.

**Blockerar competitor advantage**  
- Unified submission cockpit och owner distributions ökar förtroende och coverage.

## Fas 13 — Generell project core, WIP, profitability, field och vertikala packs

**Mål**  
Bygga en generell projekt- och kommersiell kärna som fungerar för alla branscher, med WIP/revenue recognition och profitability, innan field/personalliggare/ID06-vertikaler tillåts dominera.

**Varför fasen behövs**  
Produkten är inte ett byggprogram. Projects måste vara generell och knuten till finance/payroll/travel/AP/AR/HUS för att bli marknadsvinnande.

**Beroenden**  
12

**Får köras parallellt med**  
General project core och profitability kan gå parallellt; vertikala packs startar först när coreobjekten är låsta.

**Får inte köras parallellt med**  
Ingen construction-first design, inga vertikala specialfall före general core och WIP-ledger.

**Delfaser**  
- [ ] 13.1 [REWRITE] Bygg generell project/commercial chain: opportunity -> quote -> agreement -> project -> delivery/work -> invoice/cost/profitability.
- [ ] 13.2 [NEW BUILD] Projects får riktiga WIP/revenue-recognition posting intents och ledger bridge.
- [ ] 13.3 [NEW BUILD] Bygg profitability mission control över AR/AP/payroll/travel/HUS/material/overhead med blockers och risker.
- [ ] 13.4 [HARDEN] Field/personalliggare/ID06 blir vertikala packs ovanpå project core och finance truth; inga egna ekonomiska sanningar tillåts.
- [ ] 13.5 [OPERATIONALIZE] Definiera vertikal-pack governance, enablement och deprecation-regler.

**Exit gate**  
- Project core är generell, inte construction-first.
- WIP och profitability når huvudbok och operativ workbench.
- Vertikala packs är underordnade core och kan slås av/på utan att bryta financial truth.

**Test gate**  
- Generic project chain tests, WIP ledger tests, profitability aggregation tests, field-pack isolation tests, personalliggare/ID06 compliance tests.

**Security gate**  
- Project data följer samma permission- och masked-support-regler som finans- och HR-data.

**Audit/replay/runtime gate**  
- WIP approvals, profitability waivers, field overrides och personalliggare corrections auditloggas.

**Migration/cutover gate**  
- Project/customer/time/import chains måste kunna migreras och diffas innan live adoption.

**Blockerar nästa steg**  
- Fas 14–18 blockerar utan denna fas för project-heavy kunder.

**Blockerar go-live**  
- General-project-kunder blockerar go-live utan denna fas.

**Blockerar competitor parity**  
- Parity mot Teamleader/monday/service ERP blockerar utan denna fas.

**Blockerar competitor advantage**  
- Cross-domain profitability mission control är en kärndifferentiator.

## Fas 14 — Reporting, search, notifications, activity och operativa workbenches

**Mål**  
Göra rapporter, sök, activity, notifications och cockpits till låsta, maskade, sammanhängande read-models för finance, payroll, migration och support.

**Varför fasen behövs**  
Rapporter får idag löpa på öppna perioder och egen avrundning. Cockpits måste byggas på locked truth, inte ad hoc-projektioner.

**Beroenden**  
13

**Får köras parallellt med**  
Search/activity/notifications kan gå parallellt med reporting locks och cockpitbygge.

**Får inte köras parallellt med**  
Ingen extern rapportdistribution eller enterprise dashboarding före locked-reporting semantics.

**Delfaser**  
- [ ] 14.1 [REWRITE] Reporting använder samma value kernel som ledger och respekterar periodlås, close state och preliminary vs locked mode.
- [ ] 14.2 [HARDEN] Search indexerar bara tillåten metadata/maskade projektioner; inga S3/S4-fält eller otillåtna dokumentutdrag.
- [ ] 14.3 [HARDEN] Activity och notifications blir domänmedvetna, permission-trimmade och korrelationskopplade till evidence och work items.
- [ ] 14.4 [NEW BUILD] Bygg tax account cockpit, unified submission cockpit, migration cockpit, payroll exception workbench och finance discrepancy views som förstaklass read models.

**Exit gate**  
- Rapporter är reproducerbara från locked truth.
- Search och notifications följer dataklassificering och permissions.
- Operativa cockpits finns för tax account, submissions, migration och payroll.

**Test gate**  
- Locked-reporting tests, masked-search tests, workbench permission tests, notification-correlation tests.

**Security gate**  
- Read models får aldrig exponera S4-data eller otillåtet PII i klartext.

**Audit/replay/runtime gate**  
- Rapportexporter, cockpit overrides och work item dispositions loggas.

**Migration/cutover gate**  
- Parallel run och cutover använder workbenches från denna fas som beslutsunderlag.

**Blockerar nästa steg**  
- Fas 15–18 blockerar utan denna fas.

**Blockerar go-live**  
- Operatorer kan inte driva systemet säkert utan workbenches.

**Blockerar competitor parity**  
- Parity kräver rapporter, sök och alerts som går att lita på.

**Blockerar competitor advantage**  
- Unified cockpits är en tydlig differentiator.

## Fas 15 — Integrationsplattform, public API, partner API, webhooks och verkliga adapters

**Mål**  
Göra integrationsplattformen till ett kontrollerat, säkert och kontraktstestat lager med riktiga adapters, capability manifests, signed webhooks och sandbox/prod-isolering.

**Varför fasen behövs**  
Repoet har många providerfiler men historiskt har simulatorer blandats med verkliga flows. Public/partner API och webhooks måste vara hårt kontrakterade för att vara säkra och supportbara.

**Beroenden**  
14

**Får köras parallellt med**  
Adapter-skelett och contract tests kan byggas parallellt efter control plane och envelopes är låsta.

**Får inte köras parallellt med**  
Ingen live-adapter utan grön domängate, contract tests och security posture.

**Delfaser**  
- [ ] 15.1 [HARDEN] Integrations control plane blir source of truth för connection profiles, secret refs, capability manifests, mode matrices och health.
- [ ] 15.2 [HARDEN] Public API och partner API får versionssatta kontrakt, idempotency, scoped permissions, signed callbacks och replay protection.
- [ ] 15.3 [REPLACE] Byt ut återstående simulerade adapters mot riktiga finance/auth/document/submission adapters där domängater tillåter; övriga markeras explicit non-live.
- [ ] 15.4 [SECURE] Webhook security: HMAC/detached signature, replay window, secret rotation, dead-letter, redelivery, signature metadata och masked logging.
- [ ] 15.5 [HARDEN] Trial-safe adapter layer: `trial_safe`, `sandbox_supported`, `supportsLegalEffect`, receipt mode, provider isolation.
- [ ] 15.6 [NEW BUILD] Prioriterad adapterordning för svenska migrations- och ekosystembehov: SIE4/CSV universellt, därefter Fortnox, Visma-familjen, Bokio, PE Accounting/Specter, därefter CRM/project och spend/bank/payments.

**Exit gate**  
- Integrationslagret har verklig control plane, contract tests och signerade webhooks.
- Live adapters är tydligt separerade från non-live/trial-safe adapters.
- Prioriterade svenska ekosystemadapters är byggda i rätt ordning.

**Test gate**  
- Provider contract tests, webhook signature/replay tests, capability manifest tests, mode-isolation tests, backpressure/dead-letter tests.

**Security gate**  
- Alla connections och provider secrets följer klassnings- och secret-lagerreglerna.

**Audit/replay/runtime gate**  
- Connection changes, webhook failures, provider callback anomalies och contract-test status auditloggas.

**Migration/cutover gate**  
- Migrationsadapters och live providers måste dela capability model men aldrig dela credentials mellan trial/live.

**Blockerar nästa steg**  
- Fas 16–18 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen live provider/integration governance = inget go-live.

**Blockerar competitor parity**  
- Paritet kräver verkliga bank-, Peppol-, auth- och migration adapters.

**Blockerar competitor advantage**  
- Bred men generisk adaptermodell driver marknadsvinst.

## Fas 16 — One-click migration/import engine, bureau mode, cutover, parallel run och rollback

**Mål**  
Bygga den generella svenska migration-/onboardingmotor som gör det möjligt att starta ett byte med ett klick, upptäcka källsystem, mappa automatiskt, diffa, blockera, signera, köra parallel run, promota till live och rulla tillbaka med evidence.

**Varför fasen behövs**  
Detta är ett explicit marknadsvinnande krav. Nuvarande migration/cutover är för cockpit- och metadatafokuserad och inte tillräckligt generisk eller säker.

**Beroenden**  
15

**Får köras parallellt med**  
Discovery/adapters och canonical dataset mapping kan gå parallellt efter integrations control plane är låst.

**Får inte köras parallellt med**  
Ingen kundcutover utan checkpointad rollback-path och parallel run där policy kräver det.

**Delfaser**  
- [ ] 16.1 [NEW BUILD] Bygg source discovery, adapter model, auth/consent och capability detection för API, SIE4, CSV, filpaket och bureau handoff.
- [ ] 16.2 [NEW BUILD] Definiera canonical import datasets för masterdata, chart of accounts, customers/vendors, open items, balances, HR/payroll/YTD, projects/time, documents, tax account history och shareholder data.
- [ ] 16.3 [NEW BUILD] Bygg auto-mapping, confidence scoring, variance reports, blocker codes, manual overrides och signoff chain.
- [ ] 16.4 [REWRITE][MIGRATE] Import execution, evidence bundles, immutable checkpoints, restore points och rollback orchestration blir riktiga tekniska flöden, inte bara metadata.
- [ ] 16.5 [OPERATIONALIZE] Parallel run och guided cutover med freeze windows, final extract, diff thresholds, live promotion och post-cutover watch.
- [ ] 16.6 [NEW BUILD] Bureau portfolio mode: återanvändbara mapping templates, cohort dashboards, delegated approvals och multi-client cutover pipeline.

**Exit gate**  
- Källsystem kan upptäckas, mappas, diffas och importeras via samma generiska motor.
- Rollback och parallel run är tekniskt verkliga och övade.
- Bureau/team kan driva många migrationer utan Excel-krig.

**Test gate**  
- Discovery tests, adapter auth tests, auto-mapping confidence tests, variance report tests, rollback drills, parallel-run thresholds, live-promotion tests.

**Security gate**  
- Source-consents, provider creds, importfiler och cutover checkpoints följer secret- och evidence-regler.

**Audit/replay/runtime gate**  
- Varje extract, mapping waiver, signoff, cutoff och rollback måste skapa evidence bundle.

**Migration/cutover gate**  
- Denna fas är migrationsfasen; ingen bred live-adoption utan denna fas.

**Blockerar nästa steg**  
- Fas 17–18 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen riktig migration/cutover/rollback = inget brett go-live.

**Blockerar competitor parity**  
- Paritet mot svenska SME-konkurrenter kräver enkel migration.

**Blockerar competitor advantage**  
- 1-klick-start, guided cutover och bureau mode är huvud-differentiatorer.

## Fas 17 — Operations, support, backoffice, incidents, replay och runbook-drivna driftgränser

**Mål**  
Produktisera drift, support, backoffice, incidenter, masked troubleshooting, replay, dead letters och runbooks så att plattformen går att operera säkert efter go-live.

**Varför fasen behövs**  
Ett system som är korrekt men inte går att supporta med maskning, approvals och replay kommer ändå att misslyckas i verklig drift.

**Beroenden**  
16

**Får köras parallellt med**  
Support case/incident engine och replay/dead-letter ops kan gå parallellt efter workbenches finns.

**Får inte köras parallellt med**  
Ingen bred pilot eller GA utan runbooks, drills och operator acceptance.

**Delfaser**  
- [ ] 17.1 [HARDEN] Support cases, incidents, masked views och operator queues blir förstaklass-objekt med SLA, ownership och escalation.
- [ ] 17.2 [HARDEN] Replay, dead-letter, reconciliation reruns och correction orchestration körs via kontrollerade operations, inte manuella databasfixar.
- [ ] 17.3 [SECURE][HARDEN] Backoffice-write, break-glass, access attestations och support exports följer chained approvals, watermarks och full evidence.
- [ ] 17.4 [OPERATIONALIZE] Runbooks, restore drills, incident drills, secret rotation drills, cutover rehearsals och payroll/VAT/HUS/annual emergency procedures måste finnas och bevisas.
- [ ] 17.5 [HARDEN] Testmiljön, CI och release evidence blir hermetisk nog för att undvika miljöbundna falska gröna tester.

**Exit gate**  
- Support/backoffice kan driva produkten utan direkt DB-access.
- Replay/dead-letter och incidenter är verktygsstödda och auditerade.
- Runbooks och drills är gröna inom policyfönster.

**Test gate**  
- Masked support tests, replay tests, incident escalation tests, runbook smoke tests, hermetic CI tests.

**Security gate**  
- Support och break-glass följer bank-grade policy och full audit.

**Audit/replay/runtime gate**  
- Varje support-write, replay, export, break-glass och incident resolution är audit-critical.

**Migration/cutover gate**  
- Cutover watch och rollback watch är operativa delar av denna fas.

**Blockerar nästa steg**  
- Fas 18 blockerar utan denna fas.

**Blockerar go-live**  
- Ingen driftbar support- och incidentmodell = inget go-live.

**Blockerar competitor parity**  
- Enterprise parity kräver operatorstöd.

**Blockerar competitor advantage**  
- Operator-first backoffice är en tydlig vinnarfaktor.

## Fas 18 — Pilot, parity gate, advantage gate, UI-contract freeze och GA

**Mål**  
Bevisa backend i riktiga kundkedjor, köra pilot, stänga alla blockerare och först därefter låsa externa kontrakt för UI och bred go-live.

**Varför fasen behövs**  
UI får inte användas som bevis för att backend är färdig. Verkliga pilotkedjor, golden scenarios, parity/advantage-scorecards och kill-switch readiness måste finnas först.

**Beroenden**  
17

**Får köras parallellt med**  
Pilotförberedelser, scorecards och UI-contract documentation kan gå parallellt; inga nya kärnfeatures får påbörjas här.

**Får inte köras parallellt med**  
Ingen bred GA medan blockerare finns kvar eller medan pilotcohorts saknar gröna evidence bundles.

**Delfaser**  
- [ ] 18.1 [OPERATIONALIZE] Kör pilotcohorts med verkliga finance/payroll/HUS/annual/migration-scenarier och explicit rollbackberedskap.
- [ ] 18.2 [HARDEN] Zero-blocker gate: alla CRITICAL och HIGH från blockerfilen måste vara stängda, och inga nya oklassade driftfynd får finnas.
- [ ] 18.3 [OPERATIONALIZE] Competitor parity gate: bokföring, moms, lön, AGI, HUS, bank, migration, annual, SIE4 och operatorstöd måste matcha marknadens miniminivå.
- [ ] 18.4 [OPERATIONALIZE] Competitor advantage gate: migration concierge, unified submission cockpit, tax account cockpit, safe trial-to-live, project profitability mission control och bureau mode måste vara säljbara i verkligheten.
- [ ] 18.5 [HARDEN] Freeze backend contracts för UI-konsumenter; UI får börja/fortsätta först efter att backendkontrakten är bevisade.
- [ ] 18.6 [OPERATIONALIZE] GA readiness, kill switches, rollback paths, on-call och legal signoff innan bred go-live.

**Exit gate**  
- Pilotcohorts är gröna med evidence.
- Alla blockerande findings är stängda eller explicit accepterade enligt policy (inga CRITICAL/HIGH).
- Parity och advantage scorecards är uppnådda.
- GA runbooks, kill switches och on-call är aktiverade.

**Test gate**  
- Full golden-scenario suite, pilot evidence review, parity scorecards, load/recovery tests, final security review.

**Security gate**  
- Final security review måste vara grön utan öppna bank-grade blockerare.

**Audit/replay/runtime gate**  
- GA-beslutet måste ha signerat evidence bundle med referens till alla gating artifacts.

**Migration/cutover gate**  
- Minst en verklig migration och en rollback rehearsal måste vara gröna före bred GA.

**Blockerar nästa steg**  
- Ingen nästa fas; detta är GA-gate.

**Blockerar go-live**  
- Detta är go-live-fasen; ej passerad = inget go-live.

**Blockerar competitor parity**  
- Paritetsgaten ligger här.

**Blockerar competitor advantage**  
- Advantage-gaten ligger här.


## Appendix A — Full traceability från `GO_LIVE_BLOCKERS_AND_FIXES.md`

| Finding | Kort titel | Bindande delfas(er) |
| --- | --- | --- |
| F-001 | Fyra olika `roundMoney`-familjer ger olika pengar i olika domäner | 1.1 |
| F-002 | `normalizeMoney` betyder olika saker i olika domäner | 1.1 |
| F-003 | DSAM-kontoplanen har systematiskt felklassade BAS-klasser | 7.3 |
| F-004 | AR utfärdar fakturor utan att skapa spårbara `VatDecision`-objekt | 8.1, 8.3 |
| F-005 | Inhemsk AP-VAT beräknas som förslag men skapar ingen persisted VAT-sanning | 8.2, 8.3 |
| F-006 | Payroll saknar skattetabellsmotor och A-SINK; ordinary tax är fortfarande manuell procentsats | 11.1 |
| F-007 | `EXPENSE_REIMBURSEMENT` behandlas som skattepliktig bruttolön och avgiftsunderlag | 11.3 |
| F-008 | HUS-domänen saknar helt ledgerbrygga för claim, acceptance, partial acceptance och recovery | 12.2 |
| F-009 | HUS-rulepacket för 2025 har fel ROT-sats från årets början | 5.1, 12.1 |
| F-010 | HUS använder `laborCostAmount` direkt utan att definiera om beloppet är inklusive eller exklusive moms | 12.1 |
| F-011 | Ledger lagrar utländsk valuta men bokför inte om till SEK | 7.4 |
| F-012 | Endast 13 domäner ligger bakom API:ets kritiska durable-persistence-wrapper | 2.1 |
| F-013 | Persistence-proxyn muterar först och persisterar sedan; misslyckad save lämnar systemet split-brain | 2.2 |
| F-014 | Generisk cutover-rollback är bara metadata, inte faktisk dataåterställning | 16.4, 16.5 |
| F-015 | TOTP-hemligheter exporteras durably i klartext | 3.2, 6.1 |
| F-016 | Login och TOTP saknar rate limiting och lockout | 3.4, 6.6 |
| F-017 | Årsredovisningssignering godkänner "någon tillåten roll" i stället för full signatory chain | 12.4 |
| F-018 | Kontantmetodens year-end catch-up summerar bara poster och bokför inget | 7.5 |
| F-019 | SIE-export saknas helt | 7.6, 16.2 |
| F-020 | Payroll klipper negativ nettolön till noll i postings utan motfordran på anställd | 11.5 |
| F-021 | Manuella verifikationer och soft-lock override saknar verklig dual control | 4.5, 7.2 |
| F-022 | Verifikationsnummer förbrukas före postning och verifikationstext är frivillig | 7.2 |
| F-023 | Öppningsbalans och resultatöverföring saknar faktisk motor | 7.5 |
| F-024 | Avskrivningsmotor saknas trots dokumenterad design och source types | 7.6 |
| F-025 | Periodiseringsmotor saknas trots att domänen låtsas stödja den | 7.6 |
| F-026 | Momsavstämning/nollställning av 2610–2640 mot 2650 saknas | 7.6, 8.3 |
| F-027 | VAT-domänen klassar Grekland fel när indata använder `GR` | 1.5, 8.3 |
| F-028 | VAT-scenariomotorn ignorerar viktiga undantag och gör ingen VIES-validering | 8.3, 15.3 |
| F-029 | Skattekontot har felklassificerad `REFUND` och omappad `MANUAL_ADJUSTMENT` | 8.5 |
| F-030 | AGI-summeringen saknar arbetsgivarsidans avgiftsbelopp på aggregatnivå | 11.6, 12.3 |
| F-031 | Sjuklön och karens finns som lönearter men inte som automatisk svensk beräkning | 10.2, 11.4 |
| F-032 | Semesterberäkning och semesterskuld följer inte Semesterlagen | 10.3, 11.4 |
| F-033 | AP saknar logik för F-skatt/A-skatt-konsekvenser vid ersättning för arbete | 8.2 |
| F-034 | AR:s fakturakravskontroll saknar säljaruppgifter som lagen kräver | 8.1 |
| F-035 | Annual reporting kräver hard close men skapar inga bokslutsverifikationer och saknar K2/K3-logik | 7.7, 12.4 |
| F-036 | Reporting genererar snapshots över öppna perioder utan enforcement och rundar löpande | 14.1 |
| F-037 | Payroll hämtar kollektivavtalsoverlay men använder det inte för OB/Jour/Beredskap/Övertid | 10.4, 11.7 |
| F-038 | Organisationsnummer valideras inte med kontrollsiffra | 1.5, 6.3 |
| F-039 | API-gatewayn saknar body-storleksgräns och exponerar råa felmeddelanden | 3.4, 4.4 |
| F-040 | API-svar saknar centrala HTTP-säkerhetshuvuden | 3.4 |
| F-041 | Worker kan lämna jobb i claimed/okänt tillstånd vid tidigt fel | 2.4, 17.2 |
| F-042 | Payroll använder konto 1930 som default fast kontot inte finns i ledgerns DSAM | 7.3, 11.6 |
| F-043 | A‑SINK saknas helt i payroll trots att regelverket finns 2026 | 11.1 |
| F-044 | Växa-stöd är inte modellerat som 2026 års verkliga återbetalningsflöde | 11.2, 8.5 |
| F-045 | `copy`/`clone` är duplicerat och semantiskt inkonsekvent i många domäner | 1.2 |
| F-046 | `roundMoney` i AP, field och document-engine kan ge NaN på `undefined` | 1.1, 1.2 |
| F-047 | HR tillåter överlappande anställningar | 10.1 |
| F-048 | HUS validerar bara längd på personnummer, inte checksumma eller datum | 1.5, 12.1 |
| F-049 | Snapshot-import tappar nya nycklar som inte redan finns i target state | 2.3 |
| F-050 | Travel-utlägg saknar momshantering på kvittonivå | 8.3, 11.3 |
| F-051 | Travel har svag tidszonshantering för traktamente och resdagar | 11.3 |
| F-052 | Banking bokar AP-disbursements via AP, men generella bankhändelser saknar ledgerbrygga | 8.4 |
| F-053 | Tax account saknar faktisk ledger-spegel | 8.5 |
| F-054 | Projects räknar WIP men bokför det inte | 13.2 |
| F-055 | `issueInvoice` har en svag state machine och litar på `journalEntryId` som spärr | 8.1 |
| F-056 | AP:s inhemska VAT-path strider mot systemets egen compliance-modell även när beloppen blir "rimliga" | 8.2, 8.3 |
| F-057 | Testsviten är inte hermetisk och delar är direkt miljöbundna | 17.5, 18.2 |
| F-058 | Flera 2026-värden är hårdkodade i benefits och travel och kräver årlig governance | 5.1, 5.3 |
| F-059 | Accounting-method-dokumentet beskriver en central timing-sanning som inte används konsekvent av AR/AP/VAT/ledger | 7.5, 8.6 |
| F-060 | Sessionslagning sker linjärt över alla sessioner | 6.2, 6.6 |
| F-061 | Behörighetsmodellen är grov i baslagret även om route-tester mildrar det | 4.5, 17.3 |
| F-062 | `hardCloseChecklist` attribuerar ledger-lock till skaparen, inte till faktisk slutattestant | 7.7 |
| F-063 | Kontoplanen är hårdkodad i källkod i stället för externt versionerad | 1.3, 7.3 |
| F-064 | Kloningshjälpare är duplicerade över repoet och driver framtida driftfel | 1.2 |
| F-065 | Testerna missar de viktigaste regulatoriska end-to-end-kedjorna | 17.5, 18.2 |
| F-066 | Runtime-persistens använder namnheurstik för read-vs-write i stället för explicit semantik | 2.2, 4.3 |

## Appendix B — Nya obligatoriska byggposter som saknas eller är för svagt definierade i nuvarande roadmap/bible

| Nytt arbete | Måste byggas | Fas(er) | Varför |
| --- | --- | --- | --- |
| N-001 | Bank-grade security architecture med explicit krypterings-/hash-/tokeniseringsmatris och KMS/HSM-rotation. | 3.1–3.6 | Nuvarande docs är för abstrakta; inget av detta får lämnas till tolkning. |
| N-002 | `packages/domain-owner-distributions/src/index.mjs` för aktieutdelning, KU31 och kupongskatt. | 12.5 | Saknas i nuvarande roadmap och bible men krävs för verkligt AB-go-live. |
| N-003 | `packages/domain-sie/src/index.mjs` för SIE4 import/export. | 7.6, 16.2 | Nuvarande styrning täcker inte SIE4 som first-class domain. |
| N-004 | Corporate tax / Inkomstdeklaration 2-pack med current-tax computation, declarations och evidence. | 12.4 | Nuvarande docs nämner annual/declarations men är för tunna för implementation utan tolkning. |
| N-005 | Generell migration engine för API/SIE4/CSV/bureau handoff med discovery, mapping, diff, rollback och promotion. | 16.1–16.6 | Nuvarande migration är för cockpit-orienterad och inte tillräckligt generisk. |
| N-006 | Trial/live kryptografisk och operationell totalisolering samt icke-in-place promotion. | 6.4, 15.5, 16.5 | Måste vara svart på vitt för att undvika läckage mellan demo och live. |
| N-007 | Unified operational cockpits: tax account, submissions, migration, payroll exceptions, profitability. | 14.4 | Krävs för operator-first drift och market-winning story. |
| N-008 | Bureau portfolio mode med templates, cohort dashboards och delegated approvals. | 16.6, 17.1 | Krävs för byråer och multi-client onboarding i Sverige. |
| N-009 | Official value publication pipeline med golden vectors och rollback. | 5.3 | Behövs för årliga svenska regeluppdateringar. |
| N-010 | Canonical value kernel för Money/Rate/Quantity/Fx och clone-semantik. | 1.1–1.2 | Saknas som first-class building block i nuvarande styrning. |

## Appendix C — Competitor parity och competitor advantage som blockerar go-live

### Competitor parity blockerar om följande inte är grönt

- bokföring med korrekt BAS/DSAM, opening balance, close, SIE4 och FX i SEK
- AR/AP/VAT med `VatDecision`-sanning, bankhändelser, tax account mirror och VAT clearing
- svensk payroll med skattetabeller, SINK/A-SINK, sjuklön, semester, AGI och employee receivable
- HUS/ROT/RUT med claim ledger, recovery och receipts
- årsredovisning, tax declaration pack och owner distributions för AB
- one-click-start migration med SIE4/CSV/API-familjer och bureau mode
- bank-grade auth/MFA/BankID/passkeys, support masking och trial/live isolation
- operatorstöd: submission cockpit, tax account cockpit, migration cockpit, replay/dead-letter

### Competitor advantage blockerar om följande inte är byggt och sälj-/driftbart

- guided migration concierge med discovery, auto-mapping, variance reports, signoff och rollback evidence
- safe trial-to-live promotion utan läckage av credentials, receipts, provider refs eller sequence space
- unified submission cockpit för AGI/VAT/HUS/annual med receipts, retries, correction chain och discrepancy cases
- tax account cockpit med ledger mirror, offset suggestions och discrepancy blockers
- project profitability mission control över AR/AP/payroll/travel/HUS/material/overhead
- bureau portfolio mode med återanvändbara mapping templates, cohort dashboards och delegated approvals
- bank-grade support/backoffice med masked views, watermarked sessions och command-only writes

## Appendix D — Bindande source-system- och adapterordning

| Wave | Måste finnas | Varför |
| --- | --- | --- |
| Wave 1 | SIE4, CSV templates, Fortnox-liknande finance API, Visma-familjen, Bokio-liknande exports, BankID/auth broker, Peppol, bank statement/file rails, Skatteverket transports | Minsta svenska go-live + migration friction removal |
| Wave 2 | PE Accounting/Specter-liknande finance families, spend/bank vendors, CRM/project families (Teamleader, monday, HubSpot, Odoo, Zoho), bureau templates | Paritet och expansion efter kärngo-live |
| Wave 3 | Övriga bransch- eller enterprise-specifika adapters | Långsvans efter att kärnan är bevisad |

## Slutregel

Allt som krävs för go-live, competitor parity eller competitor advantage måste antingen finnas i en delfas ovan eller i appendixerna här.  
Om en kodförändring, modul eller migrering saknar plats i denna roadmap är den **inte** godkänd som bindande byggarbete.
