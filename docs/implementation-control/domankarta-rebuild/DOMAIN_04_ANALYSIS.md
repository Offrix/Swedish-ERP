# DOMAIN_04_ANALYSIS

Datum: 2026-04-02  
Domän: kundfakturering, kundreskontra, betalningsallokering, kundkrediter, refunds, dunning, aging, revenue/VAT-bryggor

## Scope

Granskningen har utgått från:

- prompt 4
- äldre `DOMAIN_04_ANALYSIS.md`
- äldre `DOMAIN_04_ROADMAP.md`
- äldre `DOMAIN_04_IMPLEMENTATION_LIBRARY.md`
- faktisk repo-runtime i `packages/domain-ar/`, `apps/api/src/`, `packages/domain-projects/`, `packages/domain-hus/`, `packages/domain-integrations/` och relevanta migrationer
- körda tester i `tests/unit/är-phase5-*`, `tests/integration/phase5-är-*` och `tests/e2e/phase5-är-*`
- officiella källor för fakturainnehåll, fakturatidpunkt, kundförlust, dröjsmålsränta, påminnelseavgift, förseningsersättning och referensränta

Verifierade repo-spår:

- `packages/domain-ar/src/index.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform.mjs`
- `apps/api/src/platform-method-intents.mjs`
- `packages/domain-projects/src/index.mjs`
- `packages/domain-hus/src/index.mjs`
- `packages/domain-integrations/src/providers/stripe-payment-links.mjs`
- `packages/db/migrations/20260321110000_phase5_ar_masterdata.sql`
- `packages/db/migrations/20260321120000_phase5_ar_invoicing_delivery.sql`
- `packages/db/migrations/20260321130000_phase5_ar_receivables_dunning_matching.sql`
- `packages/db/migrations/20260324210000_phase14_invoice_field_rules.sql`
- `packages/db/migrations/20260324220000_phase14_ar_quote_project_links.sql`

Körda tester i denna granskning:

- `node --test tests/unit/ar-phase5-1.test.mjs tests/unit/ar-phase5-2.test.mjs tests/unit/ar-phase5-3.test.mjs`
- `node --test tests/integration/phase5-ar-masterdata-api.test.mjs tests/integration/phase5-ar-invoicing-api.test.mjs tests/integration/phase5-ar-receivables-api.test.mjs`
- `node --test tests/e2e/phase5-ar-masterdata-flow.test.mjs tests/e2e/phase5-ar-invoicing-flow.test.mjs tests/e2e/phase5-ar-receivables-flow.test.mjs`

Klassning av domänen:

- total klassning: `partial reality`
- huvudproblem: repo:t har en verklig ÄR-motor för lyckliga vägar, men inte en komplett svensk reskontra- och kundfordringskärna
- go-live-status: blockerad

Officiella källor som användes:

- Skatteverket, `Momslagens regler om fakturering`, hämtad 2026-04-02
- Skatteverket, `Kundförluster – om kunden inte kan betala`, hämtad 2026-04-02
- Sveriges riksdag, `Räntelag (1975:635)`, särskilt 3 §, 4 §, 4 a §, 6 § och 9 §, hämtad 2026-04-02
- Sveriges riksdag, `Lag (1981:739) om ersättning för inkassokostnader m.m.`, särskilt 2 §, 3 §, 4 §, 4 a §, 5 § och 6 §, hämtad 2026-04-02
- Sveriges Riksbank, `Referensräntan`, hämtad 2026-04-02

## Verified Reality

- ÄR-rutter är verkligt kopplade i API runt `apps/api/src/server.mjs:724-757, 6962-8942`.
- ÄR-plattformen är verkligt registrerad i `apps/api/src/platform.mjs:357-370`.
- accepterad offertversion låses med hash och direktfakturering från driftad offertversion blockeras i `packages/domain-ar/src/index.mjs:5867-5885`.
- issue-idempotens finns i `packages/domain-ar/src/index.mjs:1283-1455`.
- open item skapas vid issue och delbetalning/allokering fungerar i grundscenarier i `packages/domain-ar/src/index.mjs:1429-1438, 1646-1904`.
- felallokering kan reverseras med audit trail i `packages/domain-ar/src/index.mjs:1917-2055`.
- cash-method-posting vid betalning finns och testas i `packages/domain-ar/src/index.mjs:1772-1864`.
- aging-snapshot byggs från open items och bär cutoff-data i `packages/domain-ar/src/index.mjs:2536-2556`.

