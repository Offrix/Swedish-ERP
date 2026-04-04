# DOMAIN_03_ANALYSIS

## Scope

- Granskad kod:
  - `packages/domain-ledger/src/index.mjs`
  - `packages/domain-sie/src/index.mjs`
  - `packages/domain-fiscal-year/src/index.mjs`
  - `packages/domain-accounting-method/src/index.mjs`
  - `packages/domain-legal-form/src/index.mjs`
  - `packages/domain-core/src/close.mjs`
  - `packages/domain-core/src/repositories.mjs`
  - `packages/domain-core/src/repositories-postgres.mjs`
  - `apps/api/src/server.mjs`
  - `apps/api/src/platform.mjs`
  - `apps/api/src/phase14-accounting-method-routes.mjs`
  - `apps/api/src/phase14-fiscal-year-routes.mjs`
  - `apps/api/src/phase14-legal-form-routes.mjs`
- Granskade migrationer:
  - `packages/db/migrations/20260321050000_phase3_ledger_foundation.sql`
  - `packages/db/migrations/20260321060000_phase3_ledger_dimensions_locks.sql`
  - relaterade migrations med `ON DELETE CASCADE` på bokföringsnära material
- Granskade tester:
  - `tests/unit/phase14-fiscal-year.test.mjs`
  - `tests/unit/phase14-accounting-method.test.mjs`
  - `tests/unit/phase14-ledger-governance.test.mjs`
  - `tests/unit/phase7-legal-form-close-requirements.test.mjs`
  - `tests/unit/phase7-year-end-transfers.test.mjs`
  - `tests/unit/phase7-sie4.test.mjs`
  - `tests/integration/phase14-fiscal-year-api.test.mjs`
  - `tests/integration/phase14-accounting-method-api.test.mjs`
  - `tests/integration/phase11-close-api.test.mjs`
- Körda tester i denna körning:
  - `node --test tests/unit/phase14-fiscal-year.test.mjs` grön
  - `node --test tests/unit/phase14-accounting-method.test.mjs` grön
  - `node --test tests/unit/phase7-sie4.test.mjs` grön
  - `node --test tests/integration/phase14-fiscal-year-api.test.mjs` grön
  - `node --test tests/integration/phase14-accounting-method-api.test.mjs` grön
  - `node --test tests/integration/phase11-close-api.test.mjs` grön
  - `node --test tests/unit/phase14-ledger-governance.test.mjs` grön
  - `node --test tests/unit/phase7-legal-form-close-requirements.test.mjs` grön
  - `node --test tests/unit/phase7-year-end-transfers.test.mjs` grön
- Officiella källor använda för regelverifiering:
  - Riksdagen, Bokföringslag (1999:1078)
  - Bokföringsnämnden, vägledning om bokföring och frågor/svar om bokföringsprogram
  - Skatteverket, SKV 424 om omläggning av räkenskapsår
  - Skatteverket, regler om faktureringsmetoden och bokslutsmetoden vid bokslut
  - BAS, officiella kontoplaner och ändringar för 2026
  - SIE-Gruppen, officiell dokumentation för SIE filformat utgåva 4C
- Samlad klassning:
  - Domän 3 är `partial reality`
  - Repo:t innehåller en verklig ledger/posting-kärna
  - Repo:t är inte go-live-säkert för svensk bokföringsrätt eftersom legal-form-binding, laglighetsmatris, nummerserieimmutabilitet, exportartefakter, full SIE4-fidelitet och retentionhärdning inte är hårt nog bundna i runtime

## Verified Reality

