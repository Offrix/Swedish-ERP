# Blocker Traceability Matrix Final

Status: support document for `GO_LIVE_ROADMAP_FINAL.md` phase `0.3`.  
This document is not a new source of truth. It exists to prove that every binding blocker and every mandatory new build item in the final roadmap has an explicit subphase target.

## Validation rules

- Every `F-001` to `F-066` must map to at least one binding subphase.
- Every `N-001` to `N-010` must map to at least one binding subphase.
- No blocker may be considered closed only because one of several mapped subphases is done; the blocker is closed only when the final roadmap gate for the affected capability is green.
- If the final roadmap changes phase placement, this matrix must be updated in the same commit.

## Binding blockers imported into Appendix A

| ID | Binding source | Short title | Target subphases |
| --- | --- | --- | --- |
| F-001 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Fyra olika `roundMoney`-familjer ger olika pengar i olika domäner | 1.1 |
| F-002 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | `normalizeMoney` betyder olika saker i olika domäner | 1.1 |
| F-003 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | DSAM-kontoplanen har systematiskt felklassade BAS-klasser | 7.3 |
| F-004 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | AR utfärdar fakturor utan att skapa spårbara `VatDecision`-objekt | 8.1, 8.3 |
| F-005 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Inhemsk AP-VAT beräknas som förslag men skapar ingen persisted VAT-sanning | 8.2, 8.3 |
| F-006 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Payroll saknar skattetabellsmotor och A-SINK; ordinary tax är fortfarande manuell procentsats | 11.1 |
| F-007 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | `EXPENSE_REIMBURSEMENT` behandlas som skattepliktig bruttolön och avgiftsunderlag | 11.3 |
| F-008 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | HUS-domänen saknar helt ledgerbrygga för claim, acceptance, partial acceptance och recovery | 12.2 |
| F-009 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | HUS-rulepacket för 2025 har fel ROT-sats från årets början | 5.1, 12.1 |
| F-010 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | HUS använder `laborCostAmount` direkt utan att definiera om beloppet är inklusive eller exklusive moms | 12.1 |
| F-011 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Ledger lagrar utländsk valuta men bokför inte om till SEK | 7.4 |
| F-012 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Endast 13 domäner ligger bakom API:ets kritiska durable-persistence-wrapper | 2.1 |
| F-013 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Persistence-proxyn muterar först och persisterar sedan; misslyckad save lämnar systemet split-brain | 2.2 |
| F-014 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Generisk cutover-rollback är bara metadata, inte faktisk dataåterställning | 16.4, 16.5 |
| F-015 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | TOTP-hemligheter exporteras durably i klartext | 3.2, 6.1 |
| F-016 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Login och TOTP saknar rate limiting och lockout | 3.4, 6.6 |
| F-017 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Årsredovisningssignering godkänner "någon tillåten roll" i stället för full signatory chain | 12.4 |
| F-018 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Kontantmetodens year-end catch-up summerar bara poster och bokför inget | 7.5 |
| F-019 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | SIE-export saknas helt | 7.6, 16.2 |
| F-020 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Payroll klipper negativ nettolön till noll i postings utan motfordran på anställd | 11.5 |
| F-021 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Manuella verifikationer och soft-lock override saknar verklig dual control | 4.5, 7.2 |
| F-022 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Verifikationsnummer förbrukas före postning och verifikationstext är frivillig | 7.2 |
| F-023 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Öppningsbalans och resultatöverföring saknar faktisk motor | 7.5 |
| F-024 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Avskrivningsmotor saknas trots dokumenterad design och source types | 7.6 |
| F-025 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Periodiseringsmotor saknas trots att domänen låtsas stödja den | 7.6 |
| F-026 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Momsavstämning/nollställning av 2610–2640 mot 2650 saknas | 7.6, 8.3 |
| F-027 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | VAT-domänen klassar Grekland fel när indata använder `GR` | 1.5, 8.3 |
| F-028 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | VAT-scenariomotorn ignorerar viktiga undantag och gör ingen VIES-validering | 8.3, 15.3 |
| F-029 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Skattekontot har felklassificerad `REFUND` och omappad `MANUAL_ADJUSTMENT` | 8.5 |
| F-030 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | AGI-summeringen saknar arbetsgivarsidans avgiftsbelopp på aggregatnivå | 11.6, 12.3 |
| F-031 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Sjuklön och karens finns som lönearter men inte som automatisk svensk beräkning | 10.2, 11.4 |
| F-032 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Semesterberäkning och semesterskuld följer inte Semesterlagen | 10.3, 11.4 |
| F-033 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | AP saknar logik för F-skatt/A-skatt-konsekvenser vid ersättning för arbete | 8.2 |
| F-034 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | AR:s fakturakravskontroll saknar säljaruppgifter som lagen kräver | 8.1 |
| F-035 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Annual reporting kräver hard close men skapar inga bokslutsverifikationer och saknar K2/K3-logik | 7.7, 12.4 |
| F-036 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Reporting genererar snapshots över öppna perioder utan enforcement och rundar löpande | 14.1 |
| F-037 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Payroll hämtar kollektivavtalsoverlay men använder det inte för OB/Jour/Beredskap/Övertid | 10.4, 11.7 |
| F-038 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Organisationsnummer valideras inte med kontrollsiffra | 1.5, 6.3 |
| F-039 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | API-gatewayn saknar body-storleksgräns och exponerar råa felmeddelanden | 3.4, 4.4 |
| F-040 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | API-svar saknar centrala HTTP-säkerhetshuvuden | 3.4 |
| F-041 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Worker kan lämna jobb i claimed/okänt tillstånd vid tidigt fel | 2.4, 17.2 |
| F-042 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Payroll använder konto 1930 som default fast kontot inte finns i ledgerns DSAM | 7.3, 11.6 |
| F-043 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | A-SINK saknas helt i payroll trots att regelverket finns 2026 | 11.1 |
| F-044 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Växa-stöd är inte modellerat som 2026 års verkliga återbetalningsflöde | 8.5, 11.2 |
| F-045 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | `copy`/`clone` är duplicerat och semantiskt inkonsekvent i många domäner | 1.2 |
| F-046 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | `roundMoney` i AP, field och document-engine kan ge NaN på `undefined` | 1.1, 1.2 |
| F-047 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | HR tillåter överlappande anställningar | 10.1 |
| F-048 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | HUS validerar bara längd på personnummer, inte checksumma eller datum | 1.5, 12.1 |
| F-049 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Snapshot-import tappar nya nycklar som inte redan finns i target state | 2.3 |
| F-050 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Travel-utlägg saknar momshantering på kvittonivå | 8.3, 11.3 |
| F-051 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Travel har svag tidszonshantering för traktamente och resdagar | 11.3 |
| F-052 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Banking bokar AP-disbursements via AP, men generella bankhändelser saknar ledgerbrygga | 8.4 |
| F-053 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Tax account saknar faktisk ledger-spegel | 8.5 |
| F-054 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Projects räknar WIP men bokför det inte | 13.2 |
| F-055 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | `issueInvoice` har en svag state machine och litar på `journalEntryId` som spärr | 8.1 |
| F-056 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | AP:s inhemska VAT-path strider mot systemets egen compliance-modell även när beloppen blir "rimliga" | 8.2, 8.3 |
| F-057 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Testsviten är inte hermetisk och delar är direkt miljöbundna | 17.5, 18.2 |
| F-058 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Flera 2026-värden är hårdkodade i benefits och travel och kräver årlig governance | 5.1, 5.3 |
| F-059 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Accounting-method-dokumentet beskriver en central timing-sanning som inte används konsekvent av AR/AP/VAT/ledger | 7.5, 8.6 |
| F-060 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Sessionslagning sker linjärt över alla sessioner | 6.2, 6.6 |
| F-061 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Behörighetsmodellen är grov i baslagret även om route-tester mildrar det | 4.5, 17.3 |
| F-062 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | `hardCloseChecklist` attribuerar ledger-lock till skaparen, inte till faktisk slutattestant | 7.7 |
| F-063 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Kontoplanen är hårdkodad i källkod i stället för externt versionerad | 1.3, 7.3 |
| F-064 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Kloningshjälpare är duplicerade över repoet och driver framtida driftfel | 1.2 |
| F-065 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Testerna missar de viktigaste regulatoriska end-to-end-kedjorna | 17.5, 18.2 |
| F-066 | `GO_LIVE_ROADMAP_FINAL.md` Appendix A | Runtime-persistens använder namnheurstik för read-vs-write i stället för explicit semantik | 2.2, 4.3 |

