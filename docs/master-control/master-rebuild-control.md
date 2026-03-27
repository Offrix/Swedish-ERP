> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-001
- Title: Master Rebuild Control
- Status: Binding control baseline
- Owner: Product architecture, compliance architecture and enterprise UX control
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master-control file. Replaces all prior informal rebuild notes and removes the old UI plan as controlling design authority.
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-ui-reset-spec.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-policy-matrix.md
  - docs/master-control/master-document-manifest.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - domain-core
  - domain-org-auth
  - domain-documents
  - domain-ledger
  - domain-vat
  - domain-ar
  - domain-ap
  - domain-banking
  - domain-hr
  - domain-time
  - domain-payroll
  - domain-benefits
  - domain-travel
  - domain-pension
  - domain-hus
  - domain-projects
  - domain-field
  - domain-personalliggare
  - domain-reporting
  - domain-annual-reporting
  - domain-integrations
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
- Related future documents:
  - docs/compliance/se/accounting-method-engine.md
  - docs/compliance/se/fiscal-year-and-period-engine.md
  - docs/compliance/se/legal-form-and-declaration-engine.md
  - docs/compliance/se/person-linked-document-classification-engine.md
  - docs/compliance/se/import-case-engine.md
  - docs/compliance/se/payroll-migration-and-balances-engine.md
  - docs/compliance/se/collective-agreements-engine.md
  - docs/compliance/se/tax-account-and-offset-engine.md
  - docs/compliance/se/hus-invoice-and-claim-gates.md
  - docs/policies/ai-decision-boundary-policy.md
  - docs/policies/module-activation-and-tenant-setup-policy.md
  - docs/ui/ENTERPRISE_UI_RESET.md

# Purpose

Detta dokument låser det övergripande omtaget av systemet och fungerar som högsta operativa styrning för Codex i själva ombyggnaden.

Detta dokument avgör:

- vad repo:t faktiskt är och inte är
- vad som får återanvändas
- vad som måste skrivas om
- vad som är falskt färdigt
- vilka principer som är absolut bindande
- vad Codex aldrig får anta
- vilken ambitionsnivå som gäller för produkt, compliance, runtime och UI

Detta dokument är inte ett visionspapper. Det är ett styrdokument för genomförande.

# Binding precedence

## Bindande prioritetsordning

Vid konflikt ska Codex och senare dokument följa denna ordning:

1. användarens uttryckliga krav i denna tråd
2. detta dokument och övriga dokument i `docs/master-control/`
3. bindande repo-dokumentation som fortfarande är förenlig med punkt 1 och 2, i första hand:
   - `docs/MASTER_BUILD_PLAN.md`
   - accepterade ADR:er
   - existerande compliance-dokument
   - existerande policies
   - existerande runbooks
   - existerande teststrategi
4. verifierad faktisk repo-verklighet i kod, migrationer, seeds, appar, workers och tester
5. tidigare analyser i denna tråd
6. promptbibliotek, demo-seeds, shell-kod och andra hjälpfiler

## Särskild regel för den gamla UI-planen

`docs/ui/ENTERPRISE_UI_PLAN.md` är inte längre styrande designunderlag.

Den får endast återanvändas där den uttryckligen bedöms fortsatt korrekt i `docs/master-control/master-ui-reset-spec.md`. I alla andra delar ska den behandlas som underordnad, otillräcklig eller kasserad.

## Särskild regel vid konflikt mellan dokumentation och faktisk kod

När dokumentation säger att stöd finns men verifierad kod eller runtime visar att stödet är tunt, ofullständigt eller bara stubbat ska Codex behandla den lägre verkliga stödnivån som sanningen.

Det betyder:

- dokumenterat stöd är inte samma sak som fungerande runtime
- migrationer är inte samma sak som komplett domänmotor
- API-rutter är inte samma sak som färdig produkt
- tests som kör mot in-memory-domänlogik är inte samma sak som produktionsmognad

