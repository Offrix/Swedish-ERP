# DOMAIN_09_ANALYSIS

## Scope

Domän 09 har verifierats mot:
- `C:\Users\snobb\Desktop\Prompts_inspect\Prompts\DOMÄN 9.md`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\constants.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\helpers.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\index.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-time\src\index.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324170000_phase18_collective_agreements.sql`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\db\seeds\20260324170010_phase18_collective_agreements_seed.sql`
- `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\phase14-collective-agreements-routes.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\platform-method-intents.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\route-contracts.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\surface-policies.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase18-collective-agreements.test.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase10-4-collective-agreement-payroll-consumption.test.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase18-collective-agreements-api.test.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase11-payroll-input-snapshots-api.test.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase21-payroll-core-api.test.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\tests\e2e\phase19-payroll-migration-flow.test.mjs`
- `C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\agreement-overlay-verification.md`
- `C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\collective-agreement-intake.md`
- `C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\collective-agreement-activation.md`

Extern verifiering som faktiskt användes:
- Riksdagen: Lag (1976:580) om medbestämmande i arbetslivet  
  `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1976580-om-medbestammande-i-arbetslivet_sfs-1976-580/`
- Riksdagen: Arbetstidslag (1982:673)  
  `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/`
- Riksdagen: Semesterlag (1977:480)  
  `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/`
- NIST SP 800-53 Rev. 5 för SoD/least privilege runt overrides och backoffice  
  `https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final`

Körda tester i denna verifiering:
- gröna: `tests/unit/phase18-collective-agreements.test.mjs`
- gröna: `tests/unit/phase10-4-collective-agreement-payroll-consumption.test.mjs`
- gröna: `tests/unit/phase11-payroll-input-snapshots.test.mjs`
- gröna: `tests/unit/phase21-payroll-core.test.mjs`
- gröna: `tests/integration/phase18-collective-agreements-api.test.mjs`
- gröna: `tests/integration/phase11-payroll-input-snapshots-api.test.mjs`
- gröna: `tests/integration/phase21-payroll-core-api.test.mjs`
- verifierad lokal repro med inline Node-körning för supplement-overwrite och supplement-datumläckage

## Verified Reality

- Det finns verklig runtime för `AgreementFamily`, `AgreementVersion`, `AgreementCatalogEntry`, `AgreementAssignment`, `AgreementOverride`, intake case och local supplement i `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:31-1079`.
- API-routes finns och är inköpplade för katalog, versionspublicering, assignments, overrides och backoffice-intake i `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\phase14-collective-agreements-routes.mjs`.
- Payroll konsumerar verkliga overlay-komponenter för `OVERTIME`, `OB`, `JOUR`, `STANDBY`, `VACATION_SUPPLEMENT` och pensionspåslag i `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:7574`, `7639`, `7652`, `8832`, `12435-12586`.
- Time-basen resolverar overlay per faktisk `workDate`, inte bara per periodslut, i `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-time\src\index.mjs:664-706`.
- Det finns migrationstest som bär `agreementSnapshot` som importartefakt i `C:\Users\snobb\Desktop\Swedish ERP\tests\e2e\phase19-payroll-migration-flow.test.mjs`.

## Partial Reality

- Intake, review och publication är verkliga state transitions men de är fortfarande metadata- och payloaddrivna, inte source-artifact- och compilerdrivna.
- Overlayn är körbar för en smal mängd lönedelar, men den är inte en komplett avtalsmotor med clause coverage, unsupported inventory eller versionskompilering.
- Payroll snapshotar agreement-overlay-hashen, men inte line-level clause provenance.
- API-ytorna fungerar, men override/supplement/publication ligger på för breda behörigheter och saknar riktig dual control.

## Legacy

- `C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\agreement-overlay-verification.md`
- `C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\collective-agreement-intake.md`
- `C:\Users\snobb\Desktop\Swedish ERP\docs\runbooks\collective-agreement-activation.md`
- `C:\Users\snobb\Desktop\Swedish ERP\packages\db\seeds\20260324170010_phase18_collective_agreements_seed.sql`

Samtliga ovan är råmaterial eller historiska verifieringsspår. De är inte sanningsbärande implementation.

## Dead Code

