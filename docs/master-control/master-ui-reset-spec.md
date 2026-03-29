> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-006
- Title: Master UI Reset Spec
- Status: Binding control baseline
- Owner: Enterprise UX architecture and product design architecture
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: Replaces the old UI direction as controlling source. The old UI plan is historical input only.
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-build-sequence.md
- Related domains:
  - all user-facing domains, especially auth, documents, review center, finance, payroll, projects, field, HUS, personalliggare, annual reporting and backoffice
- Related code areas:
  - apps/public-web
  - apps/desktop-web
  - apps/field-mobile
  - apps/backoffice
  - packages/ui-core
  - packages/ui-desktop
  - packages/ui-mobile
- Related future documents:
  - docs/ui/ENTERPRISE_UI_RESET.md
  - docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md
  - docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md
  - docs/ui/FIELD_MOBILE_SPEC.md
  - docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md
  - docs/ui/BACKOFFICE_OPERATIONS_SPEC.md

# Purpose

Detta dokument låser hela UI-omtaget från grunden.

Det avgör:

- varför den gamla UI-riktningen inte räcker
- vad som uttryckligen ska kastas
- vad som eventuellt får återanvändas
- hur publika ytan ska byggas
- hur auth och onboarding ska byggas
- hur desktop-web ska byggas
- hur field-mobile ska byggas
- hur backoffice ska byggas
- hur objektprofiler, workbenches, listvyer och sök ska fungera
- hur produkten ska kännas som premium enterprise, inte AI-demo

# Product positioning

Produkten ska upplevas som ett svenskt enterprise ERP med ovanligt stark kontroll över ekonomi, lön, skatt, dokument och projekt.

Upplevelsen ska signalera:

- stabilitet
- precision
- kontroll
- revisionsspår
- ansvarskedja
- modernitet
- premiumkvalitet
- sober styrka

Produkten ska inte säljas som “AI för ekonomi”. Den ska säljas som ett komplett kontrollsystem där automation hjälper användaren utan att urholka ansvar eller spårbarhet.

# Anti-goals

Följande är uttryckliga anti-goals:

1. chat-first experience
2. promptprodukt-känsla
3. AI-startup-estetik
4. korttunga dashboards utan verkligt arbete
5. modulmenyer utan sammanhållen arbetsyta
6. wizard-beroende UI för normala proffsflöden
7. tomma ytor med få datapunkter och för mycket luft
8. mobil som försöker vara full desktop
9. dold komplexitet i hover, overflow och obskyra drawers
10. visuellt buller, gradienter och “innovation”-retorik som sänker förtroendet
11. en gemensam “inbox” som blandar notiser, aktivitet, audit och arbete
12. AI-badges som ger sken av färdigt beslut när det bara är ett förslag

# Why the old UI direction is insufficient

Den gamla UI-planen hade några bra avsikter:

- tydlig skillnad mellan desktop och mobile
- workbench-tänk
- hög informationsdensitet
- keyboard- och compare-mode-tänk

Det räcker ändå inte.

## Exakt vad som är otillräckligt

1. Den gamla planen utgår för mycket från modulområden, för lite från riktiga roller och arbetskedjor.
2. Den gamla planen är för shell-fokuserad och för lite objektprofil-fokuserad.
3. Den separerar inte tillräckligt tydligt mellan review, notification, activity och work items.
4. Den beskriver inte tillräckligt hårt hur compliance-blockers ska exponeras tidigt i UI.
5. Den beskriver inte en riktig backoffice-upplevelse.
6. Den beskriver inte en verklig public site på premium enterprise-nivå.
7. Den saknar tillräckligt bindande informationsarkitektur för hela inloggade produkten.
8. Den är för svag som styrdokument för ett totalt UI-omtag där nästan allt ska göras om.
9. Den tar inte tillräckligt tydligt avstånd från AI-/demo-känsla.
10. Den specificerar inte tillräckligt hårt hur desktop ska vinna på färre klick och bättre sammanhang mellan moduler.

# What must be discarded

Följande ska uttryckligen kasseras från tidigare UI-tänk:

- all antagen struktur där nuvarande shell-vyer ses som nästan slutliga
- all design som utgår från att moduler i vänsternav räcker som informationsarkitektur
- all generell dashboard-card-känsla som ersätter riktiga workbenches
- all idé om att samma layoutmönster kan återanvändas oförändrat i desktop och mobile
- all otydlighet mellan review, task, notification, activity och audit
- all AI-först-etik eller synligt promptspråk
- alla sidor där användaren måste klicka in i objekt bara för att få basal kontext som borde ligga i preview
- alla flöden där blockerande compliancefel upptäcks för sent
- alla designspråk som känns startup, demo eller “beta tool”

# What may be reused, if anything

Endast följande får återanvändas, och då bara efter uttrycklig bekräftelse i ny designsystemspecifikation:

- separationen mellan full desktop-web och förenklad field-mobile
- idén om workbench som primärt proffsmönster
- hög datadensitet i tabeller när det förbättrar effektivitet
- tangentbordsfokus och command-baserade genvägar
- compare mode där det ger verkligt värde
- designsystemtanken med `ui-core`, `ui-desktop`, `ui-mobile`

Allt annat ska betraktas som under omprövning.

# Brand and trust direction

## Kärnvärden i upplevelsen

- svensk saklighet
- enterprise-tyngd
- lugn och precision
- tydlig ansvarsfördelning
- hög tillit
- snygg utan att vara modebetonad
- modern utan att bli lekfull

## Varumärkesuttryck

Produkten ska kännas som ett premiumbolag på miljardnivå som kan bära:

- ekonomi
- lön
- myndighetsflöden
- projekt- och fältarbete
- support och revision

Det får aldrig kännas som en produkt som gömmer sig bakom AI-språk eller “magic”.

# Enterprise visual direction

## Visuellt grunduttryck

- ljus och sober bas
- tydliga ytnivåer
- hög kontrast där data kräver det
- konsekventa korta statusetiketter
- kraftfull tabelltypografi
- kompakt och professionell vertikal rytm
- mycket tydlig informationshierarki

## Visuell ton

- premium enterprise, inte konsumentapp
- modern finansprodukt, inte startup-landing
- kontrollerad färgsättning, inte effektsökande färgexplosion
- tydliga dividerare, grid och alignment
- precision före pynt

# Public site architecture

## Publika sidtyper

1. **Home**
   - kärnbudskap
   - produktsammanhang
   - tydlig rollsegmentering
   - tydligt förtroende

2. **Product**
   - ekonomi
   - lön
   - projekt och fält
   - compliance och kontroll
   - backoffice och support

3. **By role**
   - företagsägare
   - ekonomiansvarig
   - löneansvarig
   - redovisningsbyrå
   - projektledare
   - fältledning

4. **Trust**
   - säkerhet
   - audit
   - dataskydd
   - drift och robusthet
   - myndighets- och integrationsstöd

5. **Integrations**
   - banker
   - e-faktura
   - signering
   - partner och API

6. **Contact and demo**
   - kontakt
   - demo-entry
   - onboarding-entry
   - partner-entry

## Public site principles

- inga generiska slogans utan konkret kontrollbudskap
- visa verkliga arbetsytor och verkliga roller
- visa varför produkten är bättre än klicktunga gamla system
- visa att mobile är fältstöd och desktop är full produkt
- visa att AI är assistans, inte autopilot

# Auth and onboarding architecture

## Entry states

- sign in
- invited user
- create organization
- join existing tenant
- challenge required
- step-up required
- device trust required
- onboarding in progress
- access denied
- suspended tenant

## Auth components

- email login or password according to policy
- passkeys
- TOTP
- BankID step-up for high-risk actions
- tenant selector
- session and device panel
- strong-auth challenge center
- recovery flow
- invitation acceptance
- first-admin setup

## Onboarding architecture

Onboarding ska vara ett kontrollerat setup-flöde, inte en allmän wizard utan stoppregler.

Obligatoriska steg:

1. company core profile
2. registrations and tax profile
3. accounting method and fiscal year
4. chart and dimensions
5. VAT profile
6. modules and feature activation
7. signatories and approval chains
8. baseline imports
9. first review of blockers

# Desktop web information architecture

## Top-level navigation

1. Home
2. Review Center
3. Finance
4. Sales
5. Purchasing
6. Banking
7. Payroll
8. People
9. Projects
10. Compliance
11. Reports
12. Search
13. Backoffice access when policy allows

## Nav grouping logic