## Särskild regel för batchstyrning

Inget senare master-control-dokument får motsäga detta dokument. Om senare dokument behöver skärpa detta dokument ska de göra det genom förtydligande, inte genom försvagning.

# Repo reality summary

## 1. Vad som är dokumenterat

Repo:t är starkt dokumenterat.

Det finns en ovanligt bred dokumentationsbas för ett system som ännu inte är live:

- en huvudplan i `docs/MASTER_BUILD_PLAN.md`
- accepterade ADR:er för domängränser, ytor, regler, auth, async-jobs, notifications, submissions, offline, search, observability, migration och backoffice
- compliance-dokument för bland annat ledger, moms, AR, AP, bank, lön, förmåner, pension, resor, HUS, personalliggare, dokumentingest och årsrapportering
- domändokument för work items, close, bureau, search, offline, reporting, submissions, backoffice och collaboration
- runbooks för hela fasprogrammet
- teststrategi och verifieringsgrindar

Dokumentationen är därför en verklig tillgång och ska återanvändas som kontrollmaterial.

## 2. Vad som är delvis kodstött

Repo:t har bred kodyta:

- domänpaket i `packages/domain-*`
- `packages/rule-engine`
- `packages/document-engine`
- ett stort migrationsspår i `packages/db/migrations`
- seed-data i `packages/db/seeds`
- API-routeyta i `apps/api`
- desktop- och mobile-shells i `apps/desktop-web` och `apps/field-mobile`
- en worker-app i `apps/worker`
- en bred testyta med unit-, integration- och e2e-tester

Detta betyder att repo:t inte är tomt eller bara designmaterial.

## 3. Vad som faktiskt verkar robust

Följande delar verkar robusta som domän- eller byggbas, men inte automatiskt som färdig driftprodukt:

- ledger-invarianten och journal/posting-modellen
- momsmotorns grundstruktur och regelpaketsidé
- AR/AP-domänernas grundstruktur
- payroll-domänens stegmodell, AGI-riktning och posting-preview-riktning
- HUS-domänens grundläggande livscykelmodell
- personalliggare-domänens grundläggande attendance- och correction-idé
- submission/receipt/action queue som tvärgående idé
- work item, deadline och blocker-idén
- migrations- och testtänket
- säkerhets- och auth-strategin på dokumentnivå
- modular monolith-tänket

## 4. Vad som saknas eller är för tunt

Följande delar saknas helt eller saknas som full produktmotor:

- accounting method engine för kontantmetod kontra faktureringsmetod
- fiscal year and period engine för brutet räkenskapsår
- legal-form-and-declaration engine för AB, EF, HB, KB och ekonomisk förening
- person-linked document classification engine
- import-case engine
- payroll migration engine
- generic balances engine
- collective agreements engine
- tax account and offset engine
- invoice legal-field gate engine
- HUS invoice and claim gates som blockerande produktlager
- personalliggare industry packs och identity graph
- egenkontrollmodul
- kalkylmodul
- full review center
- full notification center
- separat activity feed
- slutlig work item-operatörsyta
- ny public site
- ny auth- och onboardingyta
- ny desktop-web
- ny field-mobile
- nytt backoffice

## 5. Vad som är farligt överskattat

Följande områden får inte behandlas som produktionsklara:

- `apps/worker`, som i nuvarande form är en heartbeat och inte en verklig persistent job-runtime
- `apps/desktop-web`, som i nuvarande form är en shell, inte en färdig enterprise-yta
- `apps/field-mobile`, som i nuvarande form är en shell, inte en färdig field-produkt
- `apps/api`, vars routebredd är större än dess driftmognad
- annual reporting, som har dokumenterat och delvis kodat stöd men saknar full företagsforms- och deklarationsmotor
- personalliggare, som har byggnära stöd men fortfarande är för byggspecifik
- AI automation, som har struktur men inte får behandlas som självständig beslutsmotor
- tax account, som ännu inte är verklig skattekonto-integration
- HUS, som är stark i domän men ännu inte tillräckligt hård i invoice/payment/claim/recovery-gating
- projekt, som har domän men ännu inte full arbetsyta
- search, som har strategi men ännu inte full produktymning
- work items, som har stark dokumentation men ännu inte full operatörsprodukt
- auth, som har stark strategi men ännu inte full färdig produktupplevelse
- UI-planen, som uttryckligen inte längre får styra den slutliga designen