| capability | proof in code/tests | bedömning |
|---|---|---|
| Dubbel bokföring och balanskrav | `packages/domain-ledger/src/index.mjs:4991-5027`; `tests/unit/phase7-ledger-posting-kernel.test.mjs` | Runtime kräver minst två rader och exakt debet = kredit. |
| Posting-kedja draft -> approved_for_post -> posted | `packages/domain-ledger/src/index.mjs:3221-3267`; `tests/unit/phase14-ledger-governance.test.mjs` | Journalposter går genom verklig statuskedja före postning. |
| Reversal/result transfer | `packages/domain-ledger/src/index.mjs:3345-3560,4495-4527`; `tests/unit/phase7-year-end-transfers.test.mjs` | Rättelser och årsskiftesöverföring sker som nya poster, inte bara UI-flaggor. |
| Fiscal year-modell med kalenderår, brutet år, kort och förlängt år | `packages/domain-fiscal-year/src/index.mjs:417-690`; `tests/unit/phase14-fiscal-year.test.mjs` | Det finns en verklig year-shape-motor. |
| Accounting method som egen domän | `packages/domain-accounting-method/src/index.mjs:159-740`; `tests/unit/phase14-accounting-method.test.mjs` | Kontantmetod/faktureringsmetod är verklig runtime, inte bara metadata. |
| Legal-form-profiler | `packages/domain-legal-form/src/index.mjs:215-557`; `tests/unit/phase7-legal-form-close-requirements.test.mjs` | Företagsform och obligationsprofiler finns som runtimeobjekt. |
| Close workbench | `packages/domain-core/src/close.mjs:465-1110`; `tests/integration/phase11-close-api.test.mjs` | Close är en riktig motor med blockers, sign-off och reopen-path. |
| SIE4 grundimport/export | `packages/domain-sie/src/index.mjs:287-355,540-603`; `tests/unit/phase7-sie4.test.mjs` | SIE4 headers, opening balance och voucherhistorik finns på riktigt. |
| Opening balance | `packages/domain-ledger/src/index.mjs:1110-1178`; `tests/unit/phase7-sie4.test.mjs` | Opening balance är ett riktigt journaliserat objekt. |
| Avskrivning och periodisering | `packages/domain-ledger/src/index.mjs:1718-2253,4555-4587`; `tests/unit/phase7-depreciation.test.mjs` | Motorer finns och producerar journaler. |

## Partial Reality

| capability | exakt gap | rekommenderad riktning |
|---|---|---|
| Legal form som bokföringsgovernor | Legal form finns men binder inte posting kernel, close eller export tillräckligt hårt. | `rewrite` |
| Omläggning av räkenskapsår | Förenklad tillståndslogik utan full laglighetsmatris och hård evidenskedja. | `harden` |
| Byte av bokföringsmetod | Boundary checks finns, men godkännande/evidens är för tunn och catch-up använder request-data. | `rewrite` |
| BAS-governance | Intern katalog och testsignal finns, men ingen hårt styrd officiell derivatkedja. | `harden` |
| Voucher-serier | Purpose mapping låses, men `nextNumber`, `status`, `locked` och importsekvens kan fortfarande muteras. | `rewrite` |
| Close/reopen/year-end | Tekniskt flöde finns, men generisk fallback och svag reopen-gate ger falsk fullständighet. | `rewrite` |
| SIE4 | Basflöde finns, men exporten tappar objektlistor och importen kör godtycklig account-upsert utan hård governance. | `rewrite` |
| Exportartefakter | Huvudbok/verifikationslista som immutabla exportpaket saknas. | `rewrite` |
| Retention | Canonical delete och `ON DELETE CASCADE` lever kvar. | `rewrite` |
| Schema/runtime-paritet | DB använder ändra statuser och dimensionsnycklar än runtime. | `migrate` |

## Legacy

| path | exakt problem | status |
|---|---|---|
| `docs/runbooks/fiscal-year-change-runbook.md` | Bär äldre styrspråk och är inte tillräcklig som ensam sanning. | archive |
| `docs/runbooks/annual-close-and-filing-by-legal-form.md` | Översäljer legal-form-close som redan hårt bunden trots close-fallback i runtime. | archive |
| `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` | Beskriver delar av ledger/SIE/close som saknade trots att runtime nu finns. | archive |
| `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` | Äldre målbild stämmer inte med den nya rebuild-kedjan och får inte längre styra. | archive |

## Dead Code

| severity | kategori | exakt problem | exakt filepath | radreferens | rekommenderad riktning | status |
|---|---|---|---|---|---|---|
| low | tests | Hårdkodad lokal Windows-path gör testet miljöberoende och oanvändbart som sanningssignal. | `tests/unit/phase1-account-catalog.test.mjs` | `14-16,49-57` | skriv om till repo-relativ path eller ta bort | remove |

## Misleading / False Completeness

| path | exakt problem | varför det är farligt | status |
|---|---|---|---|
| `packages/domain-core/src/close.mjs` | Close kan falla tillbaka till `monthly_standard` och ändå se komplett ut. | Årsstängning kan se juridiskt korrekt ut utan att rätt legal-form-krav laddats. | rewrite |
| `tests/unit/phase7-sie4.test.mjs` | Gröna tester visar roundtrip för dagens begränsade modell, inte full SIE4-fidelitet med objekt/dimensionsstyrning. | Falsk trygghet om export/import för hela bokföringshistoriken. | harden |
| `packages/domain-ledger/src/account-catalog.mjs` | DSAM-katalogen ser BAS-lik ut men är inte hårt spårad till officiell BAS-derivatkedja. | Senare domäner kan bokföra mot felaktiga eller otillräckligt styrda konton. | harden |
| `apps/api/src/route-contracts.mjs` | Route-ytan ger intryck av färdig ledger-reporting trots att immutabla rapportartefakter saknas. | Acceptance risk; UI/ops kan tro att exportsidan redan är go-live-säker. | rewrite |

