> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ANALYSIS_TRACEABILITY_MATRIX

Status: Stöddokument för fas 0.4.  
Detta dokument är inte primär sanning. Det finns för att bevisa att kritiska findings från analysdokumenten faktiskt är mappade till `GO_LIVE_ROADMAP.md`.

## Mappningsregler

- Varje rad mappar ett kritiskt analysfynd till minst en roadmapfas och en exit gate.
- Om en finding kräver både rewrite, hardening och operationsstöd ska alla berörda faser listas.
- Om en finding inte kan mappas till roadmapen är roadmapen ofullständig och får inte användas som bindande byggordning.

## Mappning från FULL_SYSTEM_ANALYSIS.md

| Analyskälla | Kritisk finding | Roadmapfaser | Exit/gate-fokus |
|---|---|---|---|
| FULL_SYSTEM_ANALYSIS | Produkten är inte ett byggprogram | 0.1, 0.2, 14, 18 | produktkategori, benchmark, general project core |
| FULL_SYSTEM_ANALYSIS | Runtime/bootstrap/migrationsanning är otillräcklig | 1, 2 | runtime mode, migration repair, durable truth |
| FULL_SYSTEM_ANALYSIS | In-memory truth blockerar live | 2 | persistent stores, outbox, replay |
| FULL_SYSTEM_ANALYSIS | Audit/evidence/restore är inte tillräckligt härdat | 3 | evidence packs, restore drills, secret governance |
| FULL_SYSTEM_ANALYSIS | Blandade routefamiljer och inkonsekventa kontrakt | 4 | canonical routes, envelopes, error model |
| FULL_SYSTEM_ANALYSIS | Rulepacks/baselines måste versioneras hårdare | 5 | registry, publication, historical pinning |
| FULL_SYSTEM_ANALYSIS | Stark auth/federation/backoffice är inte verkligt klart | 6, 16, 17 | auth broker, impersonation, provider/adapters |
| FULL_SYSTEM_ANALYSIS | Tenant setup/trial/live boundary saknas | 7, 17, 18 | bootstrap, trial isolation, promotion |
| FULL_SYSTEM_ANALYSIS | Ledger/legal form/fiscal locks måste bära hela finance core | 8 | accounting correctness, close gates |
| FULL_SYSTEM_ANALYSIS | Banking/VAT/tax-account reconciliation blockerar live | 9 | bank, VAT, tax account, reconciliation |
| FULL_SYSTEM_ANALYSIS | OCR/document runtime är fortfarande för syntetisk | 10, 16 | OCR provider, review path, adapter reality |
| FULL_SYSTEM_ANALYSIS | HR/time/agreements är inte färdigt nog för payroll | 11 | canonical payroll inputs |
| FULL_SYSTEM_ANALYSIS | Payroll har `manual_rate` och saknar full Kronofogden-kedja | 12 | payroll correctness, garnishment, AGI |
| FULL_SYSTEM_ANALYSIS | HUS/submissions/receipts/recovery måste bli verkliga | 13, 16, 17 | live transports, receipts, operator flows |
| FULL_SYSTEM_ANALYSIS | Projects måste vara generell core, inte bygg-first | 14 | general project core, vertical packs |
| FULL_SYSTEM_ANALYSIS | Search/workbench/object profiles är verklig backendkapital | 15, 18 | operator contracts, UI-readiness freeze |
| FULL_SYSTEM_ANALYSIS | Partner/public API/webhooks behöver verklig adapterverklighet | 16 | API, webhooks, contract tests, providers |
| FULL_SYSTEM_ANALYSIS | Cutover/migration/support/replay måste bli förstaklassigt | 17 | cockpit, rollback, diff, concierge |
| FULL_SYSTEM_ANALYSIS | Go-live kräver pilot/parity/advantage gates | 18 | pilot cohorts, parity board, advantage pack |

## Mappning från LEGACY_AND_REALITY_RECONCILIATION.md