# Product north star

Systemet ska bli ett fullständigt svenskt ERP för små och medelstora bolag, redovisningsbyråer och operativa projektverksamheter där ekonomi, dokument, lön, moms, skatt, projekt, HUS, personalliggare och årsslut känns som en sammanhängande produkt och inte som löst hopkopplade moduler.

Nordstjärnan är:

- ett enda premium enterprise-system
- ett enda regelstyrt sanningslager för ekonomi och rapportering
- ett enda fullständigt desktop-webbgränssnitt för alla professionella roller
- en separat fältmobil för operativa snabba flöden
- en separat backoffice-yta för support, audit, replay och tenantstyrning
- en produkt som kan användas utan extern tolkning av kärnflöden
- en produkt där användaren känner kontroll, ansvar, spårbarhet och förtroende

Produkten ska inte kännas som:

- en AI-produkt
- en promptprodukt
- en demo
- en lös verktygslåda
- en samling moduler med olika språk och olika UX-kvalitet

# Enterprise UX north star

Den slutliga upplevelsen ska vinna på fem saker samtidigt:

1. färre klick
2. bättre automation
3. tydligare ansvarskedjor
4. bättre sammanhang mellan objekt och moduler
5. tydligt högre förtroende än typiska svenska ekonomisystem

Detta betyder konkret:

- arbete ska ske i riktiga workbenches, inte i fragmenterade modaler
- objektprofiler ska vara konsekventa över hela systemet
- sök ska vara global, snabb och rolltrimmad
- review ska vara en egen arbetstyp, inte ett sidospår
- audit, aktivitet, notiser och uppgifter ska vara separerade
- systemet ska vara datatätt och effektivt utan att vara rörigt
- field-mobile ska vara snabb och tumvänlig utan att låtsas vara full desktop
- den publika sajten ska kommunicera stabilitet, kontroll, enterprise-kvalitet och svensk expertis

# Architectural north star

Arkitekturen ska vara en modulär monolit först, med hårda bounded contexts, tydliga applikationstjänster och ett gemensamt outbox-/job-/submission-lager.

Detta innebär:

- varje domän äger sina egna objekt, regler, API-kontrakt och tester
- cross-domain-skrivningar sker via explicita kommandon eller orchestrators
- ledger är enda källan till bokföring
- alla regler lever i versionerade regelpaket
- alla submissions använder versionsstyrd payload, receipt chain och retry/replay-policy
- all historik som påverkar ekonomi, skatt, AGI, moms, HUS eller close ska vara reproducerbar
- UI får aldrig äga regelbeslut
- worker- och replay-lagret måste bli persistent, idempotent och observerbart

# Compliance north star

Systemet ska vara självbärande för svenska kärnflöden.

Det betyder:

- användaren ska inte behöva externa regelbeskrivningar för normala kärnscenarier
- varje kärnregel ska finnas som explicit regel eller policy i systemet
- varje reglerat beslut ska vara datumstyrt, versionsstyrt och förklarbart
- osäkra fall ska gå till review
- låsta perioder, deklarerade perioder och signerade paket får inte muteras tyst
- rättelser ska ske genom explicit correction chain
- dokument, lön, AGI, moms, HUS, close och årsflöden ska bära receipt- och auditkedja

# Runtime and reliability north star

Ingen reglerad kärnfunktion får bygga på antagandet att in-memory-state eller shell-runtime räcker.

Slutmålet är:

- persistent state för alla kärnobjekt
- persistent jobbmodell med attempts, dead-letter, replay och timeout
- idempotensnycklar för alla känsliga asynkrona flöden
- observability per domänhändelse, jobb, submission och replay
- tydlig felklassning mellan transportfel, regelbrott, datakonflikt och operatörsbeslut
- backup, restore och disaster recovery som faktiskt går att köra
- support och backoffice som arbetar genom officiella kommandon
- ingen dold mutation av historiska attempts, receipts eller auditposter

# What is reusable

## Återanvänd som bindande bas

Följande ska återanvändas som bas och inte kastas:

- `docs/MASTER_BUILD_PLAN.md` som fas- och byggskelett
- ADR-strukturen, särskilt:
  - domängränser
  - rule-engine philosophy
  - security baseline
  - identity/signing/auth strategy
  - work items strategy
  - async jobs/replay strategy
  - submission/receipt strategy
  - offline/conflict strategy
  - audit/review/backoffice strategy
- compliance-dokumenten för:
  - accounting foundation
  - VAT
  - AR
  - AP
  - bank och betalningar
  - payroll
  - benefits
  - pension
  - travel
  - HUS
  - personalliggare
  - annual reporting
- runbook- och teststrukturen
- migrations- och seedmetoden
- domänpaketens uppdelning i bounded contexts

## Återanvänd med hård utbyggnad

Följande ska återanvändas som startpunkt men byggas ut kraftigt:

- `packages/domain-ledger`
- `packages/domain-vat`
- `packages/domain-ar`
- `packages/domain-ap`
- `packages/domain-banking`
- `packages/domain-payroll`
- `packages/domain-benefits`
- `packages/domain-hus`
- `packages/domain-personalliggare`
- `packages/domain-reporting`
- `packages/domain-annual-reporting`
- `packages/rule-engine`
- `packages/document-engine`
- `packages/db/migrations`
- `docs/domain/submission-receipts-and-action-queue.md`
- `docs/domain/work-items-deadlines-notifications.md`

## Återanvänd endast som koncept, inte som slutlig produkt

Följande får bara återanvändas som idé eller scaffolding:

- `apps/desktop-web`
- `apps/field-mobile`
- `apps/worker`
- nuvarande desktop- och mobile-shells
- nuvarande publika/auth-liknande entrypoints
- delar av gamla UI-planen som endast bekräftar desktop-vs-mobile-separation, keyboard-first-principer eller hög informationsdensitet

# What must be rewritten

Följande ska behandlas som skriv-om-arbete, inte som polish:

- hela publika landningssidan och marknadsytan
- hela auth-, challenge- och onboardingupplevelsen
- hela den inloggade desktop-ytan
- hela field-mobile-ytan
- hela support- och backoffice-ytan
- worker- och asynkjobbsruntime
- review center som produkt
- notification center som produkt
- activity feed som produkt
- work item-center som produkt
- person-linked document classification engine
- import-case engine
- accounting method engine
- fiscal year and period engine
- payroll migration engine
- balances engine
- collective agreements engine
- tax account and offset engine
- legal-form-and-declaration engine
- invoice legal-field gating
- HUS invoice/payment/claim/recovery-gates
- personalliggare industry packs och identitetsgraf
- projekt som full arbetsyta
- egenkontroller
- kalkyl

# What is dangerously overestimated

Följande är explicit förbjudna att behandla som nästan klara:

1. API-routebredd som tecken på färdig produkt
2. migrationsmängd som tecken på färdig runtime
3. testmängd som tecken på produktionsmognad
4. worker-appen som tecken på verklig kö- och replaymotor
5. shell-UI som tecken på enterprise-färdig yta
6. HUS-domänen som tecken på färdig claimprodukt
7. annual reporting-paket som tecken på färdigt årsredovisnings- och deklarationsstöd
8. personalliggare-paketet som tecken på full branschbredd
9. AI-automation som tecken på tillåten ekonomisk autopilot
10. tax account-spegling som tecken på verklig skattekonto-integration
11. projektdomänen som tecken på full arbetsorder-, kalkyl- och projektekonomi-produkt
12. rule-engine-kontraktet som tecken på att alla nödvändiga rulepacks redan finns
13. gamla UI-planen som tecken på slutlig designriktning
14. in-memory-plattformar i domänpaket som tecken på färdig persistence
15. partner- och public-API-ytor som tecken på extern integrationsmognad

# What must never be assumed

Codex får aldrig anta något av följande utan explicit stöd:

- att kontantmetod och faktureringsmetod redan stöds korrekt
- att brutet räkenskapsår redan stöds korrekt
- att alla företagsformer redan stöds korrekt
- att K1, K2 och K3 redan är fullständigt skilda där de måste skiljas
- att SRU, INK, NE, K10 och andra bilagor redan är färdiga
- att dokument med personpåverkan redan kan flöda säkert till lön och AGI
- att HUS-claiming redan är blockerande säkert i UI
- att privata kortköp redan är fullständigt säkrade från felklassad kostnad
- att friskvård, gåvor, kostförmån och nettolöneavdrag redan täcks helt
- att kollektivavtal, banker och historiska saldon redan kan migreras säkert
- att projektkostnad från lön redan är exakt
- att personalliggare redan stöder fler branschpaket än bygg på robust sätt
- att notiser, aktivitet och uppgifter redan är separerade som produkt
- att public site, desktop, mobile och backoffice går att rädda genom små ändringar
- att rulepacks får ligga i UI eller controllers
- att AI får fatta slutliga ekonomiska beslut
- att support får skriva direkt i databasen
- att demo-seeds eller demo-data representerar slutlig produktmodell
- att äldre UI-antaganden fortfarande gäller
- att frånvaron av uttrycklig regel innebär att Codex får improvisera fritt

# Non-negotiable engineering rules

1. Ingen domänregel får läggas i UI.
2. Ingen annan domän än ledger får skriva bokföring.
3. Alla historiska ekonomiska mutationer ska ske genom correction chain, reversal eller nytt beslut, aldrig genom tyst overwrite.
4. Alla asynkrona jobb som påverkar dokument, submission, notiser, index eller automation ska ha persistent jobbobjekt.
5. Alla jobb ska ha idempotensnyckel, attempts, timeout och replaypolicy.
6. Alla kritiska objekt ska ha explicit state machine.
7. Alla kritiska state transitions ska ha blockerande valideringar.
8. Alla regelpaket ska vara versionsstyrda och effektiv-daterade.
9. Alla cross-domain-flöden ska ske genom explicita kommandon, events eller orchestrators.
10. Alla gränssnitt mot externa aktörer ska bära receipt chain.
11. Alla starka eller riskfyllda åtgärder ska vara auditerade med aktör, tid, correlation id och beslutsorsak.
12. Kalenderår får aldrig antas implicit i kärnlogik.
13. Bokföringsmetod får aldrig antas implicit i kärnlogik.
14. Företagsform får aldrig antas implicit i årssluts- och deklarationslogik.
15. Demo-seeds, hardcoded examples och shell-UI får inte styra slutlig modell.
16. Support- och adminflöden ska gå via officiella domänkommandon.
17. Alla nya motorer ska få migrationsplan, testsvit och dokument i samma förändring.
18. Ingen route får införas utan att ansvarig domän, auditkrav och felmodell är definierade.
19. Alla UI-skal ska byggas ovanpå färdiga domänkontrakt och inte tvärtom.
20. Ingen del får behandlas som robust runtime enbart för att den har en README eller ett paketnamn.

# Non-negotiable compliance rules