## Partial Reality

- ÄR-tabellerna i Postgres ser first-class ut, men verklig runtime-sanning ligger fortfarande i snapshotad domänstate via `decorateCriticalDomainPersistence` i `apps/api/src/platform.mjs:1043-1047, 1680-1815`.
- invoice plans finns i schema men konsumeras inte som auktoritativ billing-sanning vid issue.
- project-billing och field-billing ser sammanhängande ut men är fortfarande readiness/simulation när de borde vara legal-effect billing triggers.
- HUS-fält valideras i ÄR men HUS-betalningar och HUS-krediter återkopplar inte säkert till ÄR open items eller kundkredit.
- payment links skapas på riktigt men saknar settlement-sanning och unikhetskontroller i runtime.
- dunning, reminder fee, dröjsmålsränta och aging finns men regelmodellen är fortfarande hårdkodad och ofullständig.

## Legacy

- snapshot-import/export som primär finansiell sanningsmekanism i ÄR är legacy och får bara överleva som migration/recovery-spår.
- äldre fas-5- och fas-14-dokument som beskriver ÄR som färdig relationsmodell är legacy och får inte längre tolkas som bindande sanningskälla.
- äldre runbooks för ÄR verifierar främst lyckliga vägar och är därför legacy som acceptansunderlag.

## Dead Code

- `lateCompensationAmount` skrivs men används inte i verklig charge-logik i `packages/domain-ar/src/index.mjs:2264-2266`.
- `reversal_of_writeoff_id` finns i schema men har ingen motsvarande runtimekedja i ÄR API eller domänmetoder. Se `packages/db/migrations/20260321130000_phase5_ar_receivables_dunning_matching.sql:421`.
- schemafälten `fee_customer_invoice_id` och `interest_customer_invoice_id` antyder separata charge-fakturor, men runtime skapar dem inte.

## Misleading / False Completeness

- `invoice.status = "delivered"` sätts redan när leverans bara har förberetts i `packages/domain-ar/src/index.mjs:1501-1529`.
- payment-link-schemat antyder full livscykel och settlement, men runtime lagrar bara skapad länkmetadata i `packages/domain-ar/src/index.mjs:1542-1582`.
- SQL-constraints antyder hård unikhetsstyrning för aktiva payment links, men runtime upprätthåller dem inte.
- HUS ser integrerat ut mot ÄR eftersom HUS läser ÄR-faktura, men HUS för egen kundreceivable-state bredvid ÄR i `packages/domain-hus/src/index.mjs:423-432`.
- receivables-runbook och integrationstest ger falsk completeness eftersom kritiska scenarier som refund, förskott före faktura och bad-debt recovery saknas.

## Customer Masterdata Findings

### D4-001
- severity: high
- kategori: customer masterdata / deduplicering
- exakt problem: runtime säkrar unikhet huvudsakligen via `customerNo` och valfritt `importSourceKey`, inte via normaliserat organisationsnummer eller VAT-nummer
- varför det är farligt: samma juridiska kund kan få flera kundposter med dubbla offerter, dubbla kreditgränser, fel påminnelsevillkor och dubbel- eller underfakturering
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `322-360, 5564-5708`
- rekommenderad riktning: inför canonical `customer_party_identity`, alias-register, merge-logg och blockerad hard delete
- status: rewrite

### D4-002
- severity: medium
- kategori: contact roles / delivery control
- exakt problem: kontaktroller är fri text i runtime och verifiering av faktureringskanal är för svag
- varför det är farligt: fel mottagare kan väljas vid delivery, payment link och dunning
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `396-447, 5722-5754`
- rekommenderad riktning: styrda enumroller, verifierad billing-kanal och separat blockerflagga för delivery och collections
- status: harden

## Quote / Contract / Billing Trigger Findings

