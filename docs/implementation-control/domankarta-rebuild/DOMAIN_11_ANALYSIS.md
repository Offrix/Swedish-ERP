# DOMAIN_11_ANALYSIS

## Scope

Domän 11 täcker den reglerade kärnan för:
- HUS/ROT/RUT
- regulated submissions
- receipts, retries, dead letters, replay och manual receipt import
- annual reporting
- corporate tax declaration packs
- SRU/iXBRL/taxonomy-bound artifacts
- owner distributions
- KU31
- kupongskatt
- signatory chains
- signing/archive-provider paths
- migration, cutover, history import och replay för reglerade objekt

Verifierade repo-spår:
- `packages/domain-hus/src/index.mjs`
- `packages/domain-regulated-submissions/src/module.mjs`
- `packages/domain-annual-reporting/src/index.mjs`
- `packages/domain-owner-distributions/src/index.mjs`
- `packages/domain-integrations/src/providers/skatteverket-hus.mjs`
- `packages/domain-integrations/src/providers/skatteverket-agi.mjs`
- `packages/domain-integrations/src/providers/skatteverket-vat.mjs`
- `packages/domain-integrations/src/providers/bolagsverket-annual.mjs`
- `packages/domain-integrations/src/providers/signicat-signing-archive.mjs`
- `packages/domain-integrations/src/providers/skatteverket-transport-provider-base.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/surface-policies.mjs`
- relevanta migrations och seeds i `packages/db/`
- relevanta tester i `tests/unit/`, `tests/integration/` och `tests/e2e/`