## Legal Form Findings

### D3-001

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | legal form / runtime binding |
| exakt problem | Legal form existerar som domän men bindningen in i ledger, fiscal-year-aktivering, close och export är inte hård. `resolveChecklistCloseRequirements(...)` i close kan återgå till generisk fallback i stället för att stoppa year-end. |
| varför det är farligt | Ett bolag kan få korrekt legal-form-metadata men ändå bokföras och stängas som om legal form inte spelade roll. |
| exakt filepath | `packages/domain-core/src/close.mjs`; `apps/api/src/platform.mjs`; `packages/domain-legal-form/src/index.mjs` |
| radreferens om möjligt | `packages/domain-core/src/close.mjs:1611-1658`; `apps/api/src/platform.mjs:262-309`; `packages/domain-legal-form/src/index.mjs:509-557` |
| rekommenderad riktning | Gör aktiv legal-form-snapshot obligatorisk för alla bokföringsnära mutationer, close och annual/export. Ta bort silent fallback på fiscal-year-end. |
| status | rewrite |

### D3-002

| fält | innehåll |
|---|---|
| severity | high |
| kategori | legal form / reporting obligation |
| exakt problem | Legal form-profiler och reporting-obligation-profiler finns, men runtime exponerar inte en central guard som stoppar bokföringskärnan när profil för aktuellt år saknas. |
| varför det är farligt | Årsbokslut, årsredovisning och signatory-class kan bli tekniskt körbara men juridiskt fel. |
| exakt filepath | `packages/domain-legal-form/src/index.mjs`; `packages/domain-core/src/close.mjs` |
| radreferens om möjligt | `packages/domain-legal-form/src/index.mjs:215-557`; `packages/domain-core/src/close.mjs:1611-1658` |
| rekommenderad riktning | Inför en central `legalAccountingContext` som måste resolve:as före close, year-end, filingnära export och fiscal-year activation. |
| status | harden |

## Fiscal Year Findings

### D3-003

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | fiscal year / legality |
| exakt problem | Tillståndslogiken för omläggning av räkenskapsår är förenklad till ett fåtal hårdkodade fall. Den representerar inte hela laglighetsmatrisen för kalenderår, brutet år, kort år, förlängt år och tillståndskrav. |
| varför det är farligt | Repo:t kan godkänna omläggningar som kräver tillstånd eller extra underlag utan att stoppa det i runtime. |
| exakt filepath | `packages/domain-fiscal-year/src/index.mjs` |
| radreferens om möjligt | `640-690` |
| rekommenderad riktning | Bygg en maskinläsbar legality-matris med legal form, owner taxation, current year kind, requested year kind, short/extended pattern, approval class och tillståndsreferens. |
| status | harden |

### D3-004

| fält | innehåll |
|---|---|
| severity | high |
| kategori | fiscal year / activation |
| exakt problem | `activateFiscalYear(...)` historiserar föregående år utan att hårt kräva full close/year-end/result-transfer/opening-balance-kedja. |
| varför det är farligt | Nya år kan aktiveras trots att föregående bokföringskedja inte är revisionssäker eller komplett. |
| exakt filepath | `packages/domain-fiscal-year/src/index.mjs` |
| radreferens om möjligt | `417-473,475-521` |
| rekommenderad riktning | Aktivering ska blockeras tills föregående år har verifierad close artifact, result-transfer artifact och opening-balance plan. |
| status | harden |

## Accounting Method Findings

### D3-005

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | accounting method / legality |
| exakt problem | Metodändring kräver boundary check och approvalstatus, men approval bär inte full juridisk grund, evidenskrav eller laglighetsklass. |
| varför det är farligt | Kontantmetod och faktureringsmetod kan bytas med otillräckligt beslutsunderlag. |
| exakt filepath | `packages/domain-accounting-method/src/index.mjs`; `apps/api/src/phase14-accounting-method-routes.mjs` |
| radreferens om möjligt | `495-621`; `250-326` |
| rekommenderad riktning | Flytta metodbyte till en legalitetsstyrd change request med explicit evidencepaket, approvalklass och affected fiscal year-binding. |
| status | harden |