### D4-003
- severity: high
- kategori: billing trigger / invoice plan
- exakt problem: fakturor kan skapas från manuella rader, kontraktsrader eller offertversion utan auktoritativ consumption record för billing obligation
- varför det är farligt: samma prestation kan faktureras två gånger eller inte alls
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1108-1128, 1195-1204`
- rekommenderad riktning: bygg `billing_obligation` och `billing_consumption` med residual kvantitet och residual belopp
- status: rewrite

### D4-004
- severity: high
- kategori: project / field / quote bridge
- exakt problem: projektdomänen producerar readiness och simulation men inte legal-effect billing truth
- varför det är farligt: quote→project→invoice-kedjan kan verka komplett trots att dubbel- och underfakturering inte blockeras deterministiskt
- exakt filpath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `2692-2731, 2874-2968`
- rekommenderad riktning: project/field måste producera auktoritativa billing obligations eller explicit spärras från issue-pathen
- status: rewrite

## Invoice Timing / Content / Delivery Evidence Findings

### D4-005
- severity: high
- kategori: fakturafält / legal vs policy
- exakt problem: `dueDate` behandlas som hårt obligatoriskt trots att Skatteverkets lista över obligatoriska fakturauppgifter inte generellt kräver förfallodatum
- varför det är farligt: lagkrav blandas ihop med affärspolicy och ger fel blockeringsgrunder
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1091-1093, 4804-4809`
- rekommenderad riktning: separera legal completeness från commercial completeness
- status: harden

### D4-006
- severity: high
- kategori: delivery evidence
- exakt problem: `deliverInvoice` sätter `delivered` efter `prepareInvoiceDelivery`, inte efter dispatch/receipt/provider acceptance
- varför det är farligt: reskontran, påminnelsekedjan och indrivningsbevis bygger på falsk leveranssanning
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1473-1539`
- rekommenderad riktning: bygg separat distributionslivscykel med `prepared`, `dispatched`, `provider_accepted`, `receipt_confirmed`, `failed`
- status: rewrite

## Invoice Series / Numbering Findings

### D4-007
- severity: high
- kategori: numbering / durability
- exakt problem: Postgres-schemat har bra unika index men runtime-reservering av fakturanummer ligger i snapshotad domänstate
- varför det är farligt: samtidighet, replay, recovery och imported history kan bryta revisionssäker nummerhantering
- exakt filpath: `packages/db/migrations/20260321120000_phase5_ar_invoicing_delivery.sql`
- radreferens om möjligt: `224-237`
- rekommenderad riktning: flytta nummerreservation till repository/sequence-lager i samma commit som issue/open-item/journal
- status: rewrite

## Invoice Lifecycle Findings

### D4-008
- severity: critical
- kategori: runtime truth / persistence
- exakt problem: ÄR-sanningen ligger i mutate-then-persist-snapshot istället för repository-grade persistens
- varför det är farligt: open items, credits, refunds, dunning och replay blir inte deterministiska eller revisionssäkra
- exakt filpath: `apps/api/src/platform.mjs`
- radreferens om möjligt: `1043-1047, 1680-1815`
- rekommenderad riktning: migrera ÄR till verkliga repositories med command journal, outbox och versionsstyrning
- status: migrate

### D4-009
- severity: critical
- kategori: lifecycle completeness
- exakt problem: ÄR saknar first-class kommandon för invoice reversal, cancellation-after-issue, refund, writeoff reversal och recovery efter konstaterad kundförlust
- varför det är farligt: verkliga fel kan inte korrigeras utan manuell kringgång eller databasingrepp
- exakt filpath: `apps/api/src/server.mjs`
- radreferens om möjligt: `724-757`
- rekommenderad riktning: bygg full state machine och separata kommandon för correction/reversal/refund/recovery
- status: rewrite

## Credit Note / Partial Credit / Reversal Findings

### D4-010
- severity: high
- kategori: credit note / paid invoice
- exakt problem: kreditnota får inte överstiga `originalInvoice.remainingAmount`
- varför det är farligt: försäljningskorrigering efter del- eller helbetalning kan inte skapa kundkredit eller refund exposure
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1143-1145`
- rekommenderad riktning: skilj kredit av försäljning från reglering av kundfordran
- status: rewrite

## Open Item / Allocation / Partial Payment Findings