| Analyskälla | Kritisk finding | Roadmapfaser | Exit/gate-fokus |
|---|---|---|---|
| LEGACY_AND_REALITY_RECONCILIATION | Byggcentrisk produktdefinition är fel | 0.1, 0.2 | governance reset |
| LEGACY_AND_REALITY_RECONCILIATION | Phase-etiketter är inte mognadssanning | 0.5 | stop-regler |
| LEGACY_AND_REALITY_RECONCILIATION | Worker är inte bara noop men måste ändå hårdnas vidare | 2, 17 | job runtime, operator replay |
| LEGACY_AND_REALITY_RECONCILIATION | Webhooks är inte fejk men behöver kanonisk adapterverklighet | 4, 16 | payloads, signing, retries, provider reality |
| LEGACY_AND_REALITY_RECONCILIATION | Payroll är fortfarande regulatoriskt ofullständig | 11, 12 | inputs, payroll rulepacks, garnishment |
| LEGACY_AND_REALITY_RECONCILIATION | Desktop/field shells får inte misstas för färdig produkt | 0.5, 18 | maturity gate |
| LEGACY_AND_REALITY_RECONCILIATION | Public/partner/automation routes är för sammanslagna | 4, 16 | route split, API boundaries |
| LEGACY_AND_REALITY_RECONCILIATION | Phase14-routes blandar högriskområden | 4 | route catalog rewrite |
| LEGACY_AND_REALITY_RECONCILIATION | BankID strong-auth-objekt betyder inte live provider | 6, 16 | auth broker, provider adapters |
| LEGACY_AND_REALITY_RECONCILIATION | OCR-ytor betyder inte verklig providerkedja | 10, 16 | OCR adapter replacement |
| LEGACY_AND_REALITY_RECONCILIATION | Submission transport/receipt är fortfarande syntetisk i delar | 13, 16, 17 | live transport, receipts, ops |
| LEGACY_AND_REALITY_RECONCILIATION | Partnerintegrationsstacken är delvis syntetisk | 16 | contract tests, adapter health |
| LEGACY_AND_REALITY_RECONCILIATION | Migrationslagret är inte självklar driftgrund | 1, 17 | migration repair, cutover drills |
| LEGACY_AND_REALITY_RECONCILIATION | Search/workbench är verkligt plattformsvärde | 15, 18 | operator-first backend contracts |
| LEGACY_AND_REALITY_RECONCILIATION | Routes/tests är större än live-space | 0.5, 18 | maturity stop rules, parity gates |

## Mappning från COMPETITOR_AND_MARKET_REALITY.md

| Analyskälla | Kritisk finding | Roadmapfaser | Exit/gate-fokus |
|---|---|---|---|
| COMPETITOR_AND_MARKET_REALITY | Kärnbenchmark är Fortnox/Visma/Bokio/Wint/Björn Lunden | 0.2, 18.3 | benchmark lock, parity board |
| COMPETITOR_AND_MARKET_REALITY | Onboarding/trial måste vara säljbar och säker | 7, 17, 18.4 | trial-to-live, sales readiness |
| COMPETITOR_AND_MARKET_REALITY | Migration concierge är en winning move | 17.6, 18.4 | cutover concierge |
| COMPETITOR_AND_MARKET_REALITY | Unified receipts/recovery cockpit är premiumfördel | 13, 17, 18.4 | regulated ops |
| COMPETITOR_AND_MARKET_REALITY | Tax account cockpit är stark differentiator | 9, 15, 18.4 | tax account visibility, mission control |
| COMPETITOR_AND_MARKET_REALITY | Project profitability mission control krävs för att vinna bredare ops-marknad | 14.3, 15.5, 18.4 | profitability and operator dashboards |
| COMPETITOR_AND_MARKET_REALITY | Public sandbox/API/webhooks behövs för ekosystemparitet | 15, 16, 18.3 | sandbox catalog, webhooks, partner API |
| COMPETITOR_AND_MARKET_REALITY | Bygg/field-aktörer är vertikal benchmark, inte produktidentitet | 0.1, 14, 18.3 | vertical pack, non-construction-first |

## Coverage verdict

- Alla stora findings från de tre analysdokumenten är mappade till roadmapfaser.
- Ingen kritisk finding ska behandlas som slutförd innan motsvarande roadmapfas och exit gate är gröna.