Officiella källor låsta för domänen:
- [Årsredovisningslag (1995:1554) 2 kap. 7 §](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/)
- [Skatteverket: Så fungerar rotavdraget för företag](https://skatteverket.se/foretag/skatterochavdrag/rotochrut/safungerarrotavdraget.4.2ef18e6a125660db8b080002709.html)
- [Skatteverket: Information om filöverföringstjänst för SRU-uppgifter](https://www.skatteverket.se/foretag/etjansterochblanketter/allaetjanster/tjanster/filoverforing/informationomsruuppgifter.4.3dfca4f410f4fc63c86800020896.html)
- [Skatteverket: För dig som lämnat utdelning från ditt aktiebolag (kupongbolag)](https://www.skatteverket.se/foretag/internationellt/kupongskatt/fordigsomlamnatutdelningfrandittaktiebolagkupongbolag.4.6e8a1495181dad540842ee.html)
- [Bolagsverket: API för inlämning av digitala årsredovisningar](https://media.bolagsverket.se/diar/services/2.0/lamnaInArsredovisning-2.0.html)

## Verified Reality

- `verified reality` HUS-kärnan har verklig canonical beloppslogik som håller isär arbetskostnad, moms och icke-avdragsgrundande delar. Proof: `packages/domain-hus/src/index.mjs:2532`, `packages/domain-hus/src/index.mjs:2900-3116`, `tests/integration/phase12-hus-truth-model-api.test.mjs`.
- `verified reality` HUS readiness är mer än ett rent statusfält. Runtime bygger `claimReadyState`, blocker codes, evidence refs och buyer/payment-based readiness. Proof: `packages/domain-hus/src/index.mjs:2364-2427`, `packages/domain-hus/src/index.mjs:2532-2544`.
- `verified reality` HUS claim -> decision difference -> recovery candidate är verklig runtime, men bara i snapshot-/Map-buren modell. Proof: `packages/domain-hus/src/index.mjs:802-904`, `packages/domain-hus/src/index.mjs:904-1486`.
- `verified reality` regulated-submissions har en verklig common state machine för envelope, sign, submit, attempts, receipts, correction link och action queue. Proof: `packages/domain-regulated-submissions/src/module.mjs:111-221`, `packages/domain-regulated-submissions/src/module.mjs:478-959`, `packages/domain-regulated-submissions/src/module.mjs:1855-1872`.
- `verified reality` annual reporting bygger versioner från hard-closed periods och bevarar supersede chain. Proof: `packages/domain-annual-reporting/src/index.mjs:313-430`, `packages/domain-annual-reporting/src/index.mjs:2038-2047`.
- `verified reality` owner distributions har verkliga first-class objekt för share classes, holding snapshots, free-equity snapshots, decisions, payment instructions, KU31 drafts och kupongskatt records. Proof: `packages/domain-owner-distributions/src/index.mjs:104-111`, `packages/domain-owner-distributions/src/index.mjs:273-279`.
- `verified reality` owner-distribution-kärnan kräver separat approver för stämmobeslut, payout, reversal och treaty-reduktion. Proof: `packages/domain-owner-distributions/src/index.mjs:571-580`, `packages/domain-owner-distributions/src/index.mjs:643-645`, `packages/domain-owner-distributions/src/index.mjs:853-855`, `packages/domain-owner-distributions/src/index.mjs:1282-1289`.
- `verified reality` route-contract-motorn klassar annual-reporting, submissions och owner-distributions som high-risk genom `strong_mfa`-derivering. Proof: `apps/api/src/route-contracts.mjs:170-191`, `apps/api/src/route-contracts.mjs:786-795`.

## Partial Reality

- `partial reality` HUS truth-modellen är stark, men buyer validation är lokal normalisering och defaultade flags, inte faktisk extern validering mot ägande/boende/myndighetsunderlag. Proof: `packages/domain-hus/src/index.mjs:2694-2719`.
- `partial reality` regulated-submissions är en verklig intern motor, men live transport/receipt är inte fullvärdig för alla families. AGI har broar, men HUS/VAT/annual tax pack drivs fortfarande via prepared transport, queueing och manuella steg.
- `partial reality` annual reporting låser versioner och signoff hash, men den juridiska signatory-kedjan är för grov för svensk AB-rätt.
- `partial reality` corporate tax computation finns som current-tax-logik och SRU-/iXBRL-exportartefakter, men inte som full deklarationsmotor med verklig filingkedja.
- `partial reality` owner distributions har verklig logik men saknar dedikerad durable repository-truth, riktig filing-/receipt-kedja för KU31/kupongskatt och verklig residency/beneficial-owner-verifiering.

## Legacy

- `legacy` HUS `transportType: "json"` och `legacy_json` är kvar i regulated runtime. Proof: `packages/domain-hus/src/index.mjs:700-752`, `packages/domain-hus/src/index.mjs:3641-3659`.
- `legacy` demo-seeds för HUS, annual reporting och tax submission ligger kvar nära regulated paths: `packages/db/seeds/20260322040010_phase10_build_rules_hus_personalliggare_seed.sql`, `packages/db/seeds/20260322041000_phase10_build_rules_hus_personalliggare_demo_seed.sql`, `packages/db/seeds/20260322141000_phase12_annual_reporting_demo_seed.sql`, `packages/db/seeds/20260322151000_phase12_tax_submission_demo_seed.sql`.
- `legacy` flera runbooks beskriver official paths och regulated readiness utan att tydligt spegla att providerkoden bara preparerar metadata eller att sign archive är lokal.

## Dead Code

- `dead` `annual_report_packages`, `annual_report_versions` och `annual_report_signatories` finns som SQL-sanning men används inte som canonical runtime-repository i standardstartup. Proof: `packages/db/migrations/20260322140000_phase12_annual_reporting.sql`, `apps/api/src/platform.mjs:1750-2190`.
- `dead` `submission_envelopes` och `submission_receipts` finns som SQL-sanning men regulated-submissions default-runtime bärs fortfarande av in-memory snapshot genom generic critical-domain persistence. Proof: `packages/db/migrations/20260322150000_phase12_tax_submission_engine.sql`, `apps/api/src/platform.mjs:1750-2190`.
- `dead` HUS SQL-tabellerna speglar inte canonical HUS-model. De är för grova för att kunna vara slutlig truth path. Proof: `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql:28-55`, `packages/domain-hus/src/index.mjs:2900-3116`.
- `dead` ingen dedikerad SQL-truth för owner distributions hittades. Runtime lever i `Map()`-state och generic snapshot persistence. Proof: `packages/domain-owner-distributions/src/index.mjs:104-111`, repo-sökning över `packages/db/migrations`.

## Misleading / False Completeness

- `misleading` HUS transportprofil markerar `direct_api` och `xml` som `supportsOfficialSubmission: true`, trots att någon verklig live-adapter, XML-generator och receipt-importkedja inte finns. Proof: `packages/domain-hus/src/index.mjs:3641-3661`.
- `misleading` providerfilerna ser ut som riktiga myndighetsadapters men returnerar i praktiken bara `prepareTransport(...)`-metadata. Proof: `packages/domain-integrations/src/providers/skatteverket-transport-provider-base.mjs:44-76`.
- `misleading` signing archive heter Signicat men är en lokal `Map()` som skapar syntetiska archive refs. Proof: `packages/domain-integrations/src/providers/signicat-signing-archive.mjs:38-131`.
- `misleading` route-contracts kräver `strong_mfa`, men serverns handskrivna handlers för annual/submissions/owner-distributions använder i praktiken `authorizeCompanyAccess(...)` + surface policy utan explicit enforcement av trust-nivå eller fresh step-up. Proof: `apps/api/src/server.mjs:5908-5935`, `apps/api/src/server.mjs:6083-6222`, `apps/api/src/server.mjs:8119-8338`, `apps/api/src/server.mjs:19464-19539`.
- `misleading` `annual_operations` låter som hög-risk-policy men är i själva verket en läs-/surface-policy, inte en trust-, MFA- eller step-up-policy. Proof: `apps/api/src/surface-policies.mjs:1-30`, `apps/api/src/surface-policies.mjs:207-214`.
- `misleading` annual signatory chain använder rollklass `BOARD_OR_CEO`, men svensk lag kräver samtliga styrelseledamöter och VD om sådan finns. Repo:t ser blockerande ut utan att vara juridiskt komplett. Proof: `packages/domain-annual-reporting/src/index.mjs:2114-2173`, official source [ÅRL 2 kap. 7 §](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/).

## Findings

### F11-001
- severity: critical
- kategori: HUS persistence / secrecy
- exakt problem: SQL-schemat för `hus_case_buyers` lagrar `personal_identity_no TEXT NOT NULL` i klartext medan runtime i övrigt har identitetsmaskning och secret refs.
- varför det är farligt: regulated HUS-truth riskerar att landa i rå persondata i vanlig domänstate. Det bryter mot bank-grade separation, ökar incidentrisk och gör durable state mer känsligt än det måste vara.
- exakt filpath: `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql`
- radreferens om möjligt: `28-39`
- rekommenderad riktning: ersätt klartextpersonnummer med `buyerIdentityRef`, fingerprint, maskat värde och separat secret-lager; skriv om seedfiler och repo-importer samtidigt.
- status: rewrite

### F11-002
- severity: high
- kategori: HUS canonical persistence
- exakt problem: HUS SQL-schemat saknar canonical fält för labor inkl/ex moms, VAT, travel, equipment, admin, other och full buyer allocation truth.
- varför det är farligt: så fort SQL-truth aktiveras kommer HUS-matematiken att degraderas och beloppslogiken i claim/export/reconciliation driva isär från runtime.
- exakt filpath: `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql`
- radreferens om möjligt: `41-55`
- rekommenderad riktning: bygg om HUS repository runt samma value kernel som `packages/domain-hus/src/index.mjs`.
- status: rewrite

### F11-003
- severity: high
- kategori: HUS validation
- exakt problem: buyer validation sätter `identityValidationStatus: "validated"` och defaultade `eligibilityFlags` utan verklig extern verifiering av ägande/boende.
- varför det är farligt: HUS-case kan se `claim_ready` ut internt trots att bostad eller köparstatus faller i myndighetsledet.
- exakt filpath: `packages/domain-hus/src/index.mjs`
- radreferens om möjligt: `2694-2719`
- rekommenderad riktning: dela upp intern formell validering från extern verifiering och kräva explicit evidence/state för båda.
- status: harden

### F11-004
- severity: critical
- kategori: HUS transport
- exakt problem: `buildHusTransportProfile(...)` marknadsför `direct_api` och `xml` som official-capable, men repot saknar riktig XML/XSD-generator, schema-validering, live transport och official receipt import.
- varför det är farligt: control plane, API och runbooks kan främstå som live-klara trots att det faktiska flödet fortfarande är export/manuell hantering.
- exakt filpath: `packages/domain-hus/src/index.mjs`
- radreferens om möjligt: `3641-3661`
- rekommenderad riktning: ta bort `direct_api` som live capability tills officiell API-väg faktiskt verifierats; bygg explicit `manual_official_xml_import` och `authorized_agent_submission`.
- status: replace

### F11-005
- severity: high
- kategori: regulated submission transport
- exakt problem: common engine är verklig som state machine, men live-provider paths gör i praktiken `prepareTransport(...)`, queueing och metadata-prep snarare än riktig myndighetssändning och receipt-collection.
- varför det är farligt: systemet kan visa att något är `submitted` utan att riktig myndighetstransport och receiptfamilj finns.
- exakt filpath: `packages/domain-regulated-submissions/src/module.mjs`, `packages/domain-integrations/src/providers/skatteverket-transport-provider-base.mjs`
- radreferens om möjligt: `478-550`, `1855-1872`, `44-76`
- rekommenderad riktning: bygg riktiga adapterfaser `prepare`, `dispatch`, `poll`, `importReceipt`, `mapReceipt`, `finalize`, och förbjud `submitted` utan official transport evidence.
- status: replace

### F11-006
- severity: high
- kategori: regulated submission durability
- exakt problem: SQL-tabeller för `submission_envelopes` och `submission_receipts` finns, men runtime använder generic snapshot persistence i stället för first-class repository wiring.
- varför det är farligt: recovery, replay, operator queue, idempotency och receipt lineage kan bli sämre än vad schemaspåren antyder.
- exakt filpath: `packages/db/migrations/20260322150000_phase12_tax_submission_engine.sql`, `apps/api/src/platform.mjs`
- radreferens om möjligt: `50-149`, `1750-2190`
- rekommenderad riktning: bygg riktig regulated-submissions repository med tabellbackade envelopes, attempts, receipts, correction links och evidence refs.
- status: rewrite

### F11-007
- severity: critical
- kategori: annual signatory legality
- exakt problem: `annualSignoffSatisfied(...)` kräver bara att rollerna i klassen `BOARD_OR_CEO` finns och är signerade. Svensk lag kräver att samtliga styrelseledamöter skriver under och att VD också skriver under om sådan finns.
- varför det är farligt: årsredovisning kan markeras signerad fast signatory-kedjan juridiskt är ofullständig.
- exakt filpath: `packages/domain-annual-reporting/src/index.mjs`
- radreferens om möjligt: `2114-2173`
- rekommenderad riktning: modellera signatory-kedjan personkomplett, inte bara som rollklass; bind till verklig styrelsesammansättning/VD-status per beslutsdatum.
- status: rewrite

### F11-008
- severity: critical
- kategori: annual route security
- exakt problem: annual sign-route använder bara `permissionCode: "company.read"` och saknar explicit fresh step-up trots high-risk signering.
- varför det är farligt: en signeringskritisk åtgärd kan utföras med för svag authz/trust-kedja.
- exakt filpath: `apps/api/src/server.mjs`
- radreferens om möjligt: `5927-5944`
- rekommenderad riktning: kräv granular permission, fresh strong MFA, sign-specific approval receipt och route-contract enforcement i server.
- status: rewrite

### F11-009
- severity: high
- kategori: annual persistence
- exakt problem: annual reporting startar med `Map()`-state för packages, versions, evidence packs, signatories, submission events, current tax computations och tax packages.
- varför det är farligt: SQL-tabellerna ger intryck av first-class durable truth men standardruntime kör fortfarande snapshot persistence för hela aggregate-sfären.
- exakt filpath: `packages/domain-annual-reporting/src/index.mjs`, `apps/api/src/platform.mjs`
- radreferens om möjligt: `85-110`, `1750-2190`
- rekommenderad riktning: inför first-class repository som bär annual package/version/signatory/submission/tax package-truth utan semantisk förlust.
- status: rewrite

### F11-010
- severity: high
- kategori: corporate tax declaration
- exakt problem: tax declaration pack bygger SRU-rader och iXBRL-related baselines, men repot visar ingen full filingkedja för INK2/corporate tax med verklig official send/receipt.
- varför det är farligt: artifacts kan se kompletta ut trots att verklig deklarationslämning och receipt governance saknas.
- exakt filpath: `packages/domain-annual-reporting/src/index.mjs`
- radreferens om möjligt: `877-996`, `1552-1561`, `1699-1700`
- rekommenderad riktning: bygg separat `CorporateTaxDeclarationPackage`, `SruArtifactFamily`, `Ink2SubmissionCase` och filing capabilityklassning `manual_official` eller `live_provider`.
- status: rewrite

### F11-011
- severity: high
- kategori: owner-distribution durability
- exakt problem: owner-distributions har rik domänmodell men ingen dedikerad SQL-truth för share classes, holdings, free equity, decisions, payouts, KU31 eller kupongskatt.
- varför det är farligt: utdelningskedjan ser first-class ut men är fortfarande snapshot-/memory-buren i standardruntime.
- exakt filpath: `packages/domain-owner-distributions/src/index.mjs`, `apps/api/src/platform.mjs`
- radreferens om möjligt: `104-111`, `1750-2190`
- rekommenderad riktning: bygg first-class repository och migrationer för hela utdelningskedjan.
- status: rewrite

### F11-012
- severity: high
- kategori: residency / beneficial owner
- exakt problem: payoutkedjan kräver treaty evidence och separat approval vid reducerad kupongskatt, men repo:t verifierar inte verkligt residens, beneficial ownership eller hemvistintygskedja.
- varför det är farligt: systemet kan bevilja reducerad kupongskatt på för svagt underlag.
- exakt filpath: `packages/domain-owner-distributions/src/index.mjs`
- radreferens om möjligt: `1275-1289`
- rekommenderad riktning: bygg `ResidencyEvidenceCase`, `BeneficialOwnerEvidenceCase`, `TreatyReductionReview` och explicit document requirements per mottagare.
- status: harden

### F11-013
- severity: high
- kategori: KU31 / kupongskatt filing
- exakt problem: KU31 drafts och kupongskatt records finns, men repo:t saknar verklig filing-/receiptkedja mot Skatteverkets e-tjänst/filöverföring/blänketter.
- varför det är farligt: systemet kan se komplett ut fram till draft/record utan att faktiskt kunna fullfölja lagkravet.
- exakt filpath: `packages/domain-owner-distributions/src/index.mjs`, `apps/api/src/server.mjs`
- radreferens om möjligt: `925-995`, `8319-8338`
- rekommenderad riktning: bygg explicit capabilityklassning för `KU31` och `kupongskatt` som `manual_official` eller `live_provider`, med filing receipt och due-date governance.
- status: replace

### F11-014
- severity: critical
- kategori: route trust enforcement
- exakt problem: `authorizeCompanyAccess(...)` kontrollerar action/resource men inte route-contractens trustnivå. `assertAnnualOperationsAccess(...)` kontrollerar bara surface policy.
- varför det är farligt: `strong_mfa` blir dokumentation snarare än hård enforcement i high-risk regulated routes.
- exakt filpath: `apps/api/src/server.mjs`, `apps/api/src/route-contracts.mjs`, `apps/api/src/surface-policies.mjs`
- radreferens om möjligt: `19464-19539`, `786-795`, `1-30`, `207-214`
- rekommenderad riktning: inför central route-contract enforcement med färsk trustnivå, session age och explicit step-up receipt före handler execution.
- status: rewrite

### F11-015
- severity: medium
- kategori: demo / runbook drift
- exakt problem: flera runbooks och demo-seeds beskriver կամ paketerar regulated live-förmåga som inte finns i faktisk runtime.
- varför det är farligt: release, support och acceptance kan tro att Domän 11 är go-live-klar när provider paths fortfarande är prepared-only eller lokala.
- exakt filpath: `docs/runbooks/hus-claim-recovery.md`, `docs/runbooks/annual-close-and-filing-by-legal-form.md`, `docs/runbooks/owner-distributions-and-ku31.md`, `docs/runbooks/submission-operations-and-retry.md`, `packages/db/seeds/20260322141000_phase12_annual_reporting_demo_seed.sql`, `packages/db/seeds/20260322151000_phase12_tax_submission_demo_seed.sql`
- radreferens om möjligt: hela dokumenten/filerna ska klassificeras om
- rekommenderad riktning: skriv om runbooks till capability-sanningsenliga documents och flytta demo-seeds till test-only eller archive.
- status: archive

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| HUS canonical amounts | regulatoriskt bärande | verified reality i domänkärna | `packages/domain-hus/src/index.mjs:2532-3116`, `tests/integration/phase12-hus-truth-model-api.test.mjs` | nej |
| HUS durable truth | förstaklass | partial reality via generic snapshot, inte canonical SQL | `apps/api/src/platform.mjs:1750-2190`, `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql` | ja |
| HUS official XML transport | antydd | fake-live / saknas | `packages/domain-hus/src/index.mjs:3641-3661`, official Skatteverket XML/e-tjänstregler | ja |
| regulated submissions common engine | förstaklass | verified reality som intern state machine | `packages/domain-regulated-submissions/src/module.mjs:111-959` | nej |
| regulated submissions live transport | förstaklass | partial / prepared-only | `packages/domain-integrations/src/providers/skatteverket-transport-provider-base.mjs:44-76` | ja |
| annual versioning | förstaklass | verified reality | `packages/domain-annual-reporting/src/index.mjs:313-430` | nej |
| annual durable truth | förstaklass | partial reality | `packages/domain-annual-reporting/src/index.mjs:85-110`, `apps/api/src/platform.mjs:1750-2190` | ja |
| annual legal signatory chain | blockerande | misleading / otillräcklig | `packages/domain-annual-reporting/src/index.mjs:2114-2173`, ÅRL 2 kap. 7 § | ja |
| SRU artifact generation | finns | partial reality | `packages/domain-annual-reporting/src/index.mjs:917-959` | ja |
| Bolagsverket digital filing | antydd | partial reality, ej full live path | `packages/domain-annual-reporting/src/index.mjs:1699-1700`, Bolagsverket API | ja |
| owner distribution truth | förstaklass | verified reality i domänkärna | `packages/domain-owner-distributions/src/index.mjs:104-111`, `571-995` | nej |
| owner distribution durable truth | förstaklass | partial reality | `packages/domain-owner-distributions/src/index.mjs:104-111`, repo-sökning DB | ja |
| KU31 / kupongskatt filing | antydd | partial / draft-only | `packages/domain-owner-distributions/src/index.mjs:925-995`, official Skatteverket kupongskatt/KU31 | ja |
| strong MFA för high-risk regulated routes | claimad via route-contracts | misleading, ej central enforcement | `apps/api/src/route-contracts.mjs:170-191`, `apps/api/src/server.mjs:19464-19539` | ja |

## Critical Findings

- F11-001 HUS buyer SQL lagrar rå personnummer.
- F11-004 HUS official transport är fake-live.
- F11-007 annual signatory-kedjan bryter mot ÅRL 2 kap. 7 § för AB.
- F11-008 annual sign-route använder `company.read` och saknar stark step-up.
- F11-014 route-contract `strong_mfa` är inte centralt enforced i regulated handlers.

## High Findings

- F11-002 HUS persistence saknar canonical fields.
- F11-003 HUS buyer validation är bara lokal.
- F11-005 regulated-submissions live transport är metadata-prep, inte full send/receipt.
- F11-006 regulated-submission SQL-truth är oinköpplad.
- F11-009 annual runtime lever i Maps/generic snapshot.
- F11-010 corporate tax declaration pack saknar verklig filingkedja.
- F11-011 owner-distribution durable truth saknas.
- F11-012 residency/beneficial-owner är otillräckligt verifierad.
- F11-013 KU31/kupongskatt filing saknas.

## Medium Findings

- F11-015 runbooks och demo-seeds driver falsk completeness.

## Go-Live Blockers

- HUS official transport är inte verkligt live.
- regulated-submissions receiptmotor är inte fullvärdig live-motor.
- annual signatory-kedjan är juridiskt otillräcklig.
- annual sign/send/payout-routes saknar pålitlig strong_mfa/fresh-step-up enforcement.
- owner distributions saknar first-class durable repository.
- KU31 och kupongskatt saknar riktig filing-/receiptkedja.
- demo/runbook/statuspåståenden kan skapa falsk acceptance om de inte rensas.

## Repo Reality Vs Intended Regulated Model

Repo:t innehåller mer verklig regulated logik än de gamla råmaterialfilerna antydde. HUS-kärnan, annual versioning, submission state machine och owner-distribution-beslutslogik är riktiga. Det som fallerar är att flera kritiska delar stannar i ett mellanläge:
- canonical domain logic finns
- men durable repositories är oinköpplade eller för grova
- official transport/adapters är metadata-prep i stället för verklig myndighetsintegration
- security claims i route-contracts faller bort i handskrivna server-handlers
- legal signatory/residency/treaty-regler är förenklade

Domän 11 ska därför härdas och omskrivas till full regulated runtime där:
- canonical objects blir canonical persistence
- official channels får riktig capabilityklassning
- varje send/sign/pay action får receipt, evidence och strong step-up
- legal signatory/residency/proof modell blir personkomplett och juridiskt riktig
- demo/trial/fake-live rensas bort ur protected/live