### D4-011
- severity: critical
- kategori: prepayment / open item truth
- exakt problem: allocationtypen `prepayment` kräver redan existerande open item och kan därför inte modellera verkligt förskott före faktura
- varför det är farligt: förskott med egen momstidpunkt och egen reskontraeffekt kan inte representeras korrekt
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1646-1669, 3303-3315`
- rekommenderad riktning: inför `customer_prepayment` och `customer_credit_balance` som egna objekt
- status: rewrite

### D4-012
- severity: low
- kategori: allocation reversal
- exakt problem: ingen brist; allocation reversal har verklig auditkedja
- varför det är farligt: mönstret får inte tappas bort när refunds och writeoff reversals byggs
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1917-2055`
- rekommenderad riktning: behåll och generalisera
- status: keep

## Prepayment / Overpayment / Negative Balance / Refund Findings

### D4-013
- severity: critical
- kategori: overpayment / customer credit
- exakt problem: överbetalning mot känd kund blir `unmatchedBankReceipt` i stället för kundkredit eller negativt kundsaldo
- varför det är farligt: verklig skuld till kunden döljs som oklar bankmatchning
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1884-1902, 2147-2175`
- rekommenderad riktning: skapa first-class `customer_credit_balance` med `available`, `applied`, `refund_pending`, `refunded`
- status: rewrite

### D4-014
- severity: critical
- kategori: refund
- exakt problem: det finns ingen ÄR-route, ingen domänmetod och ingen testkedja för kundåterbetalning
- varför det är farligt: tillgodohavanden kan inte betalas ut, attesteras, bokföras och bankmatchas säkert
- exakt filpath: `apps/api/src/server.mjs`
- radreferens om möjligt: `724-757`
- rekommenderad riktning: bygg `refund_request`, `refund_approval`, `refund_execution`, `refund_reconciliation`
- status: replace

## Payment Link / Delivery Findings

### D4-015
- severity: high
- kategori: payment links / settlement truth
- exakt problem: payment links skapas men settlement/eventkedjan är inte den auktoritativa vägen till receivable-allokering
- varför det är farligt: payment-link-status kan tolkas som betalsanning utan verifierad receipt
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1542-1582`
- rekommenderad riktning: endast verifierade receipt-events får påverka invoice settlement
- status: rewrite

### D4-016
- severity: high
- kategori: payment link uniqueness
- exakt problem: runtime kontrollerar inte aktiv unik payment link per invoice trots att schema antyder det
- varför det är farligt: flera aktiva länkar eller dublettlänkar kan uppstå i runtime
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `1561-1572`
- rekommenderad riktning: flytta unikhetskontrollen till auktoritativ runtime/repository-transaktion
- status: harden

## Reminder Fee / Late Interest / Dunning / Aging Findings

### D4-017
- severity: critical
- kategori: dunning / interest / compensation
- exakt problem: dunning använder hårdkodad påminnelseavgift 60 kr, en enkel referensräntebaslinje och saknar full rulepack-modell för effective-dated ränta, avtalskrav och B2B-förseningsersättning 450 kr
- varför det är farligt: fel avgifter och fel ränta kan debiteras, särskilt vid halvårsskifte och B2B-scenarier
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `63-75, 2208-2322`
- rekommenderad riktning: bygg rulepack-styrd dunningmotor med effective-dated referensränta, avtalad fee-rätt och separat charge-record/open-item
- status: replace

### D4-018
- severity: medium
- kategori: runbooks / test completeness
- exakt problem: receivables-runbooks och vissa integrationstester överdriver verifieringsläget genom att fokusera på lyckliga vägar
- varför det är farligt: organisationen kan tro att ÄR är go-live-klar trots att refund, prepayment-before-invoice och bad-debt-recovery inte är testade
- exakt filpath: `tests/integration/phase5-ar-receivables-api.test.mjs`
- radreferens om möjligt: `11-35`
- rekommenderad riktning: skriv om test- och runbookgaterna kring verkliga blockerarscenarier
- status: rewrite

## Revenue / Ledger / VAT Bridge Findings

### D4-019
- severity: high
- kategori: ledger / VAT / account mapping
- exakt problem: domänkoden använder hårdkodade ÄR-konton och scenarioheuristik via VAT-kodsubstrings
- varför det är farligt: tenant-specifik kontoplan, BAS-varianter och särskilda scenarier kan inte styras säkert
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `63-75, 4929-4947, 5539-5561`
- rekommenderad riktning: extern account mapping-profil, explicit legal scenario code och regelpacksbaserad VAT-brygga
- status: replace

