> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 12.2 verification

## Syfte

Verifiera att skatt- och deklarationsunderlag kan materialiseras från låst årsunderlag, att moms/AGI/HUS-översikter går att härleda till intern numerik och att generiska submissions loggar kvittenser samt felköer utan att förstöra historik.

## När den används

- efter implementation av FAS 12.2
- före markering av 12.2 som klar
- efter ändringar i annual reporting, submissions, VAT, AGI, HUS eller myndighetsadapterlagret

## Förkrav

- ledger, reporting, annual reporting och integration boundary fungerar
- hårdstängd period finns för testbolaget
- migrations- och seedfiler för FAS 12.2 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase12-tax-submissions.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.

## Verifiering

- INK-, NE- och SRU-underlag materialiseras från låsta report snapshots med gröna interna checks
- moms-, AGI-, HUS- och SLP-översikter går att härleda till interna snapshot- eller submissionsobjekt
- submission envelopes loggar receipts append-only och särskiljer `received`, `accepted` och `finalized`
- transportfel skapar action queue-poster och retry förstör inte historikkedjan
- identiska receipts dedupliceras idempotent

## Vanliga fel

- `annual_report_period_not_closed`: perioden är inte `hard_closed`
- `submission_not_signed`: submission försöker skickas innan signering eller motsvarande godkänt steg
- `submission_retry_forbidden`: retry class blockerar tekniskt återförsök
- `submission_source_object_unsupported`: automatisk payloadbyggnad används på ett källaobjekt som inte stöds av 12.2

## Återställning

- rätta årsunderlaget och skapa ny årsrapportsversion i stället för att skriva över gammalt deklarationspaket
- låt transportfel gå via retrykedja eller action queue i stället för att manipulera receipts manuellt

## Rollback

- rulla tillbaka kodcommit om regressionen ligger i underlags- eller submissionlogiken
- rulla aldrig tillbaka appendad receipt-historik; skapa ny attempt eller ny payloadversion

## Ansvarig

- huvudagenten som levererar FAS 12.2

## Exit gate

- underlagsfiler matchar intern numerik
- submissions, receipts och action queue fungerar generiskt
- transportfel och domänfel leder till rätt operativt utfall