## Mandatory new build items imported into Appendix B

| ID | Binding source | Must build | Target subphases |
| --- | --- | --- | --- |
| N-001 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Bank-grade security architecture med explicit krypterings-/hash-/tokeniseringsmatris och KMS/HSM-rotation | 3.1-3.6 |
| N-002 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | `packages/domain-owner-distributions/src/index.mjs` för aktieutdelning, KU31 och kupongskatt | 12.5 |
| N-003 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | `packages/domain-sie/src/index.mjs` för SIE4 import/export | 7.6, 16.2 |
| N-004 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Corporate tax / Inkomstdeklaration 2-pack med current-tax computation, declarations och evidence | 12.4 |
| N-005 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Generell migration engine för API/SIE4/CSV/bureau handoff med discovery, mapping, diff, rollback och promotion | 16.1-16.6 |
| N-006 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Trial/live kryptografisk och operationell totalisolering samt icke-in-place promotion | 6.4, 15.5, 16.5 |
| N-007 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Unified operational cockpits: tax account, submissions, migration, payroll exceptions, profitability | 14.4 |
| N-008 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Bureau portfolio mode med templates, cohort dashboards och delegated approvals | 16.6, 17.1 |
| N-009 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Official value publication pipeline med golden vectors och rollback | 5.3 |
| N-010 | `GO_LIVE_ROADMAP_FINAL.md` Appendix B | Canonical value kernel för Money/Rate/Quantity/Fx och clone-semantik | 1.1-1.2 |

## Coverage verdict

- `66` blocker findings are mapped.
- `10` mandatory new build items are mapped.
- No row in this matrix is allowed to be orphaned from a subphase.
- Phase `0.3` is only complete when this matrix and the appendix tables in the final roadmap agree.