- `auditEvents` finns i runtime-state men används inte för verklig auditkedja i `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:67`.
- `draft`, `approved`, `verified`, `review_pending`, `superseded` och `retired` finns i konstanter men stora delar av livscykeln används inte som förstaklassig runtime i motorn, särskilt för supplements och catalog entries, i `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\constants.mjs:1-15`.

## Misleading / False Completeness

- Paketet ser ut som ett bounded context men exporterar bara en in-memory engine utan durable store-adapter i `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\index.mjs:1-2`.
- Migreringen ger sken av persistent domän men lagrar bara families, versions, assignments och overrides, inte intake, catalog, supplements, coverage, compiler receipts eller audit i `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324170000_phase18_collective_agreements.sql:1-75`.
- Testerna bevisar att green-paths fungerar, men de bevisar inte multi-version-per-period, unsupported clauses, self-approval blockering eller line-level traceability.

## Agreement Family / Catalog / Version Findings

- severity: `high`
- kategori: `version/catalog lifecycle`
- exakt problem: `publishAgreementVersion(...)` skapar version direkt som `active`, och `publishAgreementCatalogEntry(...)` publicerar direkt utan compiler- eller verification-receipt.
- varför det är farligt: avtalsversioner kan markeras live utan att clauses har normaliserats, täckts, kompilerats eller verifierats mot källavtal.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:168-229`, `244-311`
- rekommenderad riktning: införa `draft -> compiled -> review_pending -> approved -> published` för version/catalog med compiler receipt och coverage gate.
- status: `rewrite`

- severity: `high`
- kategori: `durability`
- exakt problem: migrationen saknar tabeller för catalog-publication lineage, intake cases, local supplements, source artifacts, compilation receipts och clause coverage.
- varför det är farligt: restart, replay, audit och cutover kan inte återskapa sann avtalsstatus.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324170000_phase18_collective_agreements.sql:1-75`
- rekommenderad riktning: ersätt schemat med full persistent modell för family/version/catalog/intake/supplement/override/coverage/source/evidence.
- status: `replace`

## Assignment / Employment Binding Findings

- severity: `medium`
- kategori: `employment binding`
- exakt problem: assignment kräver HR-employment och version window, men det finns ingen separat `AgreementBindingDecision` eller required re-evaluation när anställningsklass, roll eller kollektivavtalsberättigande ändras.
- varför det är farligt: en assignment kan fortsätta gälla efter att underliggande employment-fakta ändrats utan att avtalsmatchningen körs om.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:615-709`
- rekommenderad riktning: inför binding decision med rule family, source class, employment class och forced review on employment changes.
- status: `harden`

## Local Supplement / Override / Exception Findings

- severity: `critical`
- kategori: `local supplement identity corruption`
- exakt problem: local supplement indexeras med `localAgreementSupplementIdByVersion`, och vid ändra supplement på samma version återanvänds samma id och samma record i stället för att skapa nytt supplement.
- varför det är farligt: ett nytt supplement kan skriva över ett tidigare supplement, lämna gammal employment-index pekande på fel record och förstöra avtals- samt audit-sanningen.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:555-590`
- rekommenderad riktning: byt till unika supplement-records per supplement-scope och separat lookup per `(version, employment, window)`.
- status: `rewrite`

- severity: `critical`
- kategori: `local supplement validity enforcement`
- exakt problem: `getActiveAgreementForEmployment(...)` returnerar supplementet om assignmenten pekar på det, men verifierar inte supplementets eget datumfönster innan `evaluateAgreementOverlay(...)` merger overlayn.
- varför det är farligt: payroll kan beräkna lön med ett lokalt supplement utanför supplementets egen giltighet.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:795-876`
- rekommenderad riktning: filtrera supplement på `eventDate` före overlay merge och blockera assignment om supplementet inte längre är effektivt.
- status: `rewrite`

- severity: `critical`
- kategori: `override governance`
- exakt problem: `createAgreementOverride(...)` tillåter att `approvedByActorId` defaultar till samma `actorId`, och API-routen skickar samma principal som skapare och default-approver.
- varför det är farligt: override som påverkar lön kan självsigneras utan separation of duties, step-up eller second approver.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:735-777`, `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\phase14-collective-agreements-routes.mjs:303-320`
- rekommenderad riktning: ersätt direkt override-create med request/approve/activate-kedja och krävd dual control enligt AC-5/AC-6-principer.
- status: `replace`