- **Home** = role-specific status and actions
- **Review Center** = all unresolved review items across domains
- **Finance** = ledger, VAT, close, tax account
- **Sales** = customers, quotes, invoices, collections, HUS billing basis
- **Purchasing** = suppliers, PO, supplier invoices, import cases
- **Banking** = payment proposals, orders, returns, bank match
- **Payroll** = pay runs, balances, agreements, AGI, migration
- **People** = employees, employments, leave, approvals
- **Projects** = portfolio, project control, field, egenkontroll, kalkyl
- **Compliance** = submissions, HUS, personalliggare, annual prep
- **Reports** = reports, exports, drilldown, snapshots
- **Search** = command-driven global search
- **Backoffice** = support and ops if allowed

# Field mobile architecture

## Mobile purpose

Field-mobile är inte ett alternativt skrivbord. Det är en snabb, säker och konfliktmedveten stöd-yta för arbete i rörelse.

## Primära mobilsektioner

- Today
- Jobs
- Check-in
- Time
- Materials
- Photos
- Signature
- Self-checks
- Expenses
- Sync status

## Mobile constraints

- inga fulla finansarbetsytor
- inga komplexa rapportbyggare
- ingen full close- eller annual-yta
- inga breda adminvyer
- inga långa grid-intensiva drilldowns som hör hemma på desktop

# Backoffice architecture

## Backoffice sections

1. Support cases
2. Impersonation
3. Access reviews
4. Break glass
5. Audit explorer
6. Replay and jobs
7. Submission operations
8. Feature flags and emergency disables
9. Tenant diagnostics
10. Tax account operations
11. Search/index operations
12. Incident and restore controls

## Backoffice rules

- strikt policystyrd
- egen signoff för farliga åtgärder
- inga direkta databasskrivningar
- alla åtgärder ska gå via officiella domänkommandon
- full audit och reasons required

# Global navigation principles

1. Stabil vänsternavigation på desktop.
2. Global top bar med sök, command bar, notiser, aktivitet, tasks och användarmenyer.
3. Varje top-level område ska ha en primär workbench, inte bara en listvy.
4. Breadcrumbs får användas i djupa objektprofiler men ska inte bära huvudsaklig navigation.
5. Konsekventa ikoner och statusbärare över hela produkten.
6. Secondary nav inom större arbetsytor ska vara saklig och objektorienterad.

# Global search principles

1. Sök ska vara global och tillgänglig via tangentbord.
2. Sök ska kunna hitta objekt, personer, dokument, projekt, submissions, fakturor, journaler och work items.
3. Resultat ska vara permission-trimmade.
4. Resultat ska bära snabbpreview och primära actions.
5. Sök ska stödja sparade vyer och senaste objekt.
6. Sök får aldrig vara enda vägen till ett viktigt objekt, men ska vara snabbaste vägen för vana användare.

# Object profile standard

Varje större objektprofil ska följa samma grundanatomi:

1. **Header bar**
   - namn eller nummer
   - state
   - viktigaste statusetiketter
   - primary actions

2. **Summary band**
   - centrala belopp
   - ansvarig
   - datum
   - relationer
   - blockers/warnings

3. **Main content tabs**
   - overview
   - lines/details
   - related objects
   - activity
   - audit or history
   - documents where relevant

4. **Right context rail**
   - owner
   - next actions
   - linked work items
   - related notifications
   - quick facts

5. **Bottom history zone when needed**
   - timeline
   - state changes
   - submission receipts
   - corrections

# Workbench catalog

## Mandatory workbenches

| Workbench | Primary users | Core purpose |
|---|---|---|
| Home workbench | all roles | role-tailored priorities, blockers and live status |
| Review Center | accountants, payroll, compliance roles | domain-agnostic review handling |
| AP workbench | finance | supplier invoices, matches, variances, imports, approvals |
| AR and billing workbench | finance, project billing | quotes, invoices, collections, HUS billing basis |
| Banking workbench | finance | payment proposals, returns, matches, bank events |
| VAT workbench | finance/compliance | VAT decisions, review queue, declarations, periodic statements |
| Ledger and close workbench | finance | journals, locks, corrections, close blockers |
| Payroll workbench | payroll | payroll calendar, exceptions, approvals, payouts |
| AGI workbench | payroll/compliance | AGI validation, corrections, receipts |
| People workbench | HR | employments, leave, approvals, assignments |
| Project control workbench | project managers, controllers | budget, actuals, forecast, risks, billing readiness |
| Field operations workbench | site managers | work orders, materials, photos, signatures, attendance |
| HUS workbench | finance/compliance | cases, claims, payouts, recoveries |
| Annual and filing workbench | finance/compliance | close-to-filing chain, signatories, receipts |
| Backoffice workbench | support/ops | support, replay, flags, incidents, access reviews |

