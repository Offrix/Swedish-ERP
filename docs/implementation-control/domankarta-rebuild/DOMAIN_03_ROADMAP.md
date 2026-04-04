# DOMAIN_03_ROADMAP

## mål

- Göra Domän 3 till en svensk bokföringskärna som tål revision, migration, årsskifte, export och myndighetsnära granskning.
- Eliminera alla paths där ledgern ser korrekt ut men fortfarande tillåter otillåten mutation, otillåten omläggning eller ofullständig export.
- Säkerställa att senare domäner ärver verklig bokföringssanning, inte snapshot- eller metadataapproximation.

## varför domänen behövs

- Ledgern är finansdomänernas bokföringssanning.
- Fel i legal form, fiscal year, accounting method, nummerserier eller retention blir systemiska fel i ÄR, AP, VAT, payroll, HUS, annual reporting och migration.
- Svenska go-live-krav kräver både teknisk och juridisk korrekthet: varaktighet, ordning, spårbarhet, exportbarhet och laglig ändringsstyrning.

## faser

| Fas | Innehåll | Huvudmål |
|---|---|---|
| Fas A | Governance binding | Göra legal form, fiscal year och accounting method till verkliga runtime-governors. |
| Fas B | Ledger integrity | Stänga renumbering-, snapshot-, delete- och schema/runtime-gap. |
| Fas C | Close and year-end | Göra close, reopen, opening balance och result transfer juridiskt hårda. |
| Fas D | Export and SIE | Bygga immutabla rapport- och SIE-artefakter. |
| Fas E | Retention and audit permanence | Göra bokföringsmaterial o-raderbart och fullt arkivstyrt. |

`DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör dimensionstyper, objekttyper, obligatoriska dimensionsregler, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust.

## delfaser

| Delfas | Markering | Primärt resultat |
|---|---|---|
| 3.1 legal-form hardening | rewrite | Legal form styr close, year-end och export på riktigt. |
| 3.2 fiscal-year governance hardening | harden | Year-shape, omläggning och aktivering styrs juridiskt korrekt. |
| 3.3 accounting-method governance hardening | rewrite | Metodbyte och catch-up styrs av verklig laglighets- och evidenskedja. |
| 3.4 change-legality enforcement hardening | rewrite | Alla tillåtna/förbjudna mutationer går via en central matris. |
| 3.5 BAS/chart governance hardening | harden | Kontoplanen får officiell derivatkedja, diff och ansvarig publicering. |
| 3.6 voucher/journal integrity hardening | harden | Postning, correction och approval blir riskklassade och spårbara. |
| 3.7 immutability/number-series hardening | rewrite | Nummerserier och journalsanning blir append-only. |
| 3.8 period lock/close/reopen/year-end hardening | rewrite | Close-fallback försvinner och reopen blir strikt undantagsstyrd. |
| 3.9 opening-balance/result-transfer hardening | harden | Årsskifteskedjan blir blockerande och auditbar. |
| 3.10 depreciation-method/depreciation/accrual hardening | harden | Metodomfång och correction rules blir explicita. |
| 3.11 main-ledger/verification-list/export-package hardening | rewrite | Huvudbok och verifikationslista blir egna immutabla artefakter. |
| 3.12 SIE import/export hardening | rewrite | Full roundtrip-säker SIE4 med objekt, scope-hash och importpolicy. |
| 3.13 retention/archive/delete hardening | rewrite | Otillåten delete tas bort och retention/legal hold blir tekniskt tvingande. |

## dependencies

| Delfas | Beroenden |
|---|---|
| 3.1 | inga |
| 3.2 | 3.1 |
| 3.3 | 3.2 |
| 3.4 | 3.1, 3.2, 3.3 |
| 3.5 | inga, men måste vara klar före bred subledgerbokning |
| 3.6 | 3.5 |
| 3.7 | 3.6 |
| 3.8 | 3.1, 3.2, 3.4, 3.7 |
| 3.9 | 3.8 |
| 3.10 | 3.6 |
| 3.11 | 3.7 |
| 3.12 | 3.5, 3.11 |
| 3.13 | 3.7, 3.11, 3.12 |

## vad som får köras parallellt

- 3.5 och 3.1 får köras parallellt så länge ingen konto- eller close-publicering märks som klar innan båda är gröna.
- 3.10 får köras parallellt med 3.11 efter att 3.6 är klar.
- 3.13 får förberedas parallellt med 3.12 efter att artefaktmodellen i 3.11 är låst.

## vad som inte får köras parallellt

- 3.2 får inte gå live före 3.1, eftersom legal form påverkar vad som är lagligt räkenskapsår.
- 3.7 får inte gå live efter 3.11 eller 3.12, eftersom export och SIE måste bygga på låst nummerserie och immutability.
- 3.8 får inte gå live före 3.4; close och reopen måste läsa samma laglighetsmatris som övriga mutationer.
- 3.13 får inte lämnas till efter cutover eller första bokföringsår i pilot/live.

## exit gates

- Ingen bokföringsnära mutation får ske utan aktiv legal form, aktivt räkenskapsår och aktiv bokföringsmetod för datumet.
- Ingen postad journal eller voucher-sekvens får kunna skrivas över, renumreras eller ersättas via snapshots.
- Fiscal-year-end-close måste blockera om legal form-, reporting-obligation- eller close-package-binding saknas.
- Huvudbok, verifikationslista, audit export och SIE4 måste kunna produceras deterministiskt från samma låsta scope.
- Hårdradering av bokföringsmaterial måste vara tekniskt omöjlig i normal runtime.

## test gates

- Alla tidigare gröna tester för fiscal year, accounting method, close, ledger governance och SIE4 ska fortsatt vara gröna.
- Nya tester måste tillkomma för:
  - legal-form-blocker vid year-end
  - fiscal-year legality matrix
  - accounting-method legality matrix
  - year-end catch-up från subledger-sanning
  - voucher-series append-only
  - snapshot-import blockerad i protected/live
  - huvudbok/verifikationslista som immutabla artefakter
  - SIE4 objekt-roundtrip
  - retention deny-delete och legal hold
- Samma testfamiljer ska kunna köras mot in-memory och Postgres där adapter finns.

## accounting gates

- Debet = kredit exakt.
- Journaldatum måste ligga i aktivt räkenskapsår och tillåten period.
- Varje postad journal måste ha source type, source id, idempotency key, actor och evidence refs.
- Årsskifteskedjan måste bevisa opening balance, result transfer och retained earnings-transfer i rätt ordning.

## immutability/number-series gates

- `nextNumber`, `status`, `locked` och importsekvenspolicy får inte kunna muteras efter första postade användning.
- Snapshot import får inte vara tillåten i protected/live för ledgerkritiska domäner.
- Canonical delete får inte finnas för journaler, journalrader, legal snapshots eller exportartefakter.
- Verifikationsnummerordning måste kunna visas per serie utan renumbering.

## change-legality gates

- Varje ändringsbar entitet måste ha en maskinläsbar legality-matris.
- Samma matris måste användas av API, batch, import och intern runtime.
- Förbjudna mittårsändringar måste blockeras i runtime, inte bara dokumenteras.

## close/year-end gates

- Fiscal-year-end-close får inte använda generisk fallback.
- Reopen måste kräva correction-case, separat approver och impacted-artifact-lista.
- Result transfer får inte ske före komplett close-state.
- Nytt räkenskapsår får inte aktiveras före verifierad opening-balance-kedja.

## export/SIE gates

- Huvudbok och verifikationslista ska vara egna immutable exportartefakter.
- SIE4 ska bära objekt/dimensioner, scope-hash, checksumma och import/export-evidence.
- Import ska följa explicit kontoetableringspolicy.

## retention gates

- Inga `ON DELETE CASCADE` på bokföringskritiska kedjor.
- Inga generiska delete-vägar i canonical repository för bokföringsobjekt.
- Varje artefakt måste ha retentionklass, legal hold och arkivstatus.

## markeringar: keep / harden / rewrite / replace / migrate / archive / remove

| Område | Markering |
|---|---|
| Dubbelbokföringskernel | keep |
| Legal-form-binding | rewrite |
| Fiscal-year legality | harden |
| Accounting-method legality | rewrite |
| Change-legality matrix | rewrite |
| BAS/chart governance | harden |
| Voucher/journal approval | harden |
| Immutability/numberserier | rewrite |
| Close/reopen/year-end | rewrite |
| Opening balance/result transfer | harden |
| Depreciation/accrual governance | harden |
| Main ledger/export artifacts | rewrite |
| SIE4 | rewrite |
| Retention/delete | rewrite |
| Missvisande runbooks | archive |
| Hårdkodat path-test | remove |
| Schema/runtime mismatch | migrate |

## 3.1 legal-form hardening

- Markering: rewrite
- Beroenden: inga
- Leverabler:
  - central `legalAccountingContext` för ledger/close/year-end/export
  - blockerande fel i stället för `monthly_standard` fallback vid fiscal-year-end
  - legal-form-snapshot per räkenskapsår
- Konkreta verifikationer:
  - year-end-close utan legal-form-profile ger blockerande fel
  - AB och enskild näringsverksamhet ger olika close- och package family-paths
  - framtida legal-form-byte påverkar bara framtida period
- Konkreta tester:
  - unit golden tests per företagsform
  - integrationtest där close-API ger 409 om reporting-obligation saknas
  - e2e för AB respektive enskild näringsverksamhet med olika close-krav
- Konkreta kontroller vi måste kunna utföra:
  - läsa ut aktiv legal-form-binding för ett specifikt bokföringsdatum
  - se exakt vilken legal-form-profile som användes för ett close package

## 3.2 fiscal-year governance hardening

- Markering: harden
- Beroenden: 3.1
- Leverabler:
  - legality-matris för kalenderår/brutet/kort/förlängt år
  - tydlig tillståndsmodell med evidensref
  - block mot aktivering när föregående år inte är färdig kedja
- Konkreta verifikationer:
  - otillåten årsomläggning blockeras med reason code
  - tillståndskrävande omläggning kräver tillståndsreferens
  - nytt år aktiveras inte före komplett close/result/opening-balance-kedja
- Konkreta tester:
  - unit-matris per legal form och årsform
  - integration för change request med required-evidence payload
  - Postgres-test för överlappande år och perioder
- Konkreta kontroller vi måste kunna utföra:
  - från audit trail se vem som godkände omläggningen och på vilken grund
  - se om ett planerat år fortfarande väntar på myndighets- eller ägarunderlag

## 3.3 accounting-method governance hardening

- Markering: rewrite
- Beroenden: 3.2
- Leverabler:
  - eligibility assessment som first-class objekt
  - method change request med evidencepaket
  - catch-up som läser verkliga subledgers i stället för request-body
- Konkreta verifikationer:
  - mittårsbyte blockeras
  - kontantmetod blockeras när regeltröskel eller entity scope inte tillåter den
  - catch-up kan bara köras från låsta ÄR/AP-utdrag
- Konkreta tester:
  - unit-golden tests för tillåtna/otillåtna byten
  - integrationtest där request-supplied `openItems` ignoreras eller avvisas
  - e2e som visar att metodbyte vid årsskifte påverkar nytt år men inte historiskt år
- Konkreta kontroller vi måste kunna utföra:
  - läsa ut aktiv bokföringsmetod för varje bokföringsdatum
  - se exakt vilket subledger-snapshot som låg bakom en catch-up-körning

## 3.4 change-legality enforcement hardening

- Markering: rewrite
- Beroenden: 3.1, 3.2, 3.3
- Leverabler:
  - en central legality-matris som delas av API, batch, import och intern runtime
  - blocker responses med `requiredApproval`, `requiredEvidence` och `ruleId`
  - policylogg över vilken regelrad som användes
- Konkreta verifikationer:
  - samma mutation via olika ingångsvägar ger samma beslut
  - varje godkänd mutation loggar regel-id och källgrund
- Konkreta tester:
  - unit snapshot-tests av matrisen
  - integrationtest för route kontra intern runtime
  - regressionstest mot gamla runbooks så att dokument inte översäljer runtime
- Konkreta kontroller vi måste kunna utföra:
  - fråga systemet varför en mutation blockerats och få ett exakt regel-id tillbaka

## 3.5 BAS/chart governance hardening

- Markering: harden
- Beroenden: inga
- Leverabler:
  - versionsstyrd kontokatalog med source reference och diff
  - separering mellan officiell BAS-derivatkedja och engine-required additions
  - policy för lokala avvikelser och kundspecifika konton
- Konkreta verifikationer:
  - varje publicerad katalog har checksumma, diff och ansvarig publicering
  - journaler lagrar vilken katalogversion de bokfördes mot
- Konkreta tester:
  - unit för diff- och coverage-kedja
  - integration som blockerar otillåten konto-klassmutation efter användning
  - Postgres-test som visar samma dimensionnycklar i kod och DB
- Konkreta kontroller vi måste kunna utföra:
  - kunna se exakt vilken kontokatalogversion en journalrad använde

## 3.6 voucher/journal integrity hardening

- Markering: harden
- Beroenden: 3.5
- Leverabler:
  - riskklassad approvalmatris per source type
  - obligatoriska evidence refs för high-risk-postningar
  - hårda correction-länkar mellan original och rättelse
- Konkreta verifikationer:
  - varje source type får rätt approvalklass
  - varje postad journal kan följas till källdomän och korrigeringskedja
- Konkreta tester:
  - unit för approval escalation per source type och beloppsnivå
  - integration för correction chain och reversal linkage
  - e2e där high-risk-postning kräver starkare approval än vanlig subledgerpost
- Konkreta kontroller vi måste kunna utföra:
  - kunna följa en postad verifikation tillbaka till source object, approver och evidence bundle

## 3.7 immutability/number-series hardening

- Markering: rewrite
- Beroenden: 3.6
- Leverabler:
  - append-only voucher sequence ledger
  - DB-spärr mot nummerseriemutation efter användning
  - borttagen canonical delete för bokföringskritiska objekt
- Konkreta verifikationer:
  - försök att ändra `nextNumber` efter användning blockeras
  - snapshot-import är blockerad i protected/live
  - postad journal kan inte raderas via canonical repository
- Konkreta tester:
  - unit för voucher-series append-only
  - integration för blocked snapshot import i protected mode
  - Postgres-test för delete/update-blockers
- Konkreta kontroller vi måste kunna utföra:
  - visa komplett nummerseriehistorik utan luckmanipulation
  - visa att journalhash och sequence-post inte förändrats efter postning

## 3.8 period lock/close/reopen/year-end hardening

- Markering: rewrite
- Beroenden: 3.1, 3.2, 3.4, 3.7
- Leverabler:
  - blockerande close utan legal-form-/reporting-obligation-binding
  - reopen endast via correction-case
  - close-state som binder year-end-transfer och export
- Konkreta verifikationer:
  - year-end-close utan korrekt legal context blockerar
  - reopen utan case-id och separat approver blockerar
  - lockad period kan inte få ny postning utan explicit reopen-flow
- Konkreta tester:
  - unit för close requirement resolution utan fallback
  - integration för reopen-policy
  - e2e för close -> reopen -> correction -> re-close
- Konkreta kontroller vi måste kunna utföra:
  - se exakt vilket case som öppnade om en period
  - se vilka artefakter som ogiltigförklarades och ersättes efter reopen

## 3.9 opening-balance/result-transfer hardening

- Markering: harden
- Beroenden: 3.8
- Leverabler:
  - opening-balance artifact med scope-hash
  - result-transfer artifact som måste finnas före retained earnings-transfer
  - fiscal-year activation blockerad tills kedjan är klar
- Konkreta verifikationer:
  - dubbel opening balance i samma år blockeras
  - retained earnings-transfer utan result-transfer blockeras
  - nytt räkenskapsår aktiveras inte innan artifact-kedjan är verifierad
- Konkreta tester:
  - unit för artifact-ordering
  - integration för activation blocker
  - e2e för full year-end till opening-balance-start av nytt år
- Konkreta kontroller vi måste kunna utföra:
  - kunna visa hela årsskifteskedjan med artefakt-id och journal-id

## 3.10 depreciation-method/depreciation/accrual hardening

- Markering: harden
- Beroenden: 3.6
- Leverabler:
  - explicit metodregister
  - tydliga regler för tillåtet metodbyte
  - idempotenta batchartefakter för avskrivning och periodisering
- Konkreta verifikationer:
  - ej tillåten metod inte exponeras
  - retroaktiv batchomräkning utan correction chain blockeras
  - varje batch har eget evidence scope
- Konkreta tester:
  - unit för metodregister och method-change blockers
  - integration för batch-idempotens
  - regressiontest för reversal och rebook av periodisering
- Konkreta kontroller vi måste kunna utföra:
  - visa vilken metod som användes för varje avskrivningsbatch

## 3.11 main-ledger/verification-list/export-package hardening

- Markering: rewrite
- Beroenden: 3.7
- Leverabler:
  - immutable artifacts för huvudbok
  - immutable artifacts för verifikationslista
  - audit export med included journal set och checksumma
- Konkreta verifikationer:
  - samma scope producerar samma artifact-hash
  - export kan återkopplas till exakt journalmängd
  - artifacten påverkas inte av efterföljande läsordning eller UI
- Konkreta tester:
  - unit för deterministic artifact generation
  - integration för API-export av immutable artifact
  - e2e för byråhandoff/audit-export
- Konkreta kontroller vi måste kunna utföra:
  - kunna ladda en huvudboksexport och se hash, scope och inkluderade journaler

## 3.12 SIE import/export hardening

- Markering: rewrite
- Beroenden: 3.5, 3.11
- Leverabler:
  - SIE4-export med objektlista från `dimensionJson`
  - importpolicy för kontoetablering
  - roundtrip-evidence med scope-hash och checksumma
- Konkreta verifikationer:
  - objekt/dimensioner överlever export -> import -> export
  - import skapar inte nya konton utan policybeslut
  - exportscope binder till rätt fiscal year och journalmängd
- Konkreta tester:
  - golden-file tests för objektfyllda vouchers
  - integration för `match-only` kontra `manual-review-required`
  - e2e för SIE-baserad opening-balance/cutover
- Konkreta kontroller vi måste kunna utföra:
  - visa exakt vilka journaler som ingick i en SIE-export
  - visa vilken policy som användes när ett nytt konto etablerades vid import

## 3.13 retention/archive/delete hardening

- Markering: rewrite
- Beroenden: 3.7, 3.11, 3.12
- Leverabler:
  - ingen generisk delete för bokföringskritiska objekt
  - retentionklass och legal hold per artefakt
  - restrict/archival rules i stället för kaskadradering
- Konkreta verifikationer:
  - delete av journal, export artifact och legal snapshot blockeras
  - legal hold stoppar varje försök till archival purge
  - retentiondatum och materialklass kan visas per artefakt
- Konkreta tester:
  - unit för delete denylist
  - integration för legal hold
  - Postgres-test som visar att `ON DELETE CASCADE` inte längre kan radera bokföringskedjor
- Konkreta kontroller vi måste kunna utföra:
  - från en journal eller exportartefakt läsa retentionklass, arkivstatus och legal-hold-status