- severity: `high`
- kategori: `override typing`
- exakt problem: override-payloaden är fri JSON och `overrideTypeCode` är breda buckets (`pay_rule`, `balance_rule`, `time_rule`, `rounding_rule`, `generic`) utan typad regelmodell.
- varför det är farligt: payload kan introducera okända eller ofullständiga nycklar som inte är compiler-validerade och som kan påverka payroll tyst.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\constants.mjs:11-15`, `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:760-777`
- rekommenderad riktning: ersätt fri JSON med typade override-commands per clause family och obligatorisk impact preview.
- status: `rewrite`

## Intake Case / Extraction / Review / Publication Findings

- severity: `high`
- kategori: `fake extraction/review`
- exakt problem: intake review tar `ruleSet` och `overlayRuleSet` direkt från request body och skapar version eller supplement utan parser, source artifact compiler eller clause review inventory.
- varför det är farligt: backoffice kan publicera manuellt inskriven JSON som om den vore verifierat avtalsinnehåll.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:420-517`
- rekommenderad riktning: separera intake source artifact, extraction artifact, canonical clause mapping, compile receipt och publication decision.
- status: `rewrite`

- severity: `medium`
- kategori: `publication target enforcement`
- exakt problem: `catalog` respektive `local_supplement` finns som statusspår, men runtime saknar egen compile/coverage-policy för de två publiceringsmålen.
- varför det är farligt: local supplement och central katalog kan få samma svaga review path trots helt olika riskprofil.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:441-505`
- rekommenderad riktning: inför separata review-gates och evidencekrav för central publicering respektive lokalt supplement.
- status: `harden`

## Effective Dating / Precedence / Overlap Findings

- severity: `high`
- kategori: `supersede semantics`
- exakt problem: `markHistoricalVersions(...)` markerar äldre version som `historical` bara om dess `effectiveTo` ligger helt före nya versionens start, men det finns ingen explicit supersession-receipt, no-gap-policy eller publish-plan.
- varför det är farligt: versioner kan bli logiskt ersätta utan tydlig lineage, vilket försvårar retro, replay och audit.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:1152-1169`
- rekommenderad riktning: bygg version chain med `supersedesVersionId`, `replacedByVersionId`, publish plan och explicit effective-date proof.
- status: `rewrite`

- severity: `high`
- kategori: `precedence`
- exakt problem: overlay-precedens är en enkel `Object.assign` i ordningen base -> version -> supplement -> overrides utan typed conflict resolution.
- varför det är farligt: två clauses med olika betydelse men samma nyckel vinner tyst utan diagnostic, och okända nycklar går igenom.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:850-859`
- rekommenderad riktning: inför typed merge engine med precedence matrix, conflict diagnostics och blocker på okända eller dubbeldefinierade clauses.
- status: `rewrite`

## Agreement Parsing / Normalization Findings

- severity: `critical`
- kategori: `source-to-runtime compiler missing`
- exakt problem: paketet saknar parser-, normalizer- eller compiler-moduler; README beskriver bara families, assignments och overlays.
- varför det är farligt: det finns ingen verifierbar kedja från signed agreement artifact till körbar regelmodell.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\README.md:1-7`, `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\index.mjs:1-2`
- rekommenderad riktning: bygg `AgreementSourceArtifact -> ClauseExtraction -> CanonicalClause -> CompilationReceipt -> ExecutableRulepack`.
- status: `replace`

## Clause Coverage / Unsupported Clause Findings

- severity: `critical`
- kategori: `coverage governance missing`
- exakt problem: ingen kod, migration eller test bär `clause coverage`, `unsupported clause inventory` eller publication block på ofullständig täckning.
- varför det är farligt: repo:t kan påstå avtalstöd utan att kunna visa vilka klausuler som är täckta, delvis täckta eller helt saknas.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:31-1079`, `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324170000_phase18_collective_agreements.sql:1-75`
- rekommenderad riktning: bygg first-class coverage-modell och blockerande unsupported inventory per avtalsversion.
- status: `replace`

## Executable Overlay / Rate Component Findings

- severity: `medium`
- kategori: `narrow pay-component model`
- exakt problem: rate components byggs bara för `OVERTIME`, `OB`, `JOUR`, `STANDBY`, `VACATION_SUPPLEMENT` och pension additions.
- varför det är farligt: motorn ser generisk ut men bär inte full avtalsverklighet för mertid, skiftformer, beräkningsstegar, timmar per intervall, åldersstyrda påslag eller clauses med flera nivåer.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:924-1031`
- rekommenderad riktning: inför typed pay component DSL med interval, threshold, basis snapshot och clause provenance per komponent.
- status: `rewrite`