### D3-006

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | accounting method / catch-up |
| exakt problem | `runYearEndCatchUp(...)` bygger det ekonomiska underlaget från API-supplied `openItems`, normaliserar dem och postar sedan catch-up-journaler. |
| varför det är farligt | Year-end catch-up kan bli fel även när testet är grönt, eftersom ÄR/AP inte är source of truth för körningen. |
| exakt filepath | `packages/domain-accounting-method/src/index.mjs`; `apps/api/src/phase14-accounting-method-routes.mjs` |
| radreferens om möjligt | `652-740`; `304-326` |
| rekommenderad riktning | Kör catch-up från låsta ÄR/AP-subledgers och använd requesten bara som trigger eller scope-begränsning. |
| status | rewrite |

## Change Legality Matrix

| entity or capability | what can change | when it can change | what cannot change | required approval/evidence | official source used | actual runtime enforcement | blocker |
|---|---|---|---|---|---|---|---|
| Legal form profile | Ny framtida profil och obligationsprofil | Före berört räkenskapsår eller genom kontrollerad correction chain | Retroaktiv mutation av stängt år | Registreringsunderlag, impacted-year analysis, approval | BFL 6 kap., BFL 7 kap., BFN om företagsformers bokslut | Delvis; profil finns men close kan falla tillbaka | Ja |
| Fiscal year change | Nytt planerat år, kort/förlängt år, omläggning | Endast i de fall lagen tillåter och med tillstånd när det krävs | Otillåten kalender->brutet eller brutet->brutet utan tillstånd | Tillståndsreferens, styrelse-/ägarbeslut, impacted scope | BFL 3 kap., BFL 7 kap., SKV 424 | Delvis; förenklad tillståndslogik | Ja |
| Fiscal period reopen | Reopen via kontrollerad correction path | Endast efter incident/correction-case | Fri reopen med bara reasonCode | Tvåpersonersgodkännande, impact analysis, case-id | BFL 5 kap. 5-7 §§, BFN rättelser | Nej, route kräver inte stark nog gate | Ja |
| Accounting method change | Byte vid laglig gräns | Vid räkenskapsårsgräns med eligibility assessment | Mittårsbyte utan specialkedja | Eligibility assessment, decision memo, year binding | Skatteverket om bokslutsmetoden/faktureringsmetoden | Delvis | Ja |
| Year-end catch-up | Catch-up mot verkliga öppna poster | Vid bokslut och från låsta subledgers | Fritt klientsupplied ekonomiskt underlag | Subledger-snapshot, scope-hash, sign-off | Skatteverket om obetalda fakturor vid bokslut | Nej, request-body styr underlaget | Ja |
| Voucher series | Ny serie före användning | Före första postade användning | Renumbering eller sekvenspolicy-ändring efter användning | Governance case, separat importserie, tvåpersonersgodkännande | BFL 5 kap. 1, 6, 7 §§ | Nej, flera fält kan ändras efter användning | Ja |
| Posted journal entry | Rättelse via reversal/correction | Efter ny korrigeringsjournal | In-place mutation eller delete | Correction reason, linked original, audit | BFL 5 kap. 5-7, 9 §§ | Delvis; journalflödet rätt, snapshot-import/delete underminerar | Ja |
| SIE import/export | Import av historik och export av scope | När fiscal year scope är låst | Förlust av objekt/dimensioner och oreglerad kontoetablering | Scope-hash, checksum, roundtrip-evidence | SIE-Gruppen typ 4 | Delvis; objekt tappas i export | Ja |
| Retention/archive/delete | Arkivering och legal hold | Under hela retentiontiden | Hårdradering av bokföringsmaterial | Retention class, legal hold, delete denylist | BFL 7 kap., BFN om arkivering | Nej | Ja |

## Ledger / Voucher / Journal Findings

### D3-007

| fält | innehåll |
|---|---|
| severity | high |
| kategori | ledger kernel |
| exakt problem | Posting kernel är hård på debet/kredit, men approvalmatrisen är fortfarande smal och främst knuten till `MANUAL_JOURNAL` i stället för riskklass, periodstatus och correctionscope. |
| varför det är farligt | Senare domäner kan generera hög-risk-bokningar utan samma kontrollnivå som man tror. |
| exakt filepath | `packages/domain-ledger/src/index.mjs` |
| radreferens om möjligt | `5420-5433` |
| rekommenderad riktning | Inför riskklassad approvalmatris per source type, belopp, periodstatus, close-närhet och correction-class. |
| status | harden |

### D3-008

