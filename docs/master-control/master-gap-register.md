> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-002
- Title: Master Gap Register
- Status: Binding control baseline
- Owner: Product architecture, compliance architecture and engineering control
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master gap register. Replaces all informal gap lists in earlier analyses.
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-ui-reset-spec.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-policy-matrix.md
  - docs/master-control/master-document-manifest.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - all domains listed in MCP-001, with special emphasis on documents, ledger, VAT, payroll, HUS, projects, personalliggare, annual reporting, integrations and UI surfaces
- Related code areas:
  - apps/api
  - apps/desktop-web
  - apps/field-mobile
  - apps/worker
  - packages/db
  - packages/rule-engine
  - packages/document-engine
  - packages/domain-*
  - packages/ui-core
  - packages/ui-desktop
  - packages/ui-mobile
  - tests/*
- Related future documents:
  - all documents listed in MCP-001 under related future documents
  - all future documents that will be enumerated in `docs/master-control/master-document-manifest.md`

# Purpose

Detta dokument är det bindande gap-registret för hela omtaget.

Det ska användas för att:

- skilja mellan dokumenterat stöd, kodstöd och verklig runtime-mognad
- visa exakt vad som saknas
- visa varför luckan är farlig
- visa vilket slutläge som krävs
- peka ut vilken ny motor, policy eller UI-ombyggnad som behövs
- koppla varje gap till framtida dokument och kodområden
- förhindra att Codex bygger vidare på falskt färdiga antaganden

# How to read the register

## Stödskalor

### Documented support
- **None**: ingen relevant bindande dokumentation
- **Mentioned**: ämnet nämns men saknar styrande detalj
- **Detailed**: ämnet har tydligt dokument eller tydlig ADR
- **Broad**: flera styrande dokument finns

### Code support
- **None**: ingen relevant kod
- **Schema only**: migrationer eller tabeller finns men ingen verklig domänmotor
- **Thin runtime**: API-rutt, shell eller enkel implementation finns
- **Partial domain code**: domänlogik finns för delmängder
- **Broad domain code**: tydlig domänkod och tester finns, men inte nödvändigtvis driftmogen runtime

### Robust runtime support
- **None**: inte driftbart
- **Thin**: går att demonstrera men saknar verklig hårdning
- **Moderate**: flera delar fungerar men saknar ännu centrala skydd eller orkestrering
- **Strong**: går att betrakta som robust byggbas
- **Pilot-ready**: används först när verklig persistence, drift, operatörsstöd och recovery är fullbordade

I detta repo är nästan inget område pilot-ready.

## Registerlogik

Varje rad ska läsas så här:

- vad som finns nu
- vad det räcker till
- vad det inte räcker till
- varför gapet är farligt
- vilket slutläge som krävs
- vilken ny motor, policy eller UI-ombyggnad som behövs
- vilka dokument och kodområden som måste beröras

## Tvingande tolkningsregel

Om en rad visar:

- broad documented support
- broad code support
- thin runtime support

då ska Codex behandla området som ofärdigt.

# Gap taxonomy

- **G-ENG**: saknad eller otillräcklig motor
- **G-RUN**: saknad runtime-härdning
- **G-UI**: otillräcklig eller felriktad UI-yta
- **G-CPL**: compliance-lucka
- **G-DOM**: saknad eller felaktig domängräns
- **G-POL**: saknad policy
- **G-DOC**: saknad styrdokumentation
- **G-TST**: saknad golden-scenario- eller testtäckning
- **G-MIG**: saknat migreringsstöd
- **G-FF**: falskt färdigt område

# Full gap inventory table

| Gap ID | Area | Current repo reality | Documented support | Code support | Robust runtime support | Missing capability | Why it is dangerous | Required end-state | Required new engine or extension | Required future document | Required code areas | Dependency notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GAP-001 | Enterprise auth broker, device trust and step-up UX | Stark auth-strategi i ADR-0009 och fasstöd i phase1. API-rutter finns för login, TOTP, passkeys, BankID och onboarding. Produktupplevelsen är fortfarande tunn. | Broad | Partial domain code | Thin | Full session- och device-trust-modell, step-up challenge center, support-scope, enterprise onboarding och tydlig tenant-aware auth UX | Högriskåtgärder kan inte lämnas till tunn auth-upplevelse utan tydlig stark-auth-kedja och kontroll av session/device | Full identity broker med passkeys, TOTP, SSO, BankID-step-up, device trust, challenge center och auditerad support-impersonation | Extension of auth broker and enterprise auth surface | docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md<br>docs/policies/support-access-and-impersonation-policy.md<br>docs/policies/security-admin-and-incident-policy.md | packages/auth-core<br>packages/domain-org-auth<br>apps/api<br>apps/desktop-web<br>backoffice-ytor | Bygger på ADR-0009 och måste vara klar innan slutlig auth-UI |
| GAP-002 | Public site and trust architecture | MASTER_BUILD_PLAN säger uttryckligen att marknadswebb inte ligger där. Ingen färdig premium public-web finns. | Mentioned | Thin runtime | None | Full publik informationsarkitektur, positionering, trust-berättelse, segmentering och CTA-flöden | Första intrycket blir annars demo/startup istället för enterprise-produkt | Helt ny public site med produkt-, säkerhets-, integrations- och förtroendesidor | New public-web surface | docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md<br>docs/master-control/master-ui-reset-spec.md | apps/public-web or apps/desktop-web public routes<br>packages/ui-core | Får byggas först när UI-reset är låst |
| GAP-003 | Desktop-web som full enterprise-yta | `apps/desktop-web` är en shell med några enkla entrypoints. Gammal UI-plan finns men är inte längre styrande. | Detailed but obsolete as final direction | Thin runtime | None | Slutlig IA, workbenches, objektprofiler, listvyer, preview, review center, global search, dashboards och rollarbetsytor | Hela produkten riskerar att byggas på ett för svagt UI-tänk med för många klick och för låg kontroll | Komplett ny desktop-web med rollstyrda arbetsytor och premium enterprise-design | Full rewrite of desktop-web surface | docs/master-control/master-ui-reset-spec.md<br>docs/ui/ENTERPRISE_UI_RESET.md<br>docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md | apps/desktop-web<br>packages/ui-core<br>packages/ui-desktop | Måste följa nya domänmotorer, inte tvärtom |
| GAP-004 | Field-mobile som riktig stöd-yta | `apps/field-mobile` är en shell som visar ambition, inte färdig produkt. | Detailed at strategy level | Thin runtime | None | Offline-synk, konfliktmodell, riktiga jobbflöden, material, check-in, bilder, signatur och begränsade reviewflöden | Mobil yta utan konflikt- och offline-modell ger datakorruption och dåligt fältstöd | Full field-mobile byggd ovanpå färdiga API-kontrakt och explicit offline policy | Rewrite of field-mobile surface with offline model | docs/ui/FIELD_MOBILE_SPEC.md<br>docs/domain/offline-sync-and-conflict-resolution.md | apps/field-mobile<br>apps/api<br>packages/ui-mobile<br>domain-field<br>domain-personalliggare | Beroende av projects, personalliggare, work orders och offline-motor |
| GAP-005 | Backoffice som egen produkt | ADR-0021 finns. Någon full backoffice-yta finns inte. | Detailed | Partial domain code | None | Audit explorer, replay, support cases, impersonation, access review, feature flags och tenant-diagnostics som egna arbetsytor | Utan detta blir support, drift och incidenthantering beroende av ad hoc-ingrepp | Egen backoffice-surface med policybunden åtkomst och full audit | New backoffice surface | docs/domain/audit-review-support-and-admin-backoffice.md<br>docs/policies/support-access-and-impersonation-policy.md | apps/backoffice or desktop backoffice section<br>domain-core<br>domain-org-auth | Bygger på säkerhetspolicy och worker/replay-runtime |
| GAP-006 | Worker/job runtime | `apps/worker` är i praktiken en heartbeat. ADR-0015 och runbooks finns. | Broad | Thin runtime | None | Persistent jobs, attempts, timeout, dead-letter, replay, correlation och idempotent scheduling | Alla asynkrona kärnflöden blir sköra eller falskt färdiga utan riktig jobbmodell | Full persistent job runtime för OCR, index, submissions, notiser, export, replay och recovery | New persistent job engine | docs/domain/async-jobs-retry-replay-and-dead-letter.md<br>docs/runbooks/async-job-retry-replay-and-dead-letter.md | apps/worker<br>apps/api<br>packages/domain-core<br>packages/db | Måste byggas tidigt före UI-omtag som beror på bakgrundsarbete |
| GAP-007 | Dokumentinbox, arkiv och OCR | Starkt dokumenterat och tydligt modellerat. Dokument, OCR-runs, review tasks och länkar finns som bas. | Broad | Broad domain code | Moderate | Starkare production-hardening, fler fail queues, bättre review center-koppling och bättre persistence/queue integration | Om intakekedjan fallerar tappar systemet råunderlag och audit | Behåll dokumentmotorn men koppla den till persistent job runtime, unified review center och bättre operationsstöd | Extension of document engine and operations | docs/compliance/se/document-inbox-and-ocr-engine.md<br>docs/domain/review-center.md | packages/document-engine<br>packages/domain-documents<br>apps/api<br>apps/worker | Basmotor finns men måste kopplas till GAP-006 och GAP-028 |
| GAP-008 | Person-linked document classification | Repo:t kopplar dokument till domäner men saknar full kedja för dokument -> person -> behandling -> payroll/AGI/bokföring | Mentioned in fragments across docs | Thin runtime | None | Klassning av privat köp, utlägg, förmån, nettolöneavdrag, friskvård, tillgång, importdel och blandfall per dokumentdel | Detta är ett av de farligaste gapen eftersom felklassning ger fel bokföring, fel lön och fel skatt | Ny motor med split, personlänk, policy, review, payroll intent och auditkedja | New person-linked document classification engine | docs/compliance/se/person-linked-document-classification-engine.md | packages/document-engine<br>packages/domain-documents<br>packages/domain-benefits<br>packages/domain-payroll<br>packages/domain-ledger<br>packages/db<br>apps/api | Beroende av work items, AI policy och payroll-motor |
| GAP-009 | Cash card, employee outlays and private spend finalization | `cash-card-and-clearing-engine.md` är bra som grund. Kodstöd finns delvis via benefits/travel/docs/banking, men inte hela slutkedjan till payroll och recovery. | Detailed | Partial domain code | Thin | Full end-to-end settlement från företagskort till privatfordran, nettolöneavdrag eller förmån med tydliga state machines | Privata köp riskerar att hamna som kostnad eller lämnas oavslutade | Full card/outlay/private-spend chain med slutlig policy- och payrollkoppling | Extension of cash/card engine plus person-linked classification | docs/compliance/se/person-linked-document-classification-engine.md<br>docs/policies/document-review-and-economic-decision-policy.md | domain-banking<br>domain-benefits<br>domain-payroll<br>document-engine | Hänger ihop med GAP-008 och GAP-017 |
| GAP-010 | Import case with later customs and spedition | Moms- och AP-dokumentationen täcker importdelar, men ingen full import-case-motor har verifierats | Mentioned | Schema only to partial | None | Flerdokumentscase för inköpsfaktura, tull, importmoms, frakt, spedition och senare avgifter | Importer blir lätt fel i moms, kostnadsfördelning och periodisering om varje dokument bokas isolerat | Eget import-case-bounded context med case state, länkar och reviewkrav | New import-case engine | docs/compliance/se/import-case-engine.md | domain-ap<br>domain-vat<br>document-engine<br>domain-ledger<br>packages/db | Beroende av person-linked documents och VAT review |
| GAP-011 | Ledger core | Stark dokumentation, stark migrationsbas och stark domänkod. | Broad | Broad domain code | Strong as domain base, not pilot-ready runtime | Full integration med accounting method, fiscal year, tax account, flexible series och broader correction policies | Ledgern är kärnan; kvarvarande luckor skadar hela produkten | Reuse and extend ledger as canonical accounting source | Extension of existing ledger engine | docs/compliance/se/accounting-foundation.md | domain-ledger<br>packages/db<br>apps/api | Är beroende för många andra gap men behöver själv GAP-012, GAP-013 och GAP-024 |
| GAP-012 | Verification series and numbering flexibility | Accounting foundation seedar A-Z-serier. Det räcker inte som slutlig tenant-flexibilitet. | Detailed | Partial domain code | Thin to Moderate | Tenantstyrda verifikationsserier, importbevarande, policy, spärrar och invoice-series-frihet | Hårdkodade serier blockerar migrering och verkliga kundupplägg | Konfigurerbara men kontrollerade journal- och fakturaserier | Extension of ledger and invoice numbering | docs/compliance/se/accounting-foundation.md<br>docs/policies/invoice-issuance-and-credit-policy.md | domain-ledger<br>domain-ar<br>packages/db | Ska byggas tidigt före migrering och AR/AP-fördjupning |
| GAP-013 | Accounting method: kontantmetod/faktureringsmetod | Ingen dedikerad motor hittad. Projektdokument använder ordet faktureringsmetod i annan betydelse. | None as dedicated engine | None | None | Company-level accounting method, posting timing, VAT timing, year-end treatment, method-change controls | Felaktig metod ger fel moms och fel resultat över hela året | Egen compliance-motor för accounting method | New accounting-method engine | docs/compliance/se/accounting-method-engine.md | domain-ledger<br>domain-ar<br>domain-ap<br>domain-vat<br>packages/db<br>apps/api | Kräver rulepacks och fiscal-year-integration |
| GAP-014 | Fiscal year and period engine, including brutet räkenskapsår | Periodhantering finns i ledger, men inget fullständigt explicit fiscal-year-engine har verifierats | Mentioned to partial | Partial domain code | Thin | Explicit fiscal year object, short/extended year, broken year, reporting calendar, period generation, change flow | Kalenderårsantaganden riskerar att ligga dolda i close, rapport och deklaration | Egen motor för fiscal year, periods, locks och change control | New fiscal-year-and-period engine | docs/compliance/se/fiscal-year-and-period-engine.md | domain-ledger<br>domain-reporting<br>domain-annual-reporting<br>domain-vat<br>packages/db | Måste byggas före annual reporting-hardening |
| GAP-015 | VAT engine hardening | VAT-dokumentation och kod är en styrka. Review queue, declaration runs och rule packs finns som bas. | Broad | Broad domain code | Moderate | Fler edge-case-rulepacks, starkare unsupported/review flows, import-case integration, credit-note mirror logic och UI gates | Momsfel ger direkt skattemässig risk | Behåll och skärp momsmotorn, inte skriv om från noll | Extension of existing VAT engine | docs/compliance/se/vat-engine.md | domain-vat<br>domain-ledger<br>domain-ar<br>domain-ap | Beroende av GAP-010, GAP-013, GAP-014 |
| GAP-016 | AR invoice legal-field gating | AR är starkt dokumenterat och delvis välkodat men saknar verifierad full invoice scenario-gating för EU, export, HUS, omvänd moms, kreditkedjor | Detailed | Broad domain code | Thin to Moderate | Objekts- och scenariofältsmotor som blockerar issue vid saknade obligatoriska uppgifter | Felaktigt utfärdade fakturor ger skatte- och betalningsproblem | Full invoice field rules engine och issue-gates | New invoice legal field rules engine | docs/compliance/se/ar-customer-invoicing-engine.md<br>docs/compliance/se/hus-invoice-and-claim-gates.md | domain-ar<br>domain-vat<br>domain-hus<br>apps/api | Måste vara klar före slutlig billing-UI |
| GAP-017 | Quotes, contracts and order conversion | Quotes, contracts och invoices finns som bas i AR, men inte som full sammanhängande offert-order-projekt-kedja | Detailed | Partial to broad | Thin | Versionslåst offert med acceptans, kundvy, orderkonvertering, projektkoppling och HUS-preview | Annars blir försäljning, order och projekt löst kopplade | Full quote/order/product chain | Extension of AR and project boundaries | docs/domain/kalkyl.md<br>docs/compliance/se/ar-customer-invoicing-engine.md | domain-ar<br>domain-projects<br>apps/api<br>desktop-web | Beroende av kalkyl- och project-workspace |
| GAP-018 | AP operational completeness | AP-dokumentation är god och kod finns. Runtime saknar dock full import-case, personpåverkan, operatörsyta och verklig betalningsorkestrering | Detailed | Broad domain code | Moderate | Full AP workbench, import-case, invoice variance handling, stronger approval chains och payments operations | Leverantörsflöden blir annars tekniskt täckta men operativt svaga | Bevara AP-kärnan och bygg operativ produkt runt den | Extension of AP engine and workbench | docs/compliance/se/ap-supplier-invoice-engine.md | domain-ap<br>domain-banking<br>document-engine<br>desktop-web | Beroende av GAP-006, GAP-010, GAP-028 |
| GAP-019 | Bank, payments and settlement runtime | Bankstrategi finns och domän finns, men verklig adaptermognad, tax account-koppling och operatörsstöd är tunn | Detailed | Partial domain code | Thin | Payment order lifecycle, bank returns, failure queues, tax account matchning, payout recovery och ops | Pengarörelser kan inte bygga på delvis demonstrerad runtime | Full bank/payment runtime med receipt chains, return logic och reconciliation workbench | Extension of banking engine plus tax account engine | docs/compliance/se/bank-and-payments-engine.md<br>docs/compliance/se/tax-account-and-offset-engine.md | domain-banking<br>domain-ledger<br>domain-integrations | Beroende av GAP-024 och GAP-036 |
| GAP-020 | Tax account and offset engine | Kontoplanen har skattekontospegling. Ingen full skattekonto-subledger eller verklig kvittningsmotor har verifierats | Mentioned | Thin runtime | None | Import/matchning av skattekontohändelser, kvittning, återbetalning, avgifter, ränta och differenskö | Skattebilden blir annars splittrad mellan moms, AGI, inkomstskatt och bank | Full tax account engine | New tax-account-and-offset engine | docs/compliance/se/tax-account-and-offset-engine.md | domain-ledger<br>domain-banking<br>domain-vat<br>domain-payroll<br>packages/db | Måste finnas före full close och skattekontroll |
| GAP-021 | Payroll core completion | Payroll-domänen har ovanligt mycket grund: pay items, runs, AGI states, posting preview, payout batches | Broad | Broad domain code | Moderate | Fler verkliga svenska driftfall, bättre exceptions, bättre review center-koppling, mer robust payout/rejection chain | Lön får inte överskattas bara för att kärnan är bred | Behåll kärnan men skärp operativ arbetsyta och driftkedja | Extension of payroll engine | docs/compliance/se/payroll-engine.md | domain-payroll<br>domain-ledger<br>domain-banking<br>desktop-web | Hänger ihop med GAP-022, GAP-023, GAP-024 |
| GAP-022 | Payroll migration engine | Migration-cockpit nämns sent i repo:t men full lönemigreringsmotor för saldon, YTD, diffkontroll och cutover är inte tillräckligt låst | Mentioned to partial | Thin runtime | None | Import av historik, YTD, tidigare AGI-underlag, diff, mapping, signoff och rollback | Utan detta går verklig löneövergång inte säkert att göra | Egen payroll migration engine | New payroll-migration engine | docs/compliance/se/payroll-migration-and-balances-engine.md<br>docs/runbooks/payroll-migration-cutover.md | domain-payroll<br>domain-hr<br>packages/db<br>backoffice | Måste byggas före verklig pilot på lön |
| GAP-023 | Generic balances engine | Tid, frånvaro och payroll finns, men en generisk motor för semester, sparade dagar, komp, flex, ATF, AB och andra banker saknas som uttrycklig motor | Mentioned in parts | Partial domain code | Thin | Balance types, earning, spending, carry-forward, expiration, corrections och audit | Saldon blir annars hårdkodade och svåra att migrera eller avtalsstyra | Egen generic balances engine | New balances engine | docs/compliance/se/payroll-migration-and-balances-engine.md | domain-payroll<br>domain-time<br>domain-hr<br>packages/db | Beroende av GAP-022 och GAP-024 |
| GAP-024 | Collective agreements engine | Repo:t har löne- och tidstruktur, men ingen full explicit avtalsmotor med versioner och regelpaket för olika avtal | Mentioned | None to thin | None | Agreement families, effective dating, overrides, overtime, OB, vacation, banks and rounding rules | Svensk löneverklighet kan inte hanteras robust utan detta | Egen collective agreements engine | New collective-agreements engine | docs/compliance/se/collective-agreements-engine.md | domain-payroll<br>domain-time<br>domain-hr<br>rule-engine | Måste byggas före avancerad lönepilot |
| GAP-025 | Benefits and document/person/payroll bridge | Benefits-motorn finns och dokumentation finns, men full intake från dokument/personpolicy till payroll/AGI är otillräcklig | Detailed | Partial domain code | Thin | Slutlig kedja för friskvård, gåvor, kost, bil, drivmedel, nettolöneavdrag och förmånsklassning | Fel här ger direkt skatte- och AGI-fel | Full benefits bridge med policy, annual limits och payroll mapping | Extension of benefits engine plus GAP-008 | docs/compliance/se/benefits-engine.md<br>docs/policies/benefits-pension-travel-company-policy.md | domain-benefits<br>document-engine<br>domain-payroll | Kräver GAP-008, GAP-022, GAP-028 |
| GAP-026 | Projects as full workspace | Projektdomänen har budget- och kostnadsstöd men inte hela slutliga arbetsytan med order, bilder, material, HUS, egenkontroller, kalkyl och projektekonomisk styrning | Detailed | Partial domain code | Thin to Moderate | Full projektarbetsyta med memberships, budget, actuals, forecast, work orders, billing, HUS, attendance, documents och deviations | Projekt riskerar att stanna vid kodstöd utan operativ nytta | Full project workspace and control model | Major extension of project domain | docs/domain/projects-budget-wip-and-profitability.md<br>docs/domain/field-work-order-service-order-and-material-flow.md | domain-projects<br>domain-field<br>domain-hus<br>desktop-web | Beroende av payroll cost allocation, kalkyl, egenkontroller |
| GAP-027 | Project cost from payroll | Projektdomänen kan bära cost lines, men full exakt allokering från lön inklusive AG, pension, semester och förmåner är inte tillräckligt låst | Mentioned in package behavior | Partial domain code | Thin | Rebuildable payroll cost allocation with traceability per project, person and period | Projektutfall blir annars fel även om lön och tid ser rätt ut var för sig | Explicit payroll-cost allocation model | Extension across payroll and projects | docs/compliance/se/payroll-engine.md<br>docs/domain/projects-budget-wip-and-profitability.md | domain-payroll<br>domain-projects<br>domain-ledger | Kräver GAP-021, GAP-023, GAP-024 |
| GAP-028 | Review center | Review tasks finns i dokumentflöden och review queues finns i vissa domäner, men ingen full domänöverskridande review center-produkt | Detailed in fragments | Thin to partial | None | Samlad operatörsyta med ownership, queues, decisions, escalation, SLA, bulk actions och related-object context | Kritiska osäkerheter sprids annars över många små köer | Full review center domain and surface | New review-center extension over work items | docs/domain/review-center.md | domain-core<br>document-engine<br>domain-vat<br>domain-payroll<br>domain-hus<br>desktop-web | Beroende av GAP-006 och work-item architecture |
| GAP-029 | Notifications, activity feed and work items separation | ADR-0014 och domändok finns för work items, men full produktseparation mellan notiscenter, activity feed, audit log och to do-center saknas | Detailed for work items, weak for final product split | Partial domain code | None | Full taxonomy, separate objects, separate UI, delivery policies och escalation | Användaren tappar kontroll om allt blandas i en enda inbox | Full separation of notifications, activity and tasks | New notification center and activity feed modules | docs/domain/notification-center.md<br>docs/domain/activity-feed.md | domain-core<br>apps/api<br>desktop-web<br>field-mobile | Bygger på GAP-028 och GAP-006 |
| GAP-030 | Search and saved views as product | Search-strategi och saved views-dok finns. Full global-sök-produkt och objektprofil-integrering är inte färdig | Detailed | Partial domain code | Thin | Unified search UI, permission trimming, object shortcuts, saved views and operational ranking | Utan detta blir datatäta arbetsytor svåra att använda effektivt | Full productized search and saved views | Extension of search/index domain and UI | docs/domain/search-indexing-and-global-search.md<br>docs/domain/saved-views-dashboards-and-personalization.md | domain-core<br>search/index service<br>desktop-web | Beroende av nya objektprofiler och UI reset |
| GAP-031 | HUS invoice, payment, claim and recovery gating | HUS-domänen och ROT/RUT-dokumentet är starka, men blockerande invoice/payment/claim/recovery-gates som full produkt är inte tillräckligt hårda | Broad | Broad domain code | Moderate | Full HUS gates, field validations, partial acceptance, recovery, correction and customer debt handling | HUS-fel ger direkta skattekonsekvenser och kundkrav | Harden HUS domain into complete compliance chain | Extension of HUS engine | docs/compliance/se/hus-invoice-and-claim-gates.md | domain-hus<br>domain-ar<br>domain-vat<br>desktop-web | Beroende av invoice field rules and submission engine |
| GAP-032 | Personalliggare industry packs and identity graph | Dokument och kod finns, men designen är byggtung och construction site är central primitiv | Detailed for construction | Broad domain code | Moderate as construction base, none as broad product | Industry packs, site/workplace abstraction, contractor/employer snapshots, identity graph, kiosk trust and broader compliance support | För smalt stöd gör modulen oanvändbar utanför bygg eller för komplexa entreprenörskedjor | Broaden personalliggare into industry-pack engine | Extension of personalliggare domain | docs/compliance/se/personalliggare-engine.md<br>docs/domain/personalliggare-industry-packs.md | domain-personalliggare<br>domain-field<br>domain-hr<br>apps/field-mobile | Kräver new identity model and kiosk/device trust |
| GAP-033 | Egenkontroller | Ingen full modul verifierad i repo:t | None | None | None | Templates, checklist instances, photos, deviations, sign-off, project/work-order links and versioning | Projekt- och fältverksamhet saknar kritisk kvalitetsmotor | New egenkontroll module | New bounded context | docs/domain/egenkontroll.md | new domain-egenkontroll<br>domain-projects<br>domain-field<br>field-mobile | Beroende av project workspace and mobile |
| GAP-034 | Kalkylprogram | Ingen full modul verifierad i repo:t | None | None | None | Estimate versions, quantities, material, UE, risk, markups, quote links, budget links and actuals comparison | Offert, projektbudget och efterkalkyl kan inte bli sammanhängande | New estimation module | New bounded context | docs/domain/kalkyl.md | new domain-kalkyl<br>domain-ar<br>domain-projects | Måste in före full offert- och projektkedja |
| GAP-035 | Legal-form and declaration engine | Annual reporting stödjer K2/K3-spår men inte full explicit företagsformsmotor för AB, EF, HB, KB, ekonomisk förening | Mentioned to partial | Partial domain code | Thin | Legal-form-specific outputs, ownership data, declaration packaging and rule constraints | Årsslut och deklaration kan inte bli korrekta med generisk årslogik | New legal-form-and-declaration engine | docs/compliance/se/legal-form-and-declaration-engine.md | domain-annual-reporting<br>domain-ledger<br>domain-reporting | Beroende av GAP-014 |
| GAP-036 | Annual reporting, declarations and filings hardening | Domain-annual-reporting finns och har package/version/signatory/tax package-bas. Full digital inlämning och bilagelogik saknas ändå | Detailed | Broad domain code | Thin to Moderate | Complete filing adapters, signatures, declarations, receipts, corrections and evidence packs | Falsk färdighet här är särskilt farlig eftersom området ser mer komplett ut än det är | Harden annual-reporting into legal-form aware filing product | Major extension of annual reporting domain | docs/compliance/se/annual-reporting-engine.md<br>docs/runbooks/annual-close-and-filing-by-legal-form.md | domain-annual-reporting<br>domain-integrations<br>desktop-web | Kräver GAP-014 and GAP-035 |
| GAP-037 | Submission and receipt chain across all regulated flows | ADR-0017 och submissionsdokument finns. En gemensam modell finns delvis i kod via integrationsdomän, men inte allt är fullbordat för alla myndighetsflöden | Broad | Partial domain code | Thin | Full domain coverage for AGI, moms, HUS, annual filing, Peppol and corrections with replay-safe operations | Utan detta blir externa rapportflöden svårspårade och osäkra | Full shared submission service with standardized receipts and retries | Extension of integration/submission platform | docs/domain/submission-receipts-and-action-queue.md | domain-integrations<br>domain-payroll<br>domain-vat<br>domain-hus<br>domain-annual-reporting<br>apps/worker | Beroende av GAP-006 |
| GAP-038 | AI decision boundary and automation governance | Rule-engine README säger att automation aldrig får posta direkt till ledger utan review. Det saknas ändå explicit full policy- och produktgräns | Mentioned | Partial domain code | Thin | Explicit AI decision boundary, explainability, cost controls, review thresholds and tenant/module kill-switches | AI riskerar annars att uppfattas eller användas som ekonomisk beslutsmotor | Formal AI governance layer | New policy plus runtime enforcement | docs/policies/ai-decision-boundary-policy.md | rule-engine<br>document-engine<br>apps/api<br>desktop-web | Måste vara klar innan avancerad automation byggs ut |
| GAP-039 | Module activation and tenant setup | Feature flag-ADR finns, men full policy för kärna kontra valbart, tenantprofil och modulberoenden är inte uttryckligen låst | Detailed for flags, weak for tenant setup policy | Partial domain code | Thin | Core-vs-optional matrix, tenant setup wizard, irreversible flags, dependency rules and kill switches | Utan detta blir leverans, prisplaner, support och testmiljöer instabila | Formal module activation and tenant setup control | New policy and setup model | docs/policies/module-activation-and-tenant-setup-policy.md | domain-core<br>domain-org-auth<br>apps/api<br>backoffice | Beroende av backoffice and feature flag runtime |
| GAP-040 | Code/runtime observability, resilience and recovery | ADR-0012, phase14 docs och tester finns, men full verklig runtime-härdning är ännu inte etablerad | Broad | Partial domain code | Thin | End-to-end observability, backup/restore validation, queue resilience, incident repair, replay visibility | Driftbarhet kan inte antas av dokument ensam | Full hardened runtime with verified restore and replay paths | Extension of domain-core and worker runtime | docs/runbooks/backup-restore-and-disaster-recovery.md<br>docs/runbooks/incident-response-and-production-hotfix.md | apps/worker<br>apps/api<br>domain-core<br>observability stack | Måste gå parallellt med de tidigaste motorstegen |

# Hidden gaps

Följande luckor är lätta att missa eftersom repo:t har närliggande dokument eller närliggande kod som ger ett falskt intryck av täckning:

1. **Kontantmetod kontra faktureringsmetod**  
   Repo:t har AR, AP, VAT och ledger. Det betyder inte att bokföringsmetoden är modellstyrd.

2. **Brutet räkenskapsår**  
   Periodtabeller i ledger betyder inte att fiscal year-logiken är färdig.

3. **Företagsformer och deklarationspaket**  
   Annual reporting-paket och K2/K3-spår betyder inte att AB, EF, HB, KB och ekonomisk förening verkligen är separerade.

4. **Personkopplade dokument**  
   OCR, review tasks och benefits betyder inte att dokument som påverkar person, lön och skatt har en säker kedja.

5. **Skattekonto**  
   Kontoplan och clearingkonton betyder inte skattekonto-subledger eller riktig kvittningslogik.

6. **Work items kontra notiser kontra aktivitet**  
   Ett work-item-dokument betyder inte att slutlig produktmodell är separerad och operativt tydlig.

7. **Byggspecifik personalliggare**  
   En fungerande construction-site-modell betyder inte att modulen är generell.

8. **Projektkostnad från lön**  
   Projekt- och lönepaket i samma repo betyder inte att lönekostnad fördelas korrekt till projekt.

9. **UI-shells**  
   Separata desktop- och mobile-appar betyder inte att riktiga arbetsytor finns.

10. **AI-automation**  
    Ett automation- eller rule-engine-lager betyder inte att governance, cost control och decision boundary är klara.

# False-finished gaps

Följande områden ser färdigare ut än de är och ska därför markeras som falskt färdiga tills gapet faktiskt är stängt:

1. worker runtime
2. desktop-web
3. field-mobile
4. annual reporting
5. tax submission
6. HUS
7. personalliggare
8. payroll
9. project workspace
10. search
11. AI automation
12. tax account
13. review/notification model
14. auth product surface
15. public site

För vart och ett gäller samma kontrollregel:

- dokument + paket + tester räcker inte
- fullständig motor + runtime + UI + policy + runbook + test + auditkrav krävs

# Highest-risk gaps

Följande gap är de mest riskfyllda och får inte skjutas bak i praktiken även om hela planen ska byggas:

## Riskgrupp 1: direkt risk för fel bokföring, fel skatt eller fel lön
- GAP-008 Person-linked document classification
- GAP-010 Import case
- GAP-013 Accounting method
- GAP-014 Fiscal year and period
- GAP-015 VAT hardening
- GAP-021 Payroll core completion
- GAP-022 Payroll migration
- GAP-025 Benefits and document/payroll bridge
- GAP-031 HUS gates
- GAP-035 Legal-form and declaration engine
- GAP-036 Annual reporting hardening

## Riskgrupp 2: direkt risk för drift, replay och supportkollaps
- GAP-006 Worker/job runtime
- GAP-028 Review center
- GAP-029 Notifications/activity/work items separation
- GAP-040 Observability, resilience and recovery
- GAP-005 Backoffice

## Riskgrupp 3: direkt risk för att hela omtaget landar i fel produktkänsla
- GAP-002 Public site
- GAP-003 Desktop-web
- GAP-004 Field-mobile
- GAP-030 Search
- GAP-039 Module activation and tenant setup

# Exit gate

Detta gap-register är låst först när följande gäller:

- varje kritiskt område i systemet finns som egen rad eller uttrycklig del av en större rad
- varje rad anger faktisk stödnivå, inte önskad stödnivå
- varje rad pekar ut required end-state utan vaghet
- varje rad pekar ut required new engine or extension där sådan behövs
- varje rad pekar ut minst ett framtida dokument
- varje rad pekar ut konkreta kodområden
- hidden gaps och false-finished gaps är genomgångna och inga av dem är oklassade
- highest-risk gaps används som tidig styrning i build-sekvensen
- inga implementationer efter detta får beskrivas som klara om deras motsvarande gap-rad fortfarande står öppen i sak
- varje kommande Codex-arbete ska kunna mappas till minst en gap-rad i detta register