# Notification center principles

1. Notiser är korta, aktuella och åtgärdsnära.
2. Notiser är inte arbetskö.
3. Varje notis ska ha severity och källa.
4. Notiser ska kunna ackas eller öppna rätt workbench/objekt.
5. Notiser ska deduplas.
6. Röd notis används bara för verklig systemkritisk eller tidskritisk risk.

# Activity feed principles

1. Activity feed visar affärshändelser i läsbar form.
2. Activity feed är bredare än notiser och mindre juridisk än audit log.
3. Activity feed ska kunna filtreras per objekt, projekt, team eller domän.
4. Activity feed ska vara kontextburen, inte bara globalt brus.
5. Activity feed ska aldrig bära tvingande ansvar; det gör work items.

# To do / work item principles

1. Work items är ansvar, deadline och status.
2. Varje work item ska ha owner, due date, severity och blocker relation.
3. Work items ska kunna claimas, reassigned, snoozas och escaleras enligt policy.
4. Work items ska synas i workbenches och objektprofiler.
5. Work items ska inte försvinna när tillhörande notis är ackad.

# Review center principles

1. Review center ska vara egen top-level arbetsyta.
2. Review items ska grupperas per domän, severity, due date och owner.
3. Reviewer ska se originalevidence, AI/rule reasons, linked objects och allowed actions i samma vy.
4. Bulk review får bara tillåtas där policy säger det.
5. Review center ska ha compare-mode och preview pane.
6. Ett reviewbeslut ska direkt kunna visa förväntad effekt på bokföring, moms, lön eller submission.

# List view principles

1. Tabeller ska vara datatäta.
2. Kolumner ska vara rollrelevanta och justerbara.
3. Sparade vyer ska stödjas.
4. Snabbfilter, facetfilter och statusfilter ska finnas.
5. Preview ska gå att öppna utan full navigation bort från listan.
6. Radåtgärder ska vara begripliga och inte gömda bakom flera klick i onödan.

# Detail view principles

1. Detaljvyer ska alltid visa state, ansvar, blockers och relaterade objekt tidigt.
2. Detaljvyer ska vara orienterade för riktiga beslut, inte för tomma presentationskort.
3. Om objektet är reglerat ska aktuell rulepack/policy kunna visas.
4. Om objektet är låst, signerat eller inlämnat ska det framgå omedelbart.
5. Om objektet är under review ska detta vara tydligt redan i headern.

# Split view / preview pane principles

1. Lista till vänster, preview till höger är standard i många arbetsytor.
2. Preview ska visa nog för att fatta beslut utan att öppna full objektprofil.
3. Preview ska stödja attachments, history snapshot, related items och blockers.
4. Preview får inte försöka ersätta full objektprofil när djup arbete krävs.

# Bulk action principles

1. Bulk actions får bara finnas där domänen tillåter säkert massagerande.
2. Bulk actions ska visa vilka objekt som blockeras och varför.
3. Bulk actions ska alltid kunna simuleras innan commit i reglerade flöden.
4. Bulk actions får inte kunna kringgå individual review där policy kräver individuell kontroll.

# Command bar principles

1. Command bar ska kunna öppna objekt, vyer och actions snabbt.
2. Command bar ska stödja:
   - navigate
   - create
   - claim
   - assign
   - export
   - open search scope
3. Command bar ska respektera permissions.
4. Command bar ska inte kringgå blockerande valideringar.

# State design

## Empty
- tydlig förklaring
- relevant nästa steg
- inga tomma generiska illustrationer som känns konsumentapp

## Loading
- snabb skeleton där datatäta ytor väntar
- ingen fladdrig layout

## Error
- skillnad mellan transportfel, behörighetsfel, blocker, datakonflikt och domänfel
- tydlig retry eller rätt väg vidare

## Success
- tydlig men lågmäld
- visa vad som nu ändrats i systemet

## Blocked
- mest kritiska UI-staten efter error
- måste visa exakt blocker code, orsak och nästa tillåtna steg

## Warning
- signalerar osäkerhet eller behov av koll
- får inte visuellt likna blockerande fel

# Design system direction

## `ui-core`
Ska äga:

- design tokens
- typography scale
- spacing system
- status language
- object profile anatomy
- table system
- form system
- badges
- banners
- empty/loading/error states
- keyboard interaction contracts

## `ui-desktop`
Ska äga:

- workbench chrome
- split panes
- dense grids
- compare mode
- bulk action bars
- right context rails
- desktop-specific keyboard patterns

## `ui-mobile`
Ska äga:

- touch targets
- offline banners
- sync state surfaces
- camera and attachment flows
- compact task cards
- bottom-nav or top-tab patterns where chosen

# Typography direction

- tydlig, sober sans-serif för all produkttext
- stark numerisk läsbarhet
- tydlig rubrikhierarki
- dataetiketter korta och precisa
- inga marknadsrubriker inne i produkten som känns reklambyrå

# Color and status language

## Statusspråk

- neutral: standardinfo
- blue: information / new / pending information
- amber: attention required / review suggested
- red: blocker / critical / overdue / failed
- green: confirmed / completed / reconciled where appropriate
- purple or reserved accent: signed / filed / legal milestone only if design system tillåter det utan att skapa färgkaos

## Regler

- samma färg får inte betyda olika saker i olika domäner
- statusfärg ska aldrig bära hela betydelsen utan måste kombineras med text
- röd får inte överanvändas

# Table density and professional data handling

1. Tabellen är primärt arbetsredskap.
2. Kolumnrubriker ska vara affärskorta och konsekventa.
3. Belopp ska högerställas.
4. Status ska vara visuellt lätt att skanna.
5. Multi-line rader används bara när det förbättrar arbetet.
6. Frozen columns ska finnas där det behövs.
7. CSV- och exporttänk ska inte styra hela tabellupplevelsen.

# Interaction model

- click for detail
- keyboard for speed
- command for power users
- preview for context
- explicit confirmation only where risk justifies it
- inline validation tidigt
- batch operations där det sparar tid
- compare mode i review- och diffscenarier
- no surprise state jumps

# Accessibility and performance expectations

## Accessibility
- full keyboard navigation på desktop
- tydlig fokusmarkering
- tillräcklig kontrast
- labels och errors som kan förstås utan färg
- screen-reader-friendly struktur för tabeller, formulär och objektprofiler

## Performance
- workbenches ska öppna snabbt
- första listvy ska vara användbar utan att hela sidan renderats klart
- preview ska kännas omedelbar
- mobile ska tåla dålig uppkoppling
- sök ska svara snabbt även om index är asynkront uppdaterat

# Desktop vs field-mobile responsibilities

## Desktop owns
- full ekonomihantering
- full lön
- full close och annual
- full review center
- full backoffice access where allowed
- full reporting and exports
- project control and forecasting

## Field-mobile owns
- check-in and attendance actions
- quick time capture
- work order execution
- material withdrawals
- photos
- signatures
- self-checks
- simple expenses
- sync health

# What the public landing site must communicate

1. att produkten är ett riktigt svenskt ERP
2. att ekonomi, lön, projekt och compliance sitter ihop
3. att produkten är byggd för riktiga arbetsroller
4. att kontroll och revisionsspår är förstaklassiga
5. att UI:t är modernt, effektivt och premium
6. att mobile är ett starkt fältstöd
7. att automation finns men aldrig urholkar ansvar

# What the logged-in product must feel like

Den inloggade produkten ska kännas som:

- ett kontrollrum
- ett verktyg för professionella heltidsanvändare
- en sammanhängande produkt
- en miljö där arbete går snabbt men med full spårbarhet
- ett system som tydligt visar vad som är säkert, vad som är osäkert och vad som kräver beslut

Den får inte kännas som:

- ett chatbotgränssnitt
- ett experimentellt AI-verktyg
- ett klicktungt gammalt affärssystem
- en samling halvt relaterade moduler

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- den gamla UI-planen är uttryckligen nedgraderad och inte längre styrande
- public site, auth, desktop, field-mobile och backoffice alla har definierad arkitektur
- top-level desktop IA är låst
- object profile standard är låst
- workbench catalog är låst
- notiser, aktivitet, work items och review center är tydligt separerade
- design system-riktningen är tydligt definierad
- desktop-vs-mobile responsibilities är uttryckliga
- public site och logged-in feel är så tydliga att ingen kan bygga en AI-demo i stället för premium enterprise
- inga senare UI-beslut får återinföra shell-tänk eller modul-silo som bryter detta dokument