| fält | innehåll |
|---|---|
| severity | high |
| kategori | journal integrity |
| exakt problem | Journalkärnan har list-/lookup-funktioner men inga immutabla, hashade huvudboks- och verifikationslisteartefakter som binder scope, sortering och included journals. |
| varför det är farligt | Revision, byråexport och cutover kan inte luta på stabila artefakter, bara på rå API-läsning. |
| exakt filepath | `packages/domain-ledger/src/index.mjs`; `apps/api/src/server.mjs` |
| radreferens om möjligt | `3566-3608`; routeblocket saknar egna immutable exportartefakter |
| rekommenderad riktning | Bygg first-class exportartefakter för huvudbok, verifikationslista och audit export. |
| status | rewrite |

## Immutability / Number Series Findings

### D3-009

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | number series / renumbering |
| exakt problem | Efter att en serie använts låses purpose mapping, men `nextNumber`, `status`, `importedSequencePreservationEnabled` och `locked` kan fortfarande ändras i `upsertVoucherSeries(...)`. |
| varför det är farligt | Det öppnar för renumbering, hålmaskning och policybyte i efterhand. |
| exakt filepath | `packages/domain-ledger/src/index.mjs` |
| radreferens om möjligt | `956-1042`, särskilt `1013-1025` |
| rekommenderad riktning | Flytta nummersanning till append-only sequence ledger med DB-spärr mot efterhandsmutation. |
| status | rewrite |

### D3-010

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | immutability / persistence |
| exakt problem | Plattformen kan exportera och importera snapshot artifacts för kritiska domäner. Repositories exponerar också generisk delete. |
| varför det är farligt | Journal- och årsbokföringssanning kan ersättas eller raderas på aggregerad nivå trots att enskilda journalflöden ser korrekta ut. |
| exakt filepath | `apps/api/src/platform.mjs`; `packages/domain-core/src/repositories.mjs`; `packages/domain-core/src/repositories-postgres.mjs` |
| radreferens om möjligt | `apps/api/src/platform.mjs:1833-1986`; `packages/domain-core/src/repositories.mjs:931-939`; `packages/domain-core/src/repositories-postgres.mjs:390-416` |
| rekommenderad riktning | Förbjud snapshot-import i produktionsruntime för bokföringskritiska domäner och ta bort generisk delete från finanskärnans canonical repositories. |
| status | rewrite |

## BAS / Account Catalog / Governance Findings

### D3-011

| fält | innehåll |
|---|---|
| severity | high |
| kategori | BAS / chart governance |
| exakt problem | Kontokatalogen är en intern derivatkatalog (`swedish_erp_dsam_curated_catalog`) utan full officiell BAS-derivatkedja, publiceringsprocess och diff/evidence. |
| varför det är farligt | Konton kan vara plausibla men ändå för smala, felklassade eller otillräckligt uppdaterade för svensk redovisning. |
| exakt filepath | `packages/domain-ledger/src/account-catalog.mjs`; `packages/domain-ledger/src/data/dsam-2026.catalog.json` |
| radreferens om möjligt | `packages/domain-ledger/src/account-catalog.mjs:6-203`; katalogmetadata i `packages/domain-ledger/src/data/dsam-2026.catalog.json` |
| rekommenderad riktning | Inför officiell BAS-governance med source reference, versionskedja, diff och ansvarig publicering. |
| status | harden |

### D3-012

| fält | innehåll |
|---|---|
| severity | high |
| kategori | schema / runtime mismatch |
| exakt problem | Runtime använder `approved_for_post` och `serviceLineCode`, medan DB-checks i phase3-migrationerna tillåter `validated` och saknar `serviceLineCode`. |
| varför det är farligt | Postgres-runtime och kod kan driva isär, ge fel persistering eller tyst tappa dimensioninformation. |
| exakt filepath | `packages/domain-ledger/src/index.mjs`; `packages/db/migrations/20260321050000_phase3_ledger_foundation.sql`; `packages/db/migrations/20260321060000_phase3_ledger_dimensions_locks.sql` |
| radreferens om möjligt | `packages/domain-ledger/src/index.mjs:18,520-531,3234`; `packages/db/migrations/20260321050000_phase3_ledger_foundation.sql:36-46`; `packages/db/migrations/20260321060000_phase3_ledger_dimensions_locks.sql:20-48` |
| rekommenderad riktning | Migrera DB-schemat till faktisk runtime eller sänk runtime till schema; de får inte divergera före go-live. |
| status | migrate |

## Period Lock / Close / Reopen / Year-End Findings

