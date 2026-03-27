> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-012
- Title: Personalliggare Correction Policy
- Status: Binding
- Owner: Field compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated personalliggare correction policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - personalliggare
  - field
  - backoffice
- Related code areas:
  - `packages/domain-personalliggare/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/personalliggare-engine.md`
  - `docs/runbooks/personalliggare-kiosk-device-trust.md`

# Purpose

Styra hur attendance events i personalliggare får rättas, vem som får göra det och hur append-only-kravet ska upprätthållas.

# Scope

Policyn gäller:

- check-in/check-out events
- offline sync corrections
- identity corrections
- workplace corrections
- export and control visibility

# Why it exists

Personalliggare är ett kontrollspår. Därför får fel inte “städas bort” genom overwrite. Rättelse måste vara synlig, spårbar och motiverad.

# Non-negotiable rules

1. Original attendance event får aldrig skrivas över.
2. Varje rättelse måste länka till exakt originalevent.
3. Rättelse kräver reason code, aktör, tidpunkt och kanal.
4. Offline-händelser får rättas först efter att synkstatus är klarlagd.
5. Rättelse av identitet eller arbetsgivarsnapshot kräver högre behörighetsklass än vanlig check-in.
6. Kontrollrapport ska kunna visa både original och korrigerat utfall.

# Allowed actions

- lägga till saknad checkout genom correction event
- markera felregistrerat event som ogiltigt via correction chain
- uppdatera fel employer/contractor snapshot genom ny correction record

# Forbidden actions

- direktändra timestamp på originalevent
- radera event från kontrollkedjan
- slå ihop flera events till ett nytt event utan spårbar relationskedja

# Approval model

- låg risk: vanlig correction av glömd checkout kan göras av behörig site admin
- hög risk: identitetsbyte, arbetsgivarskifte eller retroaktiv masskorrigering kräver dubbelgranskning eller backoffice-kommentar enligt policy

# Segregation of duties where relevant

- den som själv registrerat eventet ska inte ensam slutgodkänna högriskrättelse när SoD kräver separat kontroll

# Audit and evidence requirements

Audit ska visa:

- originalevent
- correction event
- reason code
- actor
- eventuell device info
- påverkan på export och kontrollrapporter

# Exceptions handling

Akut rättelse under pågående kontroll eller systemincident kräver särskild incidentmarkering och efterhandsgranskning.

# Backoffice/support restrictions where relevant

- support får inte göra osynliga rättelser
- backoffice får bara använda officiella correctionkommandon

# Runtime enforcement expectations

- correction ska skapa nytt append-only event
- exportmotor ska kunna välja “latest effective” utan att förlora originalspår
- klient får aldrig skicka overwrite-intent

# Test/control points

- originalevent ligger kvar efter correction
- export kan visa både råhändelse och effektivt utfall
- högriskcorrection kräver rätt approval

# Exit gate

- [ ] alla rättelser sker via append-only correction chain
- [ ] kontrollrapporter och exports bevarar originalspår
- [ ] högriskrättelser är policybundna och auditbara