### D4-020
- severity: critical
- kategori: bad debt recovery / VAT
- exakt problem: bad-debt VAT relief finns, men senare betalning efter kundförlust kan inte återföra moms korrekt eftersom writeoff reversal/recovery saknas
- varför det är farligt: Skatteverkets krav på att åter lägga upp utgående moms vid senare betalning kan inte följas
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `3410-3435`
- rekommenderad riktning: bygg `recover_written_off_receivable` med VAT-recovery och ledgerdelta
- status: rewrite

## Project / Field / HUS Invoice Bridge Findings

### D4-021
- severity: high
- kategori: HUS / customer receivable bridge
- exakt problem: HUS har egna `customerPayments`, `customerReceivables` och `creditAdjustments` bredvid ÄR, utan säker ÄR-återkoppling
- varför det är farligt: kundandel, residualer och efterhandskrediter efter myndighetshändelse blir inte reskontrasanna
- exakt filpath: `packages/domain-hus/src/index.mjs`
- radreferens om möjligt: `423-432, 540-679, 1279`
- rekommenderad riktning: HUS måste skicka explicita ÄR-events för invoice gate, customer payment, credit adjustment, recovery och residual exposure
- status: rewrite

## Export / Receivable Evidence Findings

### D4-022
- severity: high
- kategori: export / audit evidence
- exakt problem: ÄR kan exportera snapshotad state och aging-snapshots men saknar first-class exports för open items, kundkrediter, refunds och tie-out mot ledger/VAT
- varför det är farligt: cutover, parallel run, revision och inkassoavstämning saknar hashad beviskedja per cutoff
- exakt filpath: `packages/domain-ar/src/index.mjs`
- radreferens om möjligt: `2536-2556, 2689-2718`
- rekommenderad riktning: bygg deterministiska ÄR-artifacts med cutoff-hash, included ids och ledger/VAT tie-out
- status: replace

## Concrete ÄR Verification Matrix

| capability | claimed billing/receivable rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Customer masterdata | kunden ska vara korrekt och deduplicerbar | `createCustomer`, `importCustomers` | `packages/domain-ar/src/index.mjs:322-360, 5564-5708`; `tests/unit/ar-phase5-1.test.mjs` | ingen extern källa krävs för intern dedupe-logik | partial reality | ja |
| Quote freeze | accepterad offert får inte drifta före fakturering | quote hash check före direktfaktura | `packages/domain-ar/src/index.mjs:5867-5885`; `tests/unit/ar-phase5-1.test.mjs:13-50` | ingen extern källa krävs | verified reality | nej |
| Invoice timing/content | fullständig faktura och rätt fakturatidpunkt | `createInvoice`, `issueInvoice`, field evaluation | `packages/domain-ar/src/index.mjs:1091-1093, 1283-1455, 4777-4888` | Skatteverket `Momslagens regler om fakturering` | partial reality | ja |
| Numbering | unikt löpnummer per faktura | snapshotad issue-path + SQL-index | `packages/domain-ar/src/index.mjs:1340-1368`; migration `20260321120000...:224-237` | Skatteverket `Momslagens regler om fakturering` | partial reality | ja |
| Delivery evidence | leveransstatus ska vara verklig | `prepareInvoiceDelivery` → `delivered` | `packages/domain-ar/src/index.mjs:1473-1539` | ingen specifik extern källa krävs | misleading | ja |
| Credit note | ändringsfaktura ska kunna korrigera originalfaktura | credit note kräver originalreferens men binds till `remainingAmount` | `packages/domain-ar/src/index.mjs:1080-1084, 1143-1145` | Skatteverket `Momslagens regler om fakturering` | partial reality | ja |
| Prepayment | förskott före faktura ska kunna modelleras | saknas som first-class objekt | `packages/domain-ar/src/index.mjs:1646-1669, 3303-3315` | Skatteverket `Momslagens regler om fakturering` | dead | ja |
| Overpayment/customer credit | överbetalning ska skapa kundkredit eller refund exposure | överskott blir unmatched receipt | `packages/domain-ar/src/index.mjs:1884-1902, 2147-2175` | ingen extern källa krävs för att konstatera intern reskontrasanning | partial reality | ja |
| Refund | tillgodohavande ska kunna återbetalas säkert | ingen runtimekedja finns | `apps/api/src/server.mjs:724-757` | ingen extern källa krävs | dead | ja |
| Dunning/interest | påminnelseavgift, ränta och 450-kronorsersättning ska följa lag och avtal | hårdkodad motor | `packages/domain-ar/src/index.mjs:63-75, 2208-2322` | Riksdagen `Räntelag (1975:635)`; Riksdagen `Lag (1981:739)`; Riksbanken `Referensräntan` | partial reality | ja |
| Bad debt VAT relief | kundförlust ska kunna redovisas och återföras vid senare betalning | relief finns, recovery saknas | `packages/domain-ar/src/index.mjs:3410-3435`; `tests/unit/ar-phase5-3.test.mjs` | Skatteverket `Kundförluster – om kunden inte kan betala` | partial reality | ja |
| Payment links | betalinitiering får inte bli betalningssanning | payment link lagras utan settlementkedja | `packages/domain-ar/src/index.mjs:1542-1582` | ingen extern källa krävs | partial reality | ja |
| HUS bridge | HUS-kundandel och krediter ska påverka ÄR korrekt | HUS bär egen receivable-state | `packages/domain-hus/src/index.mjs:423-432, 540-679, 1279` | HUS-regelverk påverkar sakområdet, men gapet är intern reskontrasanning | partial reality | ja |
| Export/evidence | reskontra och tie-out ska gå att exportera deterministiskt | snapshot/exportDurableState + aging snapshot | `packages/domain-ar/src/index.mjs:2536-2556, 2689-2718` | ingen extern källa krävs | partial reality | ja |