### D3-013

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | close / fallback |
| exakt problem | `resolveChecklistCloseRequirements(...)` returnerar fallback med `closeTemplateCode: "monthly_standard"` när legal-form- eller reporting-obligation-profile saknas. |
| varför det är farligt | Year-end close kan passera som om rätt juridisk mall laddats fast den inte gjort det. |
| exakt filepath | `packages/domain-core/src/close.mjs` |
| radreferens om möjligt | `1611-1658` |
| rekommenderad riktning | Gör saknad legal-form-/reporting-obligation-profile blockerande för fiscal-year-end-close. |
| status | rewrite |

### D3-014

| fält | innehåll |
|---|---|
| severity | high |
| kategori | period reopen |
| exakt problem | Reopen på fiscal-year/periodnivå är inte bundet till tillräckligt stark correction-case, dual approval och impact analysis i route/runtime-kedjan. |
| varför det är farligt | Låsta perioder kan öppnas med för svag kontroll, vilket urholkar audit trail och deklarationsnärhet. |
| exakt filepath | `packages/domain-fiscal-year/src/index.mjs`; `apps/api/src/phase14-fiscal-year-routes.mjs` |
| radreferens om möjligt | `packages/domain-fiscal-year/src/index.mjs:551-568`; `apps/api/src/phase14-fiscal-year-routes.mjs:311-335` |
| rekommenderad riktning | Reopen ska kräva correction-case, separat approver, artifacts impacted-lista och automatisk re-close-plan. |
| status | harden |

## Opening Balance / Result Transfer Findings

### D3-015

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | opening balance / year-end chain |
| exakt problem | Opening balance och result transfer är verkliga, men aktivering av nytt år kräver inte hårt att hela kedjan är verifierad innan nästa års normalläge får starta. |
| varför det är farligt | Ett nytt år kan se aktivt ut även om retained earnings eller opening balance-kedjan inte är fullständigt bevisad. |
| exakt filepath | `packages/domain-ledger/src/index.mjs`; `packages/domain-fiscal-year/src/index.mjs` |
| radreferens om möjligt | `packages/domain-ledger/src/index.mjs:1110-1178,1260-1395`; `packages/domain-fiscal-year/src/index.mjs:417-473` |
| rekommenderad riktning | Bind fiscal-year activation till verifierad opening-balance/result-transfer artifact-kedja. |
| status | harden |

## Depreciation Method / Depreciation / Accrual / Adjustment Findings

### D3-016

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | depreciation governance |
| exakt problem | Avskrivnings- och periodiseringsmotorer finns, men metodomfånget och regler för metodbyte är smalt och inte publicerat som explicit legality/governance-matris. |
| varför det är farligt | Bolag kan tro att fler metoder eller retroaktiva justeringar är säkra än vad runtime faktiskt kan bära. |
| exakt filepath | `packages/domain-ledger/src/index.mjs` |
| radreferens om möjligt | `1718-2253,4053-4058,4555-4587` |
| rekommenderad riktning | Publicera explicit metodregister, tillåtet scope, tillåten ändringspunkt och correction rules innan fler metoder exponeras. |
| status | harden |

## Main Ledger / Verification List / Export Package Findings

### D3-017

| fält | innehåll |
|---|---|
| severity | high |
| kategori | reporting / export package |
| exakt problem | Repo:t saknar first-class, immutabla huvudboks- och verifikationslisteartefakter med scope-hash, checksumma, sorteringsregel och included journal ids. |
| varför det är farligt | Byråexport, revision, support och cutover får inget stabilt bokföringspaket att lita på. |
| exakt filepath | `packages/domain-ledger/src/index.mjs`; `apps/api/src/server.mjs`; `apps/api/src/route-contracts.mjs` |
| radreferens om möjligt | `packages/domain-ledger/src/index.mjs:3566-3608`; route contracts saknar egen immutable exportmodell |
| rekommenderad riktning | Bygg exporter som egna artefakter: `general_ledger`, `verification_list`, `audit_export`, `year_end_package`. |
| status | rewrite |

## SIE Import / Export Findings

### D3-018

| fält | innehåll |
|---|---|
| severity | high |
| kategori | SIE export fidelity |
| exakt problem | SIE-exporten skriver `#TRANS ... {}` och tappar objektlistor i exporten även om importen kan läsa objekt in till `objectJson`/`dimensionJson`. |
| varför det är farligt | Roundtrip blir bara delvis korrekt; objekt- och dimensionssanning kan försvinna ut ur systemet. |
| exakt filepath | `packages/domain-sie/src/index.mjs` |
| radreferens om möjligt | `343-345,463-498,577` |
| rekommenderad riktning | Exportera verklig objektlista från `dimensionJson` enligt SIE4-konvention och bind det till roundtrip-golden files. |
| status | rewrite |