## Pay Component Execution Findings

- severity: `high`
- kategori: `basis resolution`
- exakt problem: pay line-beräkningen löser agreement-driven lines via enkla basis codes och generiska `createPayLine(...)` utan clause trace, validity check eller event-scoped split.
- varför det är farligt: samma komponent kan materialiseras utan att payslip-linjen kan visa vilket avtal, vilken klausul eller vilken override som styrde beloppet.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:12435-12586`, `12650-12695`
- rekommenderad riktning: materialisera `AgreementPayComponentExecution` och `AgreementLineTrace` före pay line creation.
- status: `rewrite`

## Payroll / Time Consumption Findings

- severity: `critical`
- kategori: `event-date resolution`
- exakt problem: payrolls `resolveAgreementContext(...)` hämtar ett enda aktivt avtal och en enda overlay med `eventDate = period.endsOn`.
- varför det är farligt: perioder med versionbyte, supplementbyte eller overridebyte mitt i perioden får fel avtalsrate på tidrader från tidigare datum.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:10834-10863`
- rekommenderad riktning: resolva agreement context per time group, leave allocation, manual input source period och retro source date.
- status: `rewrite`

- severity: `high`
- kategori: `time/payroll drift`
- exakt problem: time-basen resolverar overlay per `resolvedWorkDate`, medan payroll resolverar en overlay per periodslut.
- varför det är farligt: time- och payroll-vyer kan visa två olika avtalsbilder för samma period.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-time\src\index.mjs:668-706`, `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:10834-10863`
- rekommenderad riktning: återanvänd en gemensam event-scoped resolution service i både time och payroll.
- status: `replace`

- severity: `high`
- kategori: `blocking policy`
- exakt problem: payroll klassar `collective_agreement_missing` som `warning` och `blocking: false`.
- varför det är farligt: lönekörning kan gå vidare utan aktivt kollektivavtal trots att repo:t samtidigt påstår avtalsdriven lönelogik.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:170-179`, `11068-11090`
- rekommenderad riktning: gör saknat aktivt avtal blockerande för employment classes där avtalsstyrd lön krävs.
- status: `harden`

## Payslip Line Traceability Findings

- severity: `critical`
- kategori: `traceability`
- exakt problem: `createPayLine(...)` saknar fält för `agreementVersionId`, `agreementAssignmentId`, `agreementClauseCode`, `agreementOverrideId` och beräkningssteg.
- varför det är farligt: ingen kan i efterhand bevisa varför en viss OB-, jour- eller semesterpåslagsrad fick just sitt belopp.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:12650-12695`
- rekommenderad riktning: lägg på line-level trace object och spara det både i pay run, payslip render payload och payroll input snapshot.
- status: `replace`

## Golden Scenario / Expected Outcome Findings

- severity: `high`
- kategori: `expected outcome coverage`
- exakt problem: testerna verifierar bara smala green-paths och saknar golden scenarios för versionsbyte mitt i period, lokalt supplement med slutdatum, override med separat approver, unsupported clauses och retro corrections.
- varför det är farligt: avtalsmotorn kan se stabil ut i CI samtidigt som verkliga kollektivavtalsfall är obevisade.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase18-collective-agreements.test.mjs`, `C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase10-4-collective-agreement-payroll-consumption.test.mjs`
- rekommenderad riktning: bygg golden scenarios per avtalsfamilj/version/klausulgrupp med väntat line-by-line utfall.
- status: `rewrite`

## Retro / Delta / Correction Findings