## Critical Findings

| ID | problem | filpath | status |
| --- | --- | --- | --- |
| D4-008 | snapshotad runtime truth i stället för repository-grade ÄR | `apps/api/src/platform.mjs` | migrate |
| D4-009 | lifecycle saknar reversal/cancel/refund/recovery | `apps/api/src/server.mjs` | rewrite |
| D4-011 | förskott före faktura saknas | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-013 | överbetalning blir unmatched receipt i stället för kundkredit | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-014 | refundkedja saknas helt | `apps/api/src/server.mjs` | replace |
| D4-017 | dunningmotor är hårdkodad och ofullständig | `packages/domain-ar/src/index.mjs` | replace |
| D4-020 | bad-debt recovery/VAT-reversal saknas | `packages/domain-ar/src/index.mjs` | rewrite |

## High Findings

| ID | problem | filpath | status |
| --- | --- | --- | --- |
| D4-001 | kunddedupe håller inte för riktig drift | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-003 | billing triggers konsumeras inte auktoritativt | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-004 | project/field-billing är inte legal-effect truth | `packages/domain-projects/src/index.mjs` | rewrite |
| D4-005 | due date blandas ihop med legalt fakturakrav | `packages/domain-ar/src/index.mjs` | harden |
| D4-006 | prepare-only delivery markeras som delivered | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-007 | nummerreservering är inte repository-grade | `packages/db/migrations/20260321120000_phase5_ar_invoicing_delivery.sql` | rewrite |
| D4-010 | kreditnota kan inte korrigera redan betald försäljning | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-015 | payment links saknar settlement truth | `packages/domain-ar/src/index.mjs` | rewrite |
| D4-016 | aktiv unik payment link upprätthålls inte i runtime | `packages/domain-ar/src/index.mjs` | harden |
| D4-019 | hårdkodade konton och scenariosträngar i ÄR-kod | `packages/domain-ar/src/index.mjs` | replace |
| D4-021 | HUS för egen receivable-state vid sidan av ÄR | `packages/domain-hus/src/index.mjs` | rewrite |
| D4-022 | export/evidence är inte first-class reskontraartifact | `packages/domain-ar/src/index.mjs` | replace |

## Medium Findings

| ID | problem | filpath | status |
| --- | --- | --- | --- |
| D4-002 | kontaktroller och billing-kanaler är för svaga | `packages/domain-ar/src/index.mjs` | harden |
| D4-018 | runbooks och receivables-test överdriver verifieringsläget | `tests/integration/phase5-ar-receivables-api.test.mjs` | rewrite |

## Low Findings

| ID | problem | filpath | status |
| --- | --- | --- | --- |
| D4-012 | allocation reversal ska bevaras och generaliseras | `packages/domain-ar/src/index.mjs` | keep |

