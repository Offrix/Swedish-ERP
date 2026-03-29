> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-005
- Title: Payroll Migration Cutover
- Status: Binding
- Owner: Payroll operations and migration governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated payroll migration cutover runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - payroll
  - balances
  - migration
- Related code areas:
  - `packages/domain-payroll/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/payroll-migration-and-balances-engine.md`
  - `docs/policies/payroll-migration-policy.md`

# Purpose

Beskriva hur lönecutover genomförs utan att förlora YTD, AGI-spår, saldon eller öppna differenser.

# When to use

- första löneinförande för tenant
- omstart av avbruten lönecutover

# Preconditions

- payroll migration policy är godkänd
- mapping av anställda, lönearter och saldon är låst
- diffkörning mellan källsystem och ERP är grön
- första målperiod är vald och låst

# Required roles

- payroll lead
- migration operator
- finance approver
- backoffice observer

# Inputs

- employee master import
- YTD import
- balances import
- open liabilities and deductions
- prior AGI references

# Step-by-step procedure

1. Verifiera att alla staging-importer är signerade och versionslåsta.
2. Verifiera att diffrapport är godkänd och att blockerande differenser är stängda.
3. Frys källsystemets ändringsfönster enligt cutoverplan.
4. Kör slutlig import av anställda, skattetabeller, SINK-beslut, avtal, saldon och YTD.
5. Generera migration preview för första målperioden.
6. Kontrollera nettolön, skatt, arbetsgivaravgifter, AGI constituents och balansbanker mot godkänd diffmall.
7. Lås opening balances och skapa migration receipt.
8. Aktivera första riktiga pay run i målmiljön.
9. Publicera cutoverbeslut och dokumentera källdatumsgräns.

# Verification

- samtliga anställda finns
- samtliga saldon stämmer mot signoffrapport
- YTD summerar korrekt
- första pay-run preview stämmer mot godkänd kontrollnivå

# Retry/replay behavior where relevant

- staging-importer får återköras fram till att opening balances låsts
- efter lock krävs explicit rollback eller ny migration version

# Rollback/recovery

- om lock inte skett: kasta migration draft och kör om
- om lock skett men första pay run inte godkänts: öppna incident och använd rollbackplan enligt policy

# Incident threshold

felaktig YTD, fel balansbank eller fel AGI constituent i preview är blockerande incident

# Audit and receipts

- cutover approval
- import hashes
- diff reports
- opening balance receipt
- lock decision

# Exit gate

- [ ] opening balances och YTD är låsta och auditbara
- [ ] första målperiodens preview är verifierad
- [ ] källdatumsgräns och ansvarskedja är dokumenterade