1. Alla reglerade beslut ska vara deterministiskt reproducerbara.
2. Alla regelpaket ska bära giltighetsdatum och versionsidentitet.
3. Alla beslut som påverkar moms, skatt, AGI, HUS eller bokföring ska kunna förklaras.
4. AI eller OCR får inte fatta slutligt ekonomiskt beslut.
5. Dokument med personpåverkan ska gå genom uttrycklig klassning och review.
6. Privata köp på företagskort får aldrig bokas som bolagskostnad.
7. Utlägg får aldrig ersättas utan underlag och attest enligt policy.
8. HUS får aldrig skickas utan fullständiga obligatoriska uppgifter, betalningsbevis och korrekt arbetsdel.
9. AGI-kedjan får aldrig byggas från oattesterade eller oklassade händelser.
10. Låsta perioder får inte öppnas eller kringgås utan formell reopen-logik och audit.
11. Momsbeslut får inte tas i osäkra fall utan review.
12. Kontantmetod och faktureringsmetod ska styras av explicit motormodell.
13. Brutet räkenskapsår ska styras av explicit fiscal-year-motor.
14. Årsslut och årsredovisning ska styras av företagsform och regelverk, inte av generisk årslogik.
15. Submission-flöden ska skilja på teknisk kvittens, materiellt beslut, rättelse och återförsök.
16. Historiska regeländringar får inte förstöra reproducerbarhet.
17. Varje redovisnings- eller myndighetsflöde ska ha tillräckligt underlag för revisionsspår.
18. Det som saknas i repo:t ska byggas innan området behandlas som färdigt.

# Non-negotiable UI rules

1. Hela UI:t ska byggas om från grunden.
2. Den gamla UI-planen är inte styrande.
3. Desktop-web är den enda fullständiga ytan för alla roller.
4. Field-mobile är en separat stöd-yta, inte en miniatyr av desktop.
5. Backoffice ska vara en egen operatörs- och supportyta.
6. Produkten får inte kännas som AI-sajt, startup eller demo.
7. Publika ytan ska signalera enterprise, förtroende, kontroll och kvalitet.
8. Arbete ska ske i workbenches, objektprofiler och listor med preview, inte i långa wizardkedjor som standard.
9. Audit log, activity feed, notification center och work items ska vara fyra tydligt skilda begrepp.
10. Global sök ska vara förstaklassig.
11. Färre klick ska uppnås genom bättre informationsarkitektur, inte genom att gömma kontroll.
12. Blockerande compliancefel ska visas tidigt och tydligt.
13. Desktop ska vara keyboard-stark och datatät.
14. Mobile ska vara tumvänlig, offline-medveten och konfliktmedveten.
15. Visuell design ska vara sober, modern, konsekvent och premium.
16. Gamla shell-vyer får inte återanvändas som slutlig struktur.
17. Ingen domän får äga sin egen visuella designfilosofi; designsystemet ska vara centralt.
18. Inga beslutskritiska uppgifter får döljas i hover, overflow eller sekundära drawers.
19. Roller ska arbeta i tydliga arbetsytor med ansvar, kontext och relaterade objekt.
20. UI får aldrig ersätta saknad domänlogik med manuella genvägar som bryter audit eller compliance.

# Non-negotiable AI rules

1. AI är förslag, inte domslut.
2. OCR är extraktion, inte bokföringsmotor.
3. AI får aldrig posta direkt till ledger.
4. AI får aldrig skicka AGI, moms, HUS eller årsfiling utan mänsklig kontrollkedja.
5. AI får aldrig ensamt klassa privat köp som bolagskostnad.
6. AI får aldrig ensam avgöra om något är skattefri friskvård, skattepliktig förmån eller nettolöneavdrag.
7. AI får aldrig ensam avgöra anläggningstillgång kontra direkt kostnad i tvetydiga fall.
8. AI-förslag ska alltid spara modelversion, confidence, inputhash, output och overridehistorik.
9. Låg confidence, tvetydighet eller policyträff ska alltid skapa review.
10. Deterministiska regler har företräde framför AI.
11. AI får bara användas där dess roll uttryckligen definierats i policy.
12. AI-kostnader ska hållas nere genom regel-först, OCR-först och selektiv inferens.
13. AI-output som påverkar pengarisk ska vara fullt förklarbar i operatörsytan.
14. All AI-användning ska kunna stängas av per tenant eller per modul utan att kärnprodukten bryts.
15. Ingen UI-yta får ge intryck av att AI “har gjort klart” ett reglerat beslut om så inte mänsklig review faktiskt skett.

