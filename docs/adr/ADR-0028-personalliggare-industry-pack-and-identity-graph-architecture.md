> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0028
- Title: Personalliggare Industry Pack and Identity Graph Architecture
- Status: Accepted
- Owner: Field compliance architecture and identity architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - personalliggare
  - field
  - HR
  - identity
- Related code areas:
  - `packages/domain-personalliggare/*`
  - `packages/domain-hr/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/personalliggare-engine.md`
  - `docs/domain/personalliggare-industry-packs.md`
  - `docs/runbooks/personalliggare-kiosk-device-trust.md`

# Purpose

Låsa att personalliggare inte får stanna som byggspecifik punktlösning utan ska byggas som en kärna med industry packs, workplace abstraction, identity graph och kiosk/device-trust-stöd.

# Status

Accepted.

# Context

Repo:t har redan en byggnära personalliggareidé, men den är för smal för att bära bredare fält- och närvarospårning eller ens en robust byggprodukt i fler entreprenörsled. Skatteverkets byggregler kräver elektronisk personalliggare när byggherren ska tillhandahålla utrustning och byggverksamheten passerar tröskeln på mer än fyra prisbasbelopp, med vissa undantag. Samtidigt behöver produkten modellera:

- arbetsplats
- byggherre
- entreprenör
- arbetsgivare
- verksam person
- kiosk och mobil
- offline och corrections

som skilda men sammanlänkade objekt.

# Problem

Om personalliggare förblir byggspecifik och platt uppstår:

- för svag identitetskedja
- otydlig gräns mellan employer, contractor och workplace
- dålig återanvändbarhet för fler branschpaket
- svårigheter att hantera kiosk/offline och korrekta corrections

# Decision

1. `personalliggare` ska byggas kring en generell workplace- och attendance-kärna.
2. Byggbranschen blir första industry pack, inte enda möjliga modell.
3. Ett identity graph ska länka verksam person, arbetsgivare, entreprenör, uppdrag och workplace snapshots.
4. Check-in/check-out ska vara append-only och corrections ska modellera rättelsehändelser, inte overwrite.
5. Kiosk och mobile ska konsumera samma attendancekärna men med olika device-trust-regler.

# Scope

Beslutet omfattar:

- workplace abstraction
- industry packs
- identity graph
- attendance events
- kiosk/device trust
- offline append-only

Beslutet omfattar inte:

- alla framtida branschpaket i detalj
- UI-layout

# Boundaries

`personalliggare` äger:

- workplace
- attendance event
- attendance correction
- industry pack rules
- employer/contractor snapshots within attendance context

`HR` äger:

- canonical employee and employment data

`field` äger:

- operativa arbetsorder och andra fältobjekt

`identity graph` inom personalliggare äger:

- spårbar koppling mellan attendancehändelse och rätt verksam person/arbetsgivare/entreprenör vid aktuell tidpunkt

# Alternatives considered

## Keep construction-specific model only

Avvisas eftersom det låser produkten till för smal struktur och gör komplexa entreprenörsled svåra att modellera.

## Merge personalliggare into ordinary time tracking

Avvisas eftersom personalliggare är ett egenreglerat kontrollspår, inte bara tidrapportering.

# Consequences

- personalliggare-domänen måste breddas
- HR- och field-kopplingar blir tydligare men inte sammansmälta
- mobile och kiosk behöver device-trust-regler och offline-kedja

# Migration impact

- befintlig construction-only modell måste lyftas till workplace + industry pack
- äldre attendance data kan behöva snapshot-berikas

# Verification impact

Verifiering måste visa att:

- byggpaketet följer nuvarande lagkrav
- attendance corrections bevarar originalhändelse
- kiosk och offline flödar in utan tyst mutation

# Exit gate

- [ ] personalliggare är inte längre bygghårdkodad kärna
- [ ] industry-pack-arkitektur och identity graph finns
- [ ] kiosk, mobile och corrections bygger på samma append-only attendance-model