- severity: `high`
- kategori: `retro correction model missing`
- exakt problem: avtalsmotorn har ingen egen retro-, delta- eller correction-kedja när version, supplement eller override ändras i historiska perioder.
- varför det är farligt: senare payroll-korrigeringar kan bygga på ny overlay utan spårbar deltaförklaring mot historisk payslip.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:31-1079`, `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-payroll\src\index.mjs:6977`
- rekommenderad riktning: bygg `AgreementRetroImpactCase` som skapar delta lines och nya snapshots i stället för tyst omtolkning.
- status: `replace`

## Seed / Bootstrap / Fake-Live Findings

- severity: `high`
- kategori: `fake-live`
- exakt problem: både engine och DB-seed bootstrapar demoavtal `TEKNIKAVTALET` som aktivt live-liknande innehåll.
- varför det är farligt: protected runtime och test/demo kan glida ihop och dölja att riktig avtalskälla och riktig publicering saknas.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-collective-agreements\src\engine.mjs:35`, `70-72`, `1183-1215`, `C:\Users\snobb\Desktop\Swedish ERP\packages\db\seeds\20260324170010_phase18_collective_agreements_seed.sql:1-46`
- rekommenderad riktning: isolera seed till test-only fixtures och blockera bootstrap i protected/live.
- status: `remove`

## Security / SoD / Backoffice / Audit Findings