## Cross-Domain Blockers

- Plattform/persistence: ÄR ligger kvar i snapshot-sanning och är därmed beroende av att Domän 1 blir fullt färdig.
- Ledger/chart governance: hårdkodade ÄR-konton och VAT-scenarioheuristik blockerar korrekt BAS- och tenantstyrning.
- Banking/payment rails: refund, payout-reconciliation och receipt truth måste kopplas till bankdomänen.
- Projects/field: legal-effect billing obligations måste byggas i projektdomänen eller centralt i ÄR.
- HUS: HUS måste skicka first-class ÄR-events för kundandel, betalningar, krediter och återkrav.
- Export/cutover: ÄR saknar cutoff-hashade evidence packages för parallel run och migration.

## Go-Live Blockers

1. förskott före faktura kan inte modelleras korrekt
2. kundkredit/negativt saldo saknas som first-class sanning
3. refundkedjan saknas helt
4. writeoff recovery och momsåterföring vid senare betalning saknas
5. delivery status är kosmetisk
6. payment links saknar settlement truth och runtime-unikhet
7. fakturering från kontrakt/projekt saknar auktoritativ billing consumption
8. HUS-kundandel och HUS-kreditkedjor återkopplar inte säkert till ÄR
9. ÄR-nummerreservering är inte repository-grade
10. dunningmotorn är hårdkodad och ofullständig för svensk drift
11. ÄR-sanningen ligger i snapshotad domänstate och inte i verkliga repositories

## Repo Reality Vs Intended ÄR Model

- Är customer masterdata tillräckligt korrekt och deduplicerbar för riktig ÄR-drift?  
  Nej.

- Är offert-, avtal- och fakturaflöden korrekt kopplade där de påverkar fakturering?  
  Partial reality. Quote hash finns, men canonical billing obligations saknas.

- Är fakturalivscykeln verkligt komplett från draft till paid/credited/written_off/reversed?  
  Nej.

- Är fakturanummerserier säkra, deterministiska och revisionssäkra?  
  Partial reality. Giltigt inom snapshotmotorn, inte go-live-säkert under riktig samtidighet och replay.

- Fungerar kreditnotor och delkrediter korrekt?  
  Partial reality. Grundkedjan finns men är felaktigt bunden till kvarvarande öppen skuld.

- Fungerar delbetalningar, prepayments, överbetalningar, negativa kundsaldon och refunds korrekt?  
  Nej. Delbetalningar fungerar. Förskott, kundkredit, negativt saldo och refund gör det inte.

- Är open items en sann källa för kundfordran efter alla ÄR-händelser?  
  Nej. Efter issue/payment/credit delvis ja, men inte efter prepayment, overpayment, refund och recovery efter kundförlust.

- Är unmatched receipts och payment matching säkra och spårbara?  
  Delvis. Matchning finns, men unmatched receipts används felaktigt som surrogat för kundkredit.

- Är fakturatidpunkt, fakturainnehåll, delivery status och delivery evidence korrekta?  
  Partial reality. Fältmotorn har verkliga delar, men legal vs policy är fel separerad och delivery evidence är kosmetisk.

- Är reminders, påminnelseavgifter, dröjsmålsränta, dunning och aging korrekt baserade på reskontran?  
  Nej. Aging finns, men dunningmotorn är inte regelriktig eller komplett.

- Är invoice-to-ledger och invoice-to-vat korrekt i alla viktiga scenarier?  
  Nej. Grundbroar finns, men inte för refund, prepayment-before-invoice, writeoff recovery och full reversal.

- Finns det dubbelfakturerings- eller underfaktureringsrisk i quote/order/project/field-kedjor?  
  Ja.

- Är HUS/ROT/RUT-kundfaktura-, kundbetalnings- och kreditkopplingar korrekta före och efter myndighetshändelse där de påverkar ÄR?  
  Nej.

- Är exports och receivable-underlag korrekta där de finns?  
  Nej, inte på first-class reskontranivå.

- Vilka brister i denna domän blockerar go-live?  
  Snapshot truth, saknad refundkedja, saknad prepayment/customer credit-modell, saknad writeoff recovery, hårdkodad dunning, payment-link divergence, bristande HUS/project-broar och bristande export/evidence.
