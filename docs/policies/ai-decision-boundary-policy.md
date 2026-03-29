> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-001
- Title: AI Decision Boundary Policy
- Status: Binding
- Owner: Product governance, compliance architecture and security architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: Informal AI notes and generic automation guidelines
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - AI
  - documents
  - review center
  - payroll
  - ledger
  - VAT
- Related code areas:
  - `packages/rule-engine/*`
  - `packages/document-engine/*`
  - `packages/domain-review-center/*`
  - `apps/api/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/policies/document-review-and-economic-decision-policy.md`
  - `docs/test-plans/document-classification-ai-boundary-tests.md`

# Purpose

Sätta den hårda gränsen mellan AI som förslagssystem och systemets bindande ekonomiska, skattemässiga och regulatoriska beslut.

# Scope

Policyn gäller för:

- OCR-assisterad extraktion
- AI-baserad dokumentklassning
- förslag till kontering, momshantering och personkoppling
- förslag i review center
- sök, summering och stödfunktioner i UI

# Why it exists

Produkten får inte ge intryck av att AI har beslutat något som i själva verket kräver deterministiska regler eller mänsklig attest. Risken gäller särskilt bokföring, moms, HUS, AGI, förmåner och close.

# Non-negotiable rules

1. AI är förslag, aldrig slutligt ekonomiskt beslut.
2. AI får aldrig skapa slutligt ledger-posting-utfall utan att en deterministisk domänmotor och vid behov mänskligt beslut godkänner utfallet.
3. AI får aldrig skicka AGI, moms, HUS eller annual filing.
4. AI får aldrig ensam avgöra privat köp kontra bolagskostnad.
5. AI får aldrig ensam avgöra skattefri friskvård, skattepliktig förmån eller nettolöneavdrag i tvetydiga fall.
6. Deterministiska rulepacks har alltid företräde framför AI-förslag.
7. Låg confidence eller policyträff ska alltid skapa review.
8. AI måste kunna stängas av per tenant eller modul utan att kärnprodukten bryts.

# Allowed actions

- extrahera fält ur dokument
- föreslå klassning, kontering eller mottagare
- föreslå nästa åtgärd i review center
- generera sökbara sammanfattningar eller användarstöd

# Forbidden actions

- bokföra direkt i ledger
- godkänna eller signera submission
- fatta slutligt beslut om förmån, moms, HUS eller AGI
- kringgå reviewkrav
- dölja osäkerhet eller confidence från operatören

# Approval model

- policyändringar kräver godkännande från produktansvarig, compliance owner och säkerhetsansvarig
- aktivering av AI i högriskflöden kräver att testplan för AI-boundary är grön

# Segregation of duties where relevant

- modell- eller promptändring får inte ensamt räcka för att ändra ekonomiskt utfall
- den som godkänner AI-användning i ett högriskflöde får inte vara ensam ägare av dess produktionsrelease

# Audit and evidence requirements

För varje AI-förslag ska systemet kunna visa:

- input source
- model/version
- prompt or extraction mode
- confidence eller motsvarande beslutsunderlag
- vilka deterministiska regler som också träffade
- om människa godkände, ändrade eller avvisade förslaget

# Exceptions handling

Inga undantag får tillåta AI att bli slutlig ekonomisk beslutsmotor. Enda tillåtna undantag är att AI-funktioner kan begränsas eller stängas av helt.

# Backoffice/support restrictions where relevant

- support får inte använda AI-genvägar för att kringgå ordinär review eller attest
- backoffice får inte massgodkänna AI-förslag utan uttrycklig policygrund

# Runtime enforcement expectations

- alla AI-förslag ska materialiseras som suggestions eller drafts, inte som final states
- riskklassade flöden ska tvinga review center när osäkerhet eller policyträff finns
- kill switch ska finnas för AI i dokumentklassning och andra högriskytor

# Test/control points

- inga AI-förslag får skapa final ledger outcomes i tester
- boundarytester ska verifiera att rulepack vinner över AI-förslag
- UI ska tydligt visa att förslaget är ett förslag

# Exit gate

- [ ] AI-boundary är implementerad i policy och runtime
- [ ] review center fångar högriskförslag
- [ ] audit visar modell, confidence och mänskligt beslut
- [ ] kill switch finns och är testad