- severity: `high`
- kategori: `route protection`
- exakt problem: create/publish/assign/override-routes ligger på `company.manage` eller generell backoffice-access utan explicit high-risk payroll trust, step-up eller dual control.
- varför det är farligt: backoffice eller breda admins kan ändra lönepåverkande avtal utan rätt säkerhetsklass.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\phase14-collective-agreements-routes.mjs:245-271`, `291-305`, `391-417`
- rekommenderad riktning: införa explicit `collective_agreement_high_risk_manage`, step-up och four-eyes-krav.
- status: `replace`

- severity: `medium`
- kategori: `surface policy drift`
- exakt problem: route contracts klassar `/v1/collective-agreements/` som generell routefamilj men utan tydlig differentiering mellan katalog-read, assignment-write, supplement-write och override-approval.
- varför det är farligt: policy- och acceptansmodellen kan se starkare ut än faktisk route-granularitet.
- exakt filpath: `C:\Users\snobb\Desktop\Swedish ERP\apps\api\src\route-contracts.mjs` med `/v1/collective-agreements/` i explicit route scope
- rekommenderad riktning: skriv explicita route contracts per high-risk agreement action.
- status: `harden`

## Collective Agreement Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
|---|---|---|---|---|
| agreement families | first-class runtime | verified, but in-memory | `engine.mjs:31-1079`, unit/integration tests green | no durable store |
| agreement versions | effective-dated, publishable | partial | `engine.mjs:168-229`, overlap test exists | no compile/coverage gate |
| catalog publication | published dropdown truth | partial | `engine.mjs:244-311`, API integration test | no source compiler, no persistent publication lineage |
| assignments | employment-bound active agreement | partial | `engine.mjs:615-709`, API test | no rebind on employment-class change |
| local supplements | scoped, tidsstyrda | broken | `engine.mjs:555-590`, local repro | overwrite bug and validity leak |
| overrides | governed exceptions | broken | `engine.mjs:735-777`, route file default approver | self-approval, free JSON payload |
| intake / extraction / review | operational backoffice flow | partial | `engine.mjs:398-517`, API integration test | extraction is cosmetic, no parser/compiler |
| clause coverage | measurable and blocking | absent | no runtime/schema/test support found | critical |
| executable overlay | pay component runtime | partial | `engine.mjs:839-1031`, unit payroll consumption test | narrow model, no conflict diagnostics |
| payroll consumption | agreement affects pay run | partial | `payroll/index.mjs:10834-10863`, `12435-12586`, tests green | period-end resolution bug |
| payslip traceability | line-by-line rule provenance | absent | `createPayLine:12650-12695` | critical |
| migration agreement truth | import-safe agreement history | partial | e2e migration flow carries snapshot artifact | no bounded-context import engine för agreements |

## Concrete Agreement Verification Matrix

| capability | claimed agreement/payroll rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
|---|---|---|---|---|---|---|
| overlap guard on versions | same family cannot overlap | `publishAgreementVersion -> ensureNoOverlappingAgreementVersion` | `engine.mjs:168-229`, unit test | MBL + signed agreement artifacts still needed per family | partial | no compiler or supersede receipt |
| published catalog required för central assignment | unpublished version cannot be assigned | `assignAgreementToEmployment` | API test asserts `agreement_assignment_requires_published_catalog` | none required | verified | none |
| local supplement scope | supplement bound to employment | `approveLocalAgreementSupplement`, `assignAgreementToEmployment` | code + local repro | none required | broken | supplement overwrite by version id |
| supplement validity window | supplement only valid in own date range | `getActiveAgreementForEmployment`, `evaluateAgreementOverlay` | local repro proves leak after `effectiveTo` | Arbetstidslag/Semesterlag require correct date-based employment terms | broken | critical |
| override dual control | override must be separately approved | `createAgreementOverride`, POST overrides route | code inspection shows self-approval | NIST SP 800-53 AC-5/AC-6 | broken | critical |
| agreement source extraction | source document becomes canonical rules | `reviewAgreementIntakeCase` | code shows direct `ruleSet`/`overlayRuleSet` from request | official agreement source required per family; runtime missing | broken | critical |
| clause coverage | unsupported clauses block publication | no runtime path found | no code/schema/test | official agreement source required | broken | critical |
| overtime/OB/jour/standby materialization | overlay drives line rates | payroll `resolveAgreementPayItemRateComponent` | unit payroll consumption test | signed agreement artifact required per family | partial | single-overlay-per-period bug |
| vacation supplement auto-generate | overlay percent can generate supplement | payroll vacation path | unit payroll consumption test | Semesterlag | partial | no clause provenance |
| line-level traceability | payslip line maps to agreement rule | `createPayLine` | no trace fields present | audit requirement from payroll correctness | broken | critical |
| agreement required för payroll | missing overlay blocks | payroll finding map | `index.mjs:170-179`, `11068-11090` | signed agreement artifact required where agreement-governed | broken | warning-only |

## Critical Findings

1. Local supplement overwrite bug korrumperar sanningen för flera employments på samma avtalsversion.
2. Local supplement kan fortsätta styra efter sitt eget slutdatum.
3. Override kan självsigneras både i engine och API.
4. Parser/normalizer/compiler, clause coverage och unsupported inventory saknas helt.
5. Payroll resolverar avtal på periodslut i stället för per faktisk händelsedag.
6. Payslip-linjer saknar avtalsspårbarhet.

## High Findings

1. Version/catalog-livscykeln saknar compile- och verification-gates.
2. Agreement missing är varning i payroll i stället för blocker för avtalsstyrda employments.
3. Overlay-precedens är tyst `Object.assign`.
4. Seed/bootstrap ger fake-live.
5. Backoffice- och write-routes är för breda och för svagt klassade.

## Medium Findings

1. Assignment saknar rebind- och re-evaluation-kedja när employmentklass ändras.
2. Testerna är nästan bara green-paths.
3. Route contracts är för grova.
4. Runtime-statuskonstanter är bredare än faktisk användning.

## Low Findings

1. `auditEvents` ligger dött i engine-state.
2. README beskriver scope för smalt och döljer saknade compiler-delar.

## Cross-Domain Blockers

- Domän 08: employment truth och approved time set måste vara låsta innan avtalsmotorn kan vara korrekt.
- Domän 10: payroll/AGI kan inte bli korrekt utan event-date-scoped avtal och line-level traceability.
- Domän 16: backoffice/override måste få riktig SoD, approvals och evidence.
- Domän 13/15: migration och cutover behöver bounded-context import/export för agreements, inte bara snapshots.

## Go-Live Blockers

- local supplement overwrite
- supplement validity leak
- self-approved overrides
- ingen source-to-runtime compiler
- ingen clause coverage / unsupported inventory
- payroll använder periodsluts-overlay
- line-level traceability saknas
- persistent model är ofullständig

## Repo Reality Vs Intended Agreement Model

Repo:t har en verklig men smal avtalsoverlay-motor. Det är inte bara metadata. Den kan faktiskt påverka payroll. Men den är fortfarande byggd som en in-memory JSON-overlay ovanpå ett tunt schema, utan signed-source-compiler, coverage-gates, durable supplements, riktig override-governance och line-level traceability. Den faktiska modellen är därför `partial reality`, inte go-live-säker kollektivavtalsruntime.
