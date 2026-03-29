> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-005
- Title: Field Mobile Spec
- Status: Binding
- Owner: Enterprise UX architecture and field product architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated field mobile spec
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - field-mobile
  - personalliggare
  - field
  - offline
- Related code areas:
  - `apps/field-mobile/*`
  - `packages/ui-mobile/*`
- Related future documents:
  - `docs/domain/offline-sync-and-conflict-resolution.md`
  - `docs/domain/field-work-order-service-order-and-material-flow.md`

# Purpose

Låsa field-mobile som separat stöd-yta för fältarbete, inte som komprimerad desktop.

# Product position

Field-mobile ska vara snabb, tumvänlig, konfliktmedveten och fokuserad på dagens arbete.

# Anti-goals

- full ERP i mobilen
- dolda kritiska states
- generisk card feed utan verklig prioritering
- offline som “magiskt” antas fungera utan synlig status

# User roles

- field worker
- site lead
- mobile kiosk operator where relevant

# Information architecture

Primära flikar:

- Today
- Jobs
- Time
- Check-in
- Inbox
- More

# Navigation model

- bottennavigation för huvudflikar
- toppstatus för sync, offline och blockerare
- tydliga objektkort med status och nästa handling

# Surface responsibilities

- Today: dagens uppdrag, blockerare, senaste syncstatus
- Jobs: arbetsorder och serviceorder
- Time: snabb tidrapportering och saldoöversikt i tillåtet scope
- Check-in: personalliggare och närvaro
- Inbox: handlingsnära notifieringar och egna tasks
- More: profil, enheter, offline-logg och hjälp

# Object profile rules

- mobilobjektprofil ska visa bara det som behövs för nästa fältåtgärd
- full ekonomi- eller revisionskontext lämnas till desktop

# Workbench rules

- mobile har inga fulla workbenches
- istället används handlingsflöden med korta steg och tydlig pending/synced/conflicted-status

# Lists/tables

- listor prioriterar status, tid och plats före bred data
- tabeller används sparsamt och bara där de är läsbara på telefon

# Detail views

- job detail visar uppdrag, plats, material, bilder, signatur och tillåtna actions
- check-in detail visar workplace, senaste events och syncstatus

# Preview panes

- inga klassiska preview panes på telefon
- ersätts av kompakta inline sections

# Search behavior

- scoped search per flik
- snabb sökning på arbetsordernummer, kundnamn och plats där policy tillåter

# Notifications/activity/work items behavior

- mobile visar bara handlingsnära notifieringar
- activity visas som kort historik på jobb och check-in
- review center och tunga work items stannar på desktop om inte uttryckligen tillåtna

# States: empty/loading/error/success/blocked/warning

- `empty`: visa nästa möjliga jobb eller check-in
- `loading`: enkel skeleton med bevarad layout
- `error`: tydlig retry och om felet beror på nät eller policy
- `success`: kort bekräftelse
- `blocked`: stark blocker med tydligt nästa steg
- `warning`: sync-delay, låg signal eller pending queue

# Desktop vs mobile split

- mobile fångar råoperativt arbete
- desktop äger full granskning, bokföringsnära beslut, advanced review och close

# Accessibility expectations

- stora touchmål
- god kontrast i dagsljus
- tydlig status även för färgblinda användare

# Visual language

- robust och praktisk
- tydliga ytor för “nu”, “på väg”, “synkad”, “konflikt”
- fotografi, signatur och material ska kännas fältmässigt, inte finansiellt

# Design system dependencies

- `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
- gemensamma status- och inputkomponenter med mobile-varianter

# Exit gate

- [ ] mobile är tydligt separerad från desktop i ansvar och informationsmängd
- [ ] offline, pending och conflict states är synliga i alla relevanta flöden
- [ ] Today, Jobs, Time och Check-in räcker för dagligt fältarbete utan att låtsas vara full desktop