### D3-019

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | SIE import governance |
| exakt problem | Importen skapar konton dynamiskt via `upsertLedgerAccount(...)` för alla konton som filen kräver. Det saknas hård governance kring när konto får etableras automatiskt. |
| varför det är farligt | Historikimport kan skapa kontoobjekt som går runt officiell BAS-governance eller kundens chart policy. |
| exakt filepath | `packages/domain-sie/src/index.mjs` |
| radreferens om möjligt | `519-552` |
| rekommenderad riktning | Inför explicit import policy: `match-only`, `allow-derived-create`, `manual-review-required`. |
| status | harden |

## Retention / Archive / Delete Findings

### D3-020

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | retention / delete |
| exakt problem | Canonical repository-lagret exponerar generisk delete och DB-migrationer använder `ON DELETE CASCADE` i flera kedjor som berör bokföringsnära material. |
| varför det är farligt | Bokföringsmaterial kan förstöras eller förvanskas genom teknisk delete i stället för laglig arkiv-/rättelsekedja. |
| exakt filepath | `packages/domain-core/src/repositories.mjs`; `packages/domain-core/src/repositories-postgres.mjs`; `packages/db/migrations/20260321000000_phase0_foundation.sql` |
| radreferens om möjligt | `packages/domain-core/src/repositories.mjs:931-939`; `packages/domain-core/src/repositories-postgres.mjs:390-416`; `packages/db/migrations/20260321000000_phase0_foundation.sql:109,134,147` |
| rekommenderad riktning | Ta bort delete-vägen för bokföringskritiska objekt, byt kaskader mot restrict/archival rules och inför retentionklass + legal hold på artefakter. |
| status | rewrite |

## Concrete Accounting Verification Matrix

| capability | claimed legal/accounting rule | actual runtime path | proof in code/tests | official source used | status | blocker |
|---|---|---|---|---|---|---|
| Legal form styr close | Year-end ska följa företagsform och obligationsprofil | `resolveChecklistCloseRequirements(...)` | `packages/domain-core/src/close.mjs:1611-1658`; `tests/unit/phase7-legal-form-close-requirements.test.mjs` | BFL 6 kap., BFN | partial reality | Ja |
| Räkenskapsår kan ändras lagligt | Omläggning måste följa lag/tillstånd | `packages/domain-fiscal-year/src/index.mjs` | `640-690`; `tests/unit/phase14-fiscal-year.test.mjs` | BFL 3 kap., BFL 7 kap., SKV 424 | partial reality | Ja |
| Bokföringsmetod byts bara lagligt | Metodbyte endast när reglerna tillåter | `packages/domain-accounting-method/src/index.mjs` | `495-621`; `tests/unit/phase14-accounting-method.test.mjs` | Skatteverket om bokslutsmetoden/faktureringsmetoden | partial reality | Ja |
| Year-end catch-up är korrekt | Obetalda poster vid bokslut ska hämtas från verkligt underlag | `runYearEndCatchUp(...)` | `652-740`; `tests/unit/phase14-accounting-method.test.mjs` | Skatteverket om obetalda fakturor vid bokslut | misleading | Ja |
| Verifikationer är balanserade | Debet = kredit | Posting kernel | `packages/domain-ledger/src/index.mjs:4991-5027` | BFL 5 kap., god redovisningssed | verified reality | Nej |
| Nummerserier kan inte renumreras | Efter användning ska serie vara låst | `upsertVoucherSeries(...)` | `956-1042`; `tests/unit/phase14-ledger-governance.test.mjs` | BFL 5 kap. 1, 6, 7 §§ | partial reality | Ja |
| Posted journals är immutabla | Rättelse ska ske via ny post | journal + snapshot import | `packages/domain-ledger/src/index.mjs`; `apps/api/src/platform.mjs:1833-1986` | BFL 5 kap. 5-7, 9 §§ | partial reality | Ja |
| Close/reopen är säkert | Reopen ska vara hårt undantagsstyrd | fiscal year + close routes | `packages/domain-fiscal-year/src/index.mjs:551-568`; `tests/integration/phase11-close-api.test.mjs` | BFL 5 kap., BFN | partial reality | Ja |
| Opening balance/result transfer är korrekt | Ingående balans och resultatöverföring ska vara spårbar | ledger year-end flows | `packages/domain-ledger/src/index.mjs:1110-1178,1260-1395`; `tests/unit/phase7-year-end-transfers.test.mjs` | BFL 3 kap. | partial reality | Delvis |
| SIE4 roundtrip är komplett | Export/import ska bevara bokföringshistorik och objekt | SIE export/import | `packages/domain-sie/src/index.mjs:343-345,463-498,540-603`; `tests/unit/phase7-sie4.test.mjs` | SIE-Gruppen typ 4 | partial reality | Ja |
| BAS-governance är auditbar | Kontoplanen ska vara styrd, versionsspårad och källsäkrad | account catalog | `packages/domain-ledger/src/account-catalog.mjs`; `tests/unit/phase1-account-catalog.test.mjs` | BAS | partial reality | Ja |
| Retention är laglig | Räkenskapsinformation får inte raderas otillåtet | repo delete + cascades | `packages/domain-core/src/repositories-postgres.mjs:390-416`; migrations med cascades | BFL 7 kap., BFN om arkivering | misleading | Ja |