# Build commandments for Codex

1. Läs alltid relevanta master-control-dokument innan implementation.
2. Läs sedan relevanta repo-dokument innan implementation.
3. Behandla gamla UI-planen som kasserad tills `master-ui-reset-spec.md` uttryckligen återanvänder något.
4. Förväxla aldrig dokumenterat stöd med robust runtime.
5. Förväxla aldrig migrationsstöd med komplett affärslogik.
6. Bygg först de motorer som saknas, därefter de ytor som använder dem.
7. Håll strikt isär dokument, klassning, beslut, review, payroll impact, submission och posting.
8. Skriv inte regler i controllers eller UI.
9. Använd rulepacks för alla tidsberoende regler.
10. Använd explicit state machine för alla kärnobjekt med complianceeffekt.
11. Ge varje känsligt flöde idempotens, audit och replay.
12. Lägg inte till nya features genom att kringgå existerande bounded contexts.
13. När repo-verkligheten är tunn ska Codex först hårdna runtime, inte bygga kosmetik.
14. När något saknas i strukturen ska Codex skapa rätt motor, inte ett lokalt specialfall.
15. När dokument och kod krockar ska Codex följa bindande prioritetsordning och skriva tillbaka rättad dokumentation.
16. Ingen del får markeras klar utan tester, dokument och runbook där det krävs.
17. Om ett område kräver ny policy ska policyn beskrivas innan funktionen betraktas som färdig.
18. Om ett område kräver nytt bounded context ska det namnges och dokumenteras innan UI byggs.
19. Om ett område kräver ny compliance-motor ska den behandlas som kärnarkitektur, inte helper.
20. Bygg inte “smart UI” för att dölja saknad domänmodell.
21. Inför aldrig AI-autonomi där en människa ska ta det ekonomiska beslutet.
22. För alla delar där repo:t ser större ut än det är ska Codex skriva mot verklig stödnivå, inte önskad stödnivå.
23. När ett område rör både ekonomi och person ska Codex anta att reviewkrav är höga tills explicit regel säger annat.
24. När ett område rör periodlås, AGI, moms, HUS eller årsfiling ska Codex anta att append-only och receipt chain krävs.
25. Varje ny implementation ska kunna pekas tillbaka till en post i gap-registret och en plats i build-sekvensen.

# Exit gate

Detta dokument är uppfyllt först när samtliga villkor nedan är sanna:

- alla tio master-control-filer finns i `docs/master-control/`
- samtliga senare master-control-filer följer denna bindande riktning
- gamla UI-planen är uttryckligen nedgraderad till underordnat historiskt material
- gap-registret innehåller alla kända hög- och medelriskluckor utan tomma styrfält
- code impact map och domain map använder samma bounded contexts som detta dokument
- rulepack-registret täcker alla reglerade huvudområden
- golden scenario-katalogen täcker alla tvärdomänflöden som nämns här
- policy-matrisen täcker alla policykrav som nämns här
- dokumentmanifestet listar alla nya eller ersättande dokument som krävs av detta dokument
- build-sekvensen bygger de saknade motorerna före UI-ytskikt som är beroende av dem
- ingen Codex-implementation får efter detta hänvisa till den gamla UI-planen som primär källa
- ingen del av repo:t får efter detta beskrivas som produktionsklar om den fortfarande ligger i kategorin dokumenterad, delvis kodstött eller falskt färdig enligt denna kontrollbas