## Critical Findings

- D3-001 legal form är inte hårt bindande bokföringsgovernor.
- D3-003 omläggning av räkenskapsår styrs av förenklad tillståndslogik.
- D3-006 year-end catch-up använder request-supplied `openItems`.
- D3-009 voucher-serier kan fortfarande muteras efter användning.
- D3-010 snapshot-import och generisk delete underminerar immutability.
- D3-013 close kan falla tillbaka till generisk `monthly_standard`.
- D3-020 retention/delete-kedjan är inte bokföringsrättsligt säker.

## High Findings

- D3-002 reporting-obligation-binding är för svag.
- D3-004 fiscal-year-aktivering är inte hårt bunden till full close-kedja.
- D3-007 riskklassad approvalmatris för bokningar saknas.
- D3-008 immutabla huvudboks-/verifikationsartefakter saknas.
- D3-011 BAS-governance är för svag.
- D3-012 schema/runtime mismatch i ledger.
- D3-014 reopen är för svagt styrd.
- D3-017 immutable export packages saknas.
- D3-018 SIE-export tappar objekt.

## Medium Findings

- D3-015 opening-balance/result-transfer måste bindas hårdare till fiscal-year-aktivering.
- D3-016 explicit avskrivningsmetod-governance saknas.
- D3-019 SIE-import saknar hård policy för automatisk kontoetablering.

## Low Findings

- Hårdkodad lokal Windows-path i `tests/unit/phase1-account-catalog.test.mjs`.

## Cross-Domain Blockers

- ÄR/AP i senare domäner kan inte få laglig year-end-catch-up förrän D3-006 är omskriven.
- VAT, annual reporting och owner distribution kan inte lita på fiscal-year legality förrän D3-003 och D3-004 är åtgärdade.
- Payroll, HUS och banking får inte boka mot ledgern som production truth förrän D3-009, D3-010 och D3-020 är stängda.
- Migration/cutover kan inte markeras säkert förrän D3-017, D3-018 och D3-019 är stängda.

## Go-Live Blockers

- Legal form binder inte close och year-end tillräckligt hårt.
- Omläggning av räkenskapsår är inte juridiskt hård nog.
- Bokföringsmetodens year-end catch-up använder fel source of truth.
- Nummerserier kan fortfarande manipuleras efter användning.
- Snapshot-import och canonical delete tillåter otillåten historikpåverkan.
- SIE-export är inte fullfidelitetsmässig för objekt/dimensioner.
- Retention och delete-semantik är inte förenliga med svensk bokföringsplikt.

## Repo Reality Vs Intended Accounting Core Model

- Intended model:
  - legal form, fiscal year och accounting method ska vara styrande runtimegovernors
  - ledger ska vara append-only och revisionssäker
  - nummerserier ska vara deterministiska och immutabla
  - close/year-end ska vara juridiskt bundna
  - export och SIE ska vara kompletta och spårbara
  - retention ska vara tekniskt blockerad mot otillåten radering
- Repo reality:
  - ledger/posting-kärnan finns och fungerar tekniskt
  - legal form, fiscal year och accounting method finns som separata domäner
  - men bindningen mellan dem är för lös
  - snapshot-import, delete-vägar och DB-cascades gör kärnan mindre varaktig än vad bokföringsrätten kräver
  - export- och SIE-kedjan ser mogen ut men är inte fullständigt revisionssäker
- Slutsats:
  - Domän 3 är användbar som grund
  - Domän 3 är inte färdig bokföringsrättslig sanning
  - Domän 3 måste skrivas om och härdas innan senare finance-domäner får räknas som go-live-nära
