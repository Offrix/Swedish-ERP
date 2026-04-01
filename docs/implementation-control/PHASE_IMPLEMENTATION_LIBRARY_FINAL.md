# PHASE_IMPLEMENTATION_LIBRARY_FINAL — Swedish ERP

Datum: 2026-03-29  
Status: bindande implementationsbibliotek för allt utom UI  
Granskare/författare: GPT 5.4 Pro — slutligt implementationsbibliotek

Detta dokument är bygginstruktionen som hör till `GO_LIVE_ROADMAP_FINAL.md`.  
Målet är att CODEX ska kunna bygga utan kritiska tolkningsfel.

## Hur nuvarande roadmap och bible har behandlats

### Det som behålls

- Nuvarande roadmap och bible har rätt **produktpositionering**: plattformen ska vara generell svensk företagsplattform, inte byggcentrerad.
- Nuvarande docs har rätt **makroordning** i att finance/payroll måste komma före general project core och vertikala packs.
- Nuvarande docs har rätt **trial/live-separationsriktning** och rätt intuition om operator-first support/backoffice.
- Nuvarande docs har rätt **rulepack/provider-baseline-tänk** och rätt intuition om unified receipts/recovery.

### Det som skrivs om eller förstärks

- Nuvarande docs använder många `[x]`-markeringar och återverifieringsnotiser som inte kan behandlas som bindande acceptansbevis för kodbasen här och nu.
- Secret governance, crypto och storage-regler är för abstrakta. De säger inte svart på vitt vad som måste krypteras, hash:as, tokeniseras eller förbjudas i snapshots.
- Migration/cutover är för cockpitorienterat och inte tillräckligt definierat som generell motor för många svenska källsystem och byråer.
- Owner distributions/aktieutdelning saknas som riktig domänkapabilitet.
- SIE4 import/export saknas som first-class kapabilitet trots att den är kritisk för revision, migration och byråsamarbete.
- Corporate tax / Inkomstdeklaration 2 är för tunt specificerat för att kunna byggas utan tolkning.
- Transaktionsgränserna är inte tillräckligt hårt definierade; mutate-then-persist-problemet måste lösas tekniskt, inte bara dokumentärt.
- Historiska `[x]`-markeringar blir icke-bindande.
- Faserna skrivs om så att bank-grade security, SIE4, owner distributions och generell migration får explicit plats.
- Blocker-traceability skrivs om så att alla F-001–F-066 får exakt fasplats.
- Paritet och advantage definieras som hårda gater, inte inspirationsavsnitt.


## Globala bindande invariants

1. Ingen regulerad eller ekonomisk write path utan idempotency key, audit envelope och evidence refs.
2. Ingen hemlighet i vanlig durable state eller snapshots.
3. Ingen simulering, demo-seed eller `supportsLegalEffect=false`-adapter får räknas som live coverage.
4. Ingen journal postas utan SEK/euro-redovisningsvaluta som primär balansvaluta enligt profil.
5. Ingen moms går till deklaration utan `VatDecision`.
6. Ingen payroll approval utan låst input fingerprint.
7. Negativ nettolön får aldrig raderas; den blir `EmployeeReceivable`.
8. Trial och live får aldrig dela credentials, receipts, provider refs, sequences eller legal effect.
9. Support får inte skriva direkt i databas; endast commands genom kontrollerade operations.
10. UI får inte kompensera för backendbrister och är inte acceptansbevis.



## Global source-of-truth matrix

| Domän / område | Äger | Får inte äga |
|---|---|---|
| `legal-form` | företagsform, obligationsprofil | ledgerbelopp, annual package artifacts |
| `fiscal-year` | räkenskapsår, periodprofiler | journal lines |
| `accounting-method` | timing policy för kontant/fakturering | open items eller journals direkt utan ledger path |
| `ledger` | journal truth, voucher series, balances | VAT-scenario truth, payroll gross/net truth, source documents |
| `ar` | invoice/open item truth | VAT-scenario engine, final bank statement truth |
| `ap` | supplier invoice/open item truth | VAT-scenario engine, bank statement truth |
| `vat` | `VatDecision`, declaration basis | invoice/open item masterdata |
| `banking` | bank statement events, settlement events | invoice truth, tax-account truth |
| `tax-account` | authority account mirror, offset truth | payroll gross/net truth |
| `hr` | employment truth | payroll calculations |
| `time` | approved time and absence truth | pay run truth |
| `balances` | vacation/flex balance truth | payroll gross/net truth |
| `collective-agreements` | executable rate overlays | pay run state |
| `payroll` | pay-run truth, AGI constituents, employee receivable | base HR or time truth |
| `travel` | trip and receipt truth | pay run truth, VAT declaration truth |
| `benefits` | benefit decision truth | pay run truth |
| `pension` | pension premium/policy truth | pay run truth |
| `hus` | HUS case/claim truth | invoice truth, general ledger truth |
| `annual-reporting` | annual package and declaration pack truth | ledger journals except via posting intents |
| `owner-distributions` | shareholder distribution truth | annual package truth, bank statement truth |
| `documents` | original artifact truth | final business decision truth |
| `review-center` | human review and exception truth | underlying domain objects |
| `integrations` | connection/capability/transport truth | business/legal domain truth |
| `migration` | source discovery, mapping, diff, cutover truth | final domain business truth after import |
| `support/backoffice` | support cases/incidents/replay ops | direct DB business state |



## Regulatoriska ankare som måste ligga i rulepacks eller baseline-register

Verifierade mot officiella svenska källor 2026-03-29:

| Område | Regel / värde som ska pinnas | Officiell källa |
|---|---|---|
| Arbetsgivaravgifter 2026 | full 31,42 %, 67+ 10,21 %, född 1937 eller tidigare 0 %, ungdomsnedsättning 20,81 % upp till 25 000 kr/mån 2026-04-01–2027-09-30 | Skatteverket |
| Växa-stöd 2026 | refund- och ansökningsmodell från 2026, inte dold inline-reduktion | Skatteverket |
| SINK / A-SINK 2026 | SINK 22,5 %, A-SINK 15 %, sjöinkomst-SINK 15 % | Skatteverket |
| Särskild löneskatt | 24,26 % på pensionskostnader | Skatteverket |
| ROT/RUT | ROT 30 % normalt; 50 % endast 2025-05-12–2025-12-31; RUT 50 % | Skatteverket |
| Traktamente 2026 | heldag 300 kr, halvdag 150 kr, natt 150 kr, frukost 60 kr, lunch/middag 105 kr | Skatteverket |
| Kostförmån 2026 | frukost 62 kr, lunch/middag 124 kr, heldag 310 kr | Skatteverket |
| Gåvogränser 2026 | julgåva 600 kr, jubileumsgåva 1 800 kr, minnesgåva 15 000 kr | Skatteverket |
| Prisbasbelopp / inkomstbasbelopp 2026 | 59 200 kr / 83 400 kr | Försäkringskassan / Skatteverket |
| Referensränta 2026-01-01–2026-06-30 | 2,00 % | Riksbanken |
| Dröjsmålsränta | referensränta + 8 procentenheter | Räntelagen + Riksbanken |
| Semesterregler | 25 dagar, spara dagar över 20 i 5 år, 0,43 % semestertillägg per betald dag enligt sammalöneregeln | Semesterlagen / Verksamt / Hallå konsument |
| Sjuklön | 80 %, karensavdrag 20 % av genomsnittlig veckoersättning, arbetsgivarperiod 14 dagar | Sjuklönelagen / Försäkringskassan |
| Bokföringslagen | öppningsbalans, redovisningsvaluta, bokföringstidpunkt, verifikation, arkivering | Sveriges riksdag / SFS |
| Mervärdesskattelagen | tax point, fakturakrav, avdragsrätt, avdragsförbud, investeringsvaror, förskott | Sveriges riksdag / SFS |
| Bolagsskatt | 20,6 % för aktiebolag/juridisk person | Skatteverket |
| KU31 / kontrolluppgifter | lämnas senast 31 januari året efter inkomståret; kupongskatt 30 % som huvudregel för begränsat skattskyldiga om inte avtal ger lägre sats | Skatteverket |



## Nya packages / moduler som ska skapas eller brytas ut

- `packages/domain-core/src/value-kernel.mjs`
- `packages/domain-core/src/validation.mjs`
- `packages/domain-core/src/clone.mjs`
- `packages/domain-core/src/security-classes.mjs`
- `packages/domain-core/src/crypto.mjs`
- `packages/domain-core/src/secrets.mjs`
- `packages/domain-core/src/transaction-boundary.mjs`
- `packages/domain-sie/src/index.mjs`
- `packages/domain-owner-distributions/src/index.mjs`
- nya domain-driven routefiler under `apps/api/src/` som ersätter kvarvarande phasebucket-rutter där det behövs



## Särskilt block — Bank-grade security architecture

### Normativa principer

1. **Ingen hemlighet får vara vanlig domänstate.** Domänstate och snapshots får bära `secretRef`, `keyVersion`, `maskedValue` och `fingerprint`, men aldrig rå TOTP-hemlighet, OAuth refresh token, webhook secret, signing secret, privat nyckel eller rå sessiontoken.
2. **Allt med juridisk eller regulatorisk effekt ska kunna stegas upp.** Submission send, payment approval, manual journal, period reopen, payroll approval, dividend payout, support write, break-glass, migration cutover och trial->live promotion kräver explicit action class och fresh step-up.
3. **Support får se minsta möjliga.** Support/backoffice arbetar mot maskade projektioner. Full detaljvisning kräver tillfällig, vattenmärkt, godkänd impersonation eller break-glass.
4. **Search, logs och exports är aldrig primär datahållare för känsligt innehåll.** De får endast bära maskade metadata eller explicit klassade, krypterade artifacts.
5. **KMS/HSM är obligatoriskt.** Appen får aldrig vara yttersta långsiktiga lagringsplats för signing keys eller rot-nycklar.

### Dataklassificering som är bindande

| Klass | Exempel | Får finnas i vanlig durable state | Krav |
|---|---|---|---|
| S0 | publika regelversions-id, feature flags utan hemligheter | Ja | ingen särskild kryptering utöver plattformens standard |
| S1 | intern driftmetadata, health refs, queue-ids | Ja | strukturerad loggning tillåten |
| S2 | affärskonfidentiell metadata utan känsliga personuppgifter | Ja | kryptering-at-rest på databasnivå, maskning i support där behövs |
| S3 | personnummer, bankkonton, löne-/skatteuppgifter, HUS-identiteter, dokumentutdrag med person-/finansdata | **Nej i klartext** | fältkryptering eller separat skyddat dataobjekt + blind index/HMAC för uppslag + maskning i alla sekundära projektioner |
| S4 | TOTP-hemligheter, OAuth refresh/access tokens, webhook secrets, API-nycklar, provider certifikat, session signing keys | **Nej** | endast i separat secret-lager med envelope encryption; domänstate får endast bära `secretRef` |
| S5 | privata signing keys, HSM-seal keys, långlivade root-/KEK-nycklar | **Nej** | endast icke-exporterbara KMS/HSM-nycklar; aldrig i applikationsdatabas eller snapshots |

### Exakt skyddsmatris

| Datatyp | Kryptera | Hasha / blind index | Tokenisera / pseudonymisera | Får ligga i snapshot/export | Kommentar |
|---|---|---|---|---|---|
| Sessiontoken | Nej som råtoken; lagras inte | **Ja**, HMAC-SHA-256 eller motsv. keyed hash | Ej nödvändigt | Endast hash/fingerprint | Råtoken får bara finnas hos klient |
| TOTP secret | **Ja**, i secrets-lager | Fingerprint endast för audit | Nej | **Nej** | Domain state får bara bära `secretRef` |
| Passkey public key | Valfritt | Credential id kan blind-indexeras | Nej | Ja, om inte attesteringsdata innehåller S3/S4 | Public key är inte hemlig men ska scopesättas |
| Provider OAuth token | **Ja**, i secrets-lager | Fingerprint för diff/audit | Nej | **Nej** | Inga råa tokens i logs/snapshots |
| Webhook secret | **Ja**, i secrets-lager | Fingerprint för rotation | Nej | **Nej** | Rotation minst per 90 dagar eller incident |
| Personnummer/samordningsnummer | **Ja** | **Ja**, blind index för equality lookup | Maskad projektion i stödytor | Endast maskerad form eller krypterat artifact | Sökindex får bara bära maskat värde |
| Bankkonto/IBAN/clearing | **Ja** | **Ja** | Ja, `last4` som metadata | Endast `last4`, bank label och krypterad ref | Inga fulla nummer i support/export som standard |
| Löne-/skattepayload | **Ja** för export, receipts, snapshots och dokumentobjekt | Ej generellt | Maskade läsmodeller | Endast krypterat artifact eller maskad projektion | Operativ rapportering arbetar på kontrollerade projektioner |
| Signing private key | **HSM/KMS only** | Nej | Nej | **Nej** | Endast key id/version i appstate |
| Dokument med payroll/tax/HUS-data | **Ja** | Checksumma/fingerprint | Maskad text för sök | Endast krypterat dokumentobjekt | OCR-fulltext får inte indexeras i klartext |

### Segmentering som är bindande

- **Publik edge-zon**: `apps/api/src/server.mjs`, webhook-ingress, public API. Får inte ha direktåtkomst till råa S4/S5-hemligheter.
- **Affärsdomän-zon**: domänpaket och worker. Får konsumera dekrypterade värden bara i kortlivad processminne när action class tillåter det.
- **Protected data-zon**: payroll, tax, HUS, documents och regulated receipts. All supportaccess går via maskade projektioner.
- **Secrets-zon**: KMS/HSM + secret store. Endast security-approved servicekonton får åtkomst.
- **Backoffice-zon**: masked read by default, write endast via godkänd action chain.

### Actions som måste få step-up + dual control

- manuell verifikation
- soft-lock override / period reopen
- payroll approval när run innehåller emergency manual tax, negative net pay write-off, off-cycle, garnishment override eller retro correction
- regulated submission send/retry efter fel
- owner distribution payout och kupongskatt override
- support write / impersonation / break-glass
- migration cutover, rollback execution och trial->live promotion
- secret rotation, webhook secret reset och provider credential replacement



## Särskilt block — Encryption and secrets handling

### Exakt vad som måste krypteras

Följande **måste** krypteras med envelope encryption och får inte lagras som vanlig domänstate:

- TOTP-hemligheter
- OAuth refresh/access tokens för adapters och source-system
- webhook-signing-hemligheter
- API-nycklar och provider credentials
- bankkonton, clearingnummer, IBAN/BIC och betalningsmandat
- personnummer/samordningsnummer i canonical storage
- HUS buyer identities
- payroll/tax submission payloads och signeringsrelaterade receipts
- dokument med payroll-, tax-, HUS- eller bankinnehåll
- trial/live promotion artifacts som innehåller S3/S4-data
- all rå data som används för kupongskatt/kontrolluppgifter när mottagare är person

### Exakt vad som måste hash:as

Följande **måste** lagras som hash eller blind index i stället för råvärde när funktionen inte kräver återläsning:

- sessiontoken
- recovery token / e-postverifieringstoken / reset token
- personnummer-uppslag (blind index utöver krypterad canonical value)
- bankkonto-uppslag (blind index utöver krypterad canonical value)
- provider secret fingerprints för rotation/diff
- OCR-/betalningsreferensfingerprints när equality lookup krävs

### Exakt vad som ska tokeniseras eller pseudonymiseras

- personnummer i search, activity, notifications, support och exported work items -> maskad form + stable internal reference
- bankkonto i UI-/supportnära reads -> `last4` + bank label + opaque ref
- payroll- och tax-related support lists -> employee reference + masked personidentifier + summary classes
- document extraction payloads -> masked projection i allmänna index; full payload endast i protected document object

### Exakt vad som aldrig får ligga i vanliga snapshots eller vanlig durable state

- råa TOTP-hemligheter
- råa provider tokens
- råa webhook secrets
- privata signing keys
- råa sessiontokens
- råa secret rotation payloads
- råa bankkonton/personnummer i support- eller search-snapshots
- okrypterade payroll/tax submission payloads
- bank-ID-/broker-sessioners tillfälliga bevis eller authorization artifacts som inte är avsedda som varaktig affärsreferens

### Exakt vad som får finnas som metadata men inte som plaintext

- `secretRef`
- `keyVersion`
- `maskedValue`
- `last4`
- `fingerprint`
- `providerConnectionId`
- `capabilityManifestRef`
- `tokenIssuedAt`, `tokenExpiresAt`
- `signingKeyId`
- `bankAccountLabel`



## Särskilt block — Key management and rotation

### Nyckelhierarki

1. **Mode root key** per mode (`sandbox`, `trial`, `test`, `production`) i KMS/HSM.
2. **Service KEK** per skyddsområde:
   - auth/factors
   - provider credentials
   - banking/payment data
   - payroll/tax/HUS identities
   - documents/receipts
   - signing/archive
3. **Tenant/data-class DEK** för varje skyddad objektfamilj.
4. **Blind-index keys** separat från krypteringsnycklar.

### Rotationskrav

| Nyckeltyp | Förvaring | Rotation | Kommentar |
|---|---|---|---|
| mode root key | KMS/HSM | minst årligen eller vid incident | ingen app-export tillåten |
| service KEK | KMS/HSM | minst var 90:e dag eller vid incident | dual-running overlap krävs |
| blind-index key | KMS/HSM | minst var 180:e dag | kräver omindexering/dual lookup under overlap |
| session signing key | KMS/HSM / secret store | minst var 30:e dag | gamla nycklar får verifiera under kort overlap |
| webhook secret | secret store | minst var 90:e dag eller på begäran | per endpoint/provider |
| provider OAuth credential | secret store | enligt provider policy eller max 90 dagar | roteras omedelbart vid incident |
| document object key | per artifact | per skrivning | wrap:as av service KEK |

### Rotationsprocedur som är bindande

1. skapa ny nyckelversion
2. publicera `RotationPlan`
3. slå på dual read/dual write där det behövs
4. re-wrap eller re-sign background batches
5. mät coverage
6. cut over
7. retire äldre version efter policyfönster
8. frysa evidence bundle med coverage, diff och signoffs

### Förbjudet

- hårdkodade secrets i kod eller seeds
- export av privata signing keys
- delade secrets mellan trial och live
- rotation utan evidence bundle
- manuell key-id-ändring direkt i affärsdomäner



## Särskilt block — Auth/MFA/BankID/passkeys/TOTP hardening

### Faktorpolicy

- Minst en stark faktor krävs för alla administratörer.
- BankID eller passkey är rekommenderad primär stark faktor för live.
- TOTP är tillåten som extra faktor eller fallback, men dess hemlighet får endast leva i secret store.
- Faktorändring, recovery och device trust reset kräver fresh step-up med annan faktor än den som ändras.

### Sessionspolicy

- Vanlig session: max 8 timmar absolut TTL, 30 min idle TTL.
- Privilegierad/backoffice-session: max 30 min absolut TTL, 10 min idle TTL.
- Fresh step-up-fönster för high-risk actions: max 5 minuter.
- Device trust måste vara separat objekt med egen TTL och revoke-stöd.

### Rate limiting och lockout som är bindande

- `startLogin`: max 5 misslyckade försök per konto / 15 min, max 20 per IP / 15 min, därefter backoff + riskflagga.
- `verifyTotp`: max 5 misslyckade försök per faktor / 10 min, max 10 per konto / 24 h, därefter faktorlock och recovery path.
- passkey enrollment/remove: max 3 kritiska försök / 30 min utan ny fresh step-up.
- BankID/order init: max 5 samtidiga öppna initiations per konto och max 10 per IP / 10 min.
- break-glass-initiering: max 2 öppna förfrågningar per incident.

### Anomaly detection som är bindande

- omöjlig geografi / ASN-hopp
- upprepade TOTP-fel
- upprepade BankID-init utan completion
- nytt device trust + high-risk action i samma session
- mass-export eller mass-view av S3-data
- upprepade webhook-signature-fel
- provider credential change följt av ovanlig callback-aktivitet
- supportadmin som begär många impersonations i rad

### Approval chains som är bindande

- support write: support lead + security admin
- break-glass: support lead + security admin + incident id
- period reopen / manual journal override: två olika finance principals
- submission send efter correction/retry: domain owner + signer/approver enligt policy
- dividend payout: finance approver + payment approver + evidence att stämmobeslut finns



## Särskilt block — One-click migration/import engine

### Vad “1-klick” betyder i denna styrning

Ett klick får **starta** discovery, source handshake, capability detection, extract-plan, initial auto-mapping, första diff och blockerlista.  
Det får **inte** hoppa över review, blockerare, signoff eller rollbackberedskap.

### Objektmodell

| Objekt | Minsta fält |
|---|---|
| `SourceSystemProfile` | `profileId`, `familyCode`, `vendorHint`, `sourceType`, `detectedCapabilities`, `evidenceRefs` |
| `SourceConnection` | `connectionId`, `profileId`, `authMethod`, `secretRef`, `grantedScopes`, `expiresAt` |
| `ConsentGrant` | `grantId`, `connectionId`, `scope`, `grantedAt`, `revokedAt` |
| `ExtractManifest` | `manifestId`, `profileId`, `datasetTypes`, `periodScope`, `sourceChecksum`, `createdAt` |
| `CanonicalDataset` | `datasetId`, `datasetType`, `schemaVersion`, `rowCount`, `checksum`, `lineageRefs` |
| `MappingSet` | `mappingSetId`, `datasetId`, `targetDomainCode`, `confidenceScore`, `overrideRefs`, `blockedFields` |
| `AutoMappingCandidate` | `candidateId`, `sourceField`, `targetField`, `confidence`, `ruleRef` |
| `VarianceReport` | `reportId`, `materialityClass`, `blockerCodes`, `differences`, `waiverRefs` |
| `ImportBatch` | `batchId`, `datasetId`, `status`, `resultCounts`, `evidenceRefs` |
| `ParallelRunPlan` | `planId`, `scopes`, `thresholds`, `sourcePeriods`, `signoffRefs` |
| `CutoverPlan` | `planId`, `freezeAt`, `finalExtractManifestRef`, `rollbackCheckpointRef`, `watchWindow` |
| `PromotionPlan` | `planId`, `sourceTenantId`, `targetTenantId`, `allowedObjectRefs`, `forbiddenObjectRefs` |

### State machine

`discovered -> connected -> extracted -> mapped -> dry_run_ready -> dry_run_completed -> review_required | ready_for_import -> imported -> reconciled -> parallel_run -> accepted -> cutover_ready -> cutover_started -> live_promoted | rolled_back`

### Exakt flöde

1. Starta discovery.
2. Identifiera source family via API metadata, filsignaturer, SIE-header, CSV-fingerprint eller bureau template.
3. Etablera auth/consent via adapter eller filuppladdning.
4. Kör extract till canonical datasets.
5. Kör auto-mapping.
6. Generera variance report och blocker codes.
7. Kör dry-run i isolerad trial/cutover workspace.
8. Kör review/signoff.
9. Försegla rollback checkpoint.
10. Kör final extract + delta.
11. Importera till live-target eller promotion target.
12. Kör parallel run där policy kräver det.
13. Godkänn cutover.
14. Bevaka watch window.
15. Stäng rollback window först när acceptance är formellt registrerad.

### Vad som kan vara helt automatiskt

- source detection
- adapter handshake där adapter finns
- extract av standarddataset
- initial auto-mapping
- första diff/variance report
- prefilled blockerlistor
- trial workspace bootstrap

### Vad som alltid kräver review

- osäker account mapping
- oklar VAT code mapping
- payroll YTD, semesterdagar, sjukhistorik, garnishment history
- shareholder/dividend history
- HUS history utan kompletta receipts
- legal form mismatch
- unsupported custom pay item semantics
- negative balances eller unexplained discrepancies över materiality threshold



## Särskilt block — Accounting-system and bureau migration strategy

### Strategi som är bindande

Plattformen ska byggas **generiskt först** och **vendor-specifikt därefter**.  
Primär arkitektur är source families, inte en lös koppling per enskilt varumärke.

### Source families

1. **API-led finance source**
2. **SIE4-led source**
3. **CSV/Excel-led source**
4. **File bundle / bureau handoff**
5. **Project/CRM-led source**
6. **Payroll-led source**
7. **Document/evidence-only source** (får bara komplettera, aldrig vara full ekonomisk sanning)

### Prioriteringsordning

- **Wave A (måste finnas före bred go-live)**: SIE4, CSV templates, Fortnox-liknande API, Visma-familj, Bokio-liknande exportvägar, byråstandardpaket för ekonomi och lön.
- **Wave B (måste finnas före competitor advantage i byrå/ops)**: PE Accounting/Specter-liknande mönster, spend/bank vendors, Teamleader/monday/Odoo/Zoho/HubSpot för project/commercial context.
- **Wave C**: resterande long-tail adapters.

### Bureau mode

Bureau mode måste ge:

- mallade mapping templates per source family
- portföljvy över kunder/cohorts
- återanvändbara blocker/waiver policyer
- batchad extract/import-planering
- delegationskedja mellan byrå och slutkund
- separata evidence bundles per klient



## Särskilt block — Aktieutdelning / owner distributions

### Bindande scope

- Aktieutdelning är **inte** ett sidospår i annual reporting.
- Det ska vara en egen domänkapabilitet med ledger, evidence, KU31 och kupongskatt.
- Enskild firma/handelsbolag använder inte dividend-flödet; deras egna uttag/insättningar respektive delägaruttag hanteras i egna profiler.

### Objektmodell

| Objekt | Minsta fält |
|---|---|
| `ShareClass` | `shareClassId`, `name`, `votesPerShare`, `dividendPriorityCode` |
| `ShareholderHoldingSnapshot` | `snapshotId`, `holderRef`, `shareClassHoldings`, `effectiveDate`, `evidenceRef` |
| `FreeEquitySnapshot` | `snapshotId`, `fiscalYearId`, `freeEquityAmount`, `basisReportRef`, `interimBalanceRef` |
| `BoardDividendProposal` | `proposalId`, `proposalDate`, `totalAmount`, `perShareAmount`, `liquidityAssessment`, `evidenceRefs` |
| `DividendDecision` | `decisionId`, `meetingDate`, `totalAmount`, `perShareAmount`, `signoffRefs`, `status` |
| `DividendPaymentInstruction` | `instructionId`, `decisionId`, `recipientRef`, `grossAmount`, `withholdingProfile`, `paymentDate` |
| `DividendJournalPlan` | `planId`, `decisionId`, `equityAccountRef`, `liabilityAccountRef`, `paymentAccountRef` |
| `KU31Draft` | `draftId`, `decisionId`, `recipientRef`, `fieldMap`, `filingYear` |
| `KupongskattRecord` | `recordId`, `recipientRef`, `withholdingRate`, `treatyEvidenceRef`, `amount` |

### State machine

`draft -> board_proposed -> review_pending -> stamma_ready -> stamma_resolved -> payable -> scheduled -> paid | partially_paid | reversed`

### Exakta valideringar

- legal form måste vara AB eller annan profil som uttryckligen stöder utdelning
- free equity måste vara bevisad via låst årsbokslut eller godkänd mellanbalans där lagen kräver det
- board proposal måste bära försiktighetsbedömning / likviditetsbedömning
- payout får inte ske före bindande beslut
- mottagare måste ha tax profile:
  - svensk privatperson
  - svenskt bolag
  - utländsk mottagare med kupongskatt/treaty evidence
- utländsk mottagare blockerar payout om kupongskatt/treaty path inte är komplett

### Bokföringskedja som är bindande

- förslag: **ingen** bokning
- stämmobeslut: omklassning från fritt eget kapital till beslutad utdelningsskuld enligt legal-form/BAS-profil
- utbetalning: skuld minskas, bank minskas
- innehållen kupongskatt: skuld till Skatteverket/authority component bokas samtidigt där tillämpligt
- rättelse/reversal: separat correction chain, aldrig tyst overwrite

### Rapportering som är bindande

- KU31 byggs från `DividendDecision` och `DividendPaymentInstruction`
- kontrolluppgifter ska kunna lämnas senast 31 januari året efter inkomståret
- kupongskattsposter måste kunna materialiseras, betalas och evidenssättas



## Särskilt block — SIE4 export/import strategy

### Bindande beslut

- SIE4 ska vara en egen first-class domain capability.
- Export och import är båda obligatoriska.
- SIE4 får aldrig reduceras till ”nice to have”.
- Revisors-, byrå- och migreringsflöden ska kunna använda SIE4 som minsta gemensamma språk.

### Export ska minst täcka

- företagsidentitet och räkenskapsår
- kontoplan
- ingående balanser
- verifikationer med serie, nummer, datum, text och rader
- dimensioner/objekt där de stöds i produkten
- closing entries
- referenser som gör att exporten kan spåras tillbaka till ledgern

### Import ska minst täcka

- kontoplan
- ingående balanser
- verifikationer
- dimensioner/objekt
- fiscal-year scope
- lineage mot importbatch och source checksum

### Regler

- export måste vara reproducerbar från låst ledgertruth
- import får aldrig skriva direkt till ledger utan importbatch + review + posting path
- verifikationsserier och nummer i intern ledger får inte skadas av importen
- unsupported SIE-konstruktioner måste ge blocker code, inte tyst dataförlust



## Särskilt block — VAT truth model

### Bindande huvudregel

**Ingen momsrelevant affärshändelse får nå deklaration eller ledger utan `VatDecision`.**

### `VatDecision` måste bära minst

- `decisionId`
- `scenarioCode`
- `jurisdictionCode`
- `taxPointDate`
- `sourceDomainCode`
- `sourceRef`
- `currencyCode`
- `originalAmounts`
- `sekAmounts`
- `rate`
- `declarationBoxes`
- `reverseChargeFlag`
- `ossFlag`
- `importFlag`
- `deductionRuleCode`
- `viesStatus`
- `rulepackRef`
- `evidenceRefs`

### Händelser som måste skapa `VatDecision`

- AR invoice
- AR credit note
- AR prepayment / advance payment
- AP supplier invoice domestic
- AP supplier credit
- EU purchase / sale scenarios
- import cases
- bad debt adjustment
- travel/expense receipts där avdragsgill moms finns
- bank-triggered VAT events endast om policy uttryckligen kräver det via accounting method

### State machine

`proposed -> pending_review | approved -> posted -> declared | corrected`

### Särskilda scenarier som måste finnas

- `GR`/`EL` normalisering för Grekland
- omvänd byggmoms
- EU-tjänsteundantag: fastighet, persontransport, evenemang, restaurang där relevant
- OSS
- importmoms
- pro rata / blandad verksamhet
- avdragsförbud: personbil, representation m.m.
- kundförlust och momsåterföring
- förskott och tax point vid betalning där reglerna kräver det
- accounting-method timing rules

### Deklarationsregel

VAT declaration byggs endast från `VatDecision` med status `approved` eller senare och rätt period-/close-state.



## Särskilt block — Payroll tax table engine / SINK / A-SINK / engångsskatt

### `TaxDecisionSnapshot` måste bära

- `decisionType` (`tabell`, `jamkning_fast`, `jamkning_procent`, `engangsskatt`, `sink`, `asink`, `emergency_manual`)
- `incomeYear`
- `municipalityCode`
- `tableCode`
- `columnCode`
- `validFrom`
- `validTo`
- `fixedAdjustmentAmount`
- `percentageAdjustment`
- `annualIncomeBasisAmount` för `engangsskatt`
- `decisionSource`
- `decisionReference`
- `evidenceRef`

Legacy-importer och gamla API-klienter får tillfälligt skicka `jamkning` respektive `a_sink`, men runtimebeteendet måste mappa dessa till samma regler som de kanoniska typerna ovan.

### `EmployerContributionDecisionSnapshot` måste bära

- `ageBucket`
- `fullRate`
- `reducedComponents`
- `thresholds`
- `vaxaEligibilityProfile`
- `legalBasisCode`
- `rulepackRef`

### Bindande regler 2026 (verifierade 2026-03-29)

- full arbetsgivaravgift: **31,42 %**
- 67+ vid årets ingång: **10,21 %**
- född 1937 eller tidigare: **0 %**
- tillfällig ungdomsnedsättning: **20,81 %** upp till **25 000 kr/mån** för utbetalningar **2026-04-01–2027-09-30**
- SINK: **22,5 %**
- A-SINK: **15 %**
- särskild löneskatt på pensionskostnader: **24,26 %**
- bolagsskatt / juridisk persons statliga inkomstskatt: **20,6 %**

### Beräkningsordning som är bindande

1. lås pay-run input fingerprint
2. klassificera varje pay item till tax/avgift/pension/travel/benefit class
3. beräkna kontant bruttolön
4. beräkna benefits
5. beräkna skattefria ersättningar
6. beräkna pensions-/salary exchange-effekter
7. välj tax decision snapshot
8. beräkna preliminärskatt eller SINK/A-SINK
9. beräkna arbetsgivaravgifter och växa-refund exposure
10. beräkna sjuklön/karens och semesterrelaterade poster
11. beräkna garnishment och prioriterade nettolöneavdrag
12. om nettot < 0 -> skapa `EmployeeReceivable`
13. bygg AGI constituents + employer totals
14. bygg posting intents
15. bygg payment batch / receivable recovery plan



## Särskilt block — HUS ledger and recovery chain

### Obligatoriska objekt

- `HusCase`
- `HusBuyerAllocation`
- `HusClaim`
- `HusDecision`
- `HusRecovery`
- `HusAuthorityReceivable`
- `HusCustomerReceivable`

### Bindande fält

- `laborCostInclVatAmount`
- `laborCostExVatAmount`
- `vatAmount`
- `buyerIdentityRef`
- `workDateRange`
- `serviceTypeCode`
- `propertyRef`
- `preliminaryReductionAmount`
- `usedAnnualCapAmount`
- `remainingAnnualCapAmount`
- `rulepackRef`

### Bindande kedja

1. skapa HUS case från faktura-/arbetsunderlag
2. validera buyer identity och årsutrymme
3. materialisera preliminary reduction
4. skapa claim-ready payload
5. submit claim
6. bokför authority receivable / clearing enligt posting intent
7. vid acceptance: clear authority receivable
8. vid partial acceptance: skapa difference path mot kund eller write-off enligt policy
9. vid recovery: boka authority payable/recovery path
10. vid payout: clear against bank/tax account according to settlement model



## Särskilt block — Negative net pay / employee receivable handling

### Bindande regel

Negativ nettolön får **aldrig** klippas till noll utan separat receivable chain.

### Objekt

- `EmployeeReceivable`
- `ReceivableSettlementPlan`
- `ReceivableOffsetDecision`
- `ReceivableWriteOffDecision`

### State machine

`open -> scheduled_offset -> partially_settled -> settled | written_off`

### Bindande bokföringsprincip

- pay run med negativt net skapar fordran på anställd
- senare pay run kan kvitta mot denna fordran endast via explicit offset decision
- write-off kräver review och egen posting intent
- AGI och payslip måste tydligt skilja mellan utbetald lön och kvarstående fordran



## Särskilt block — Durable persistence and transactional boundaries

### Skrivordning som är bindande

1. validera command envelope och idempotency key
2. ladda aggregate/version från repository
3. kör domänbeslut och generera nya events + derived artifacts
4. skriv `CommandRecord`, uppdaterat `AggregateEnvelope`, `DomainEventRecord`, `OutboxMessage` och eventuella `EvidenceArtifact` i **samma** transaktion
5. commit
6. först därefter returneras success
7. projections och externa adapters läser från outbox / event journal

### Förbjudet

- mutation i minne följd av best-effort save
- read/write-detektering via metodnamn
- snapshot som primär källa till affärssanning
- sidoeffekter före commit-ack



## Särskilt block — Trial/live separation

### Trial och live måste vara separata i

- tenant/company ids
- credentials och secret roots
- provider refs
- webhook endpoints
- sequence space (voucher, invoice, payroll batch, claims)
- legal receipts/evidence
- documents och search indexes
- job queues
- dashboards och alerts
- KMS key roots

### Promotionregler

- promotion är **inte** in-place
- endast uttryckligen tillåtna objekt får kopieras
- följande får **inte** följa med från trial:
  - sessions
  - secrets
  - legal receipts
  - provider order refs
  - trial-generated journal numbers
  - submission attempts



## Särskilt block — Support/backoffice/break-glass hardening

### Support får som default endast se

- maskade identiteter
- sammanfattande status
- blocker codes
- evidence refs
- correlation ids

### Support får aldrig som default se

- fullständiga personnummer
- fullständiga bankkonton
- råa payroll/tax payloads
- faktorhemligheter
- provider tokens
- privata signing keys

### Break-glass-regler

- kräver incident id
- kräver tvåpersonsgodkännande
- är tidsboxad
- ger vattenmärkt session
- alla writes går fortfarande via commands, aldrig direkt DB



## Särskilt block — Corporate tax and declaration pack

### Minimikrav

- `CurrentTaxComputation` måste vara first-class objekt, inte en note i annual-reporting.
- juridiska personer ska kunna bygga deklarationspaket för aktuell legal form-profil
- bolagsskatt för AB och ekonomiska föreningar ska beräknas med **20,6 %** på skattepliktigt resultat enligt gällande regler
- särskild löneskatt på pensionskostnader ska ingå i tax pack där tillämpligt
- tax account-mirror måste kunna kopplas till preliminärskatt, debiterad slutlig skatt, återbetalning och manuella justeringar

### Objekt

- `CurrentTaxComputation`
- `TaxAdjustmentLine`
- `DeferredTaxNote` (om och när stöd byggs)
- `DeclarationArtifact`
- `TaxDecisionMirror`

### Bindande kedja

1. låst report snapshot
2. current tax computation
3. declaration artifact build
4. signoff
5. submission/filing or controlled export
6. tax-account follow-up and discrepancy handling


## Fas 0 — Styrningsreset, supersession och scope-låsning

**Mål**  
Ogiltigförklara gamla självattesterade statusmarkeringar, göra denna roadmap och implementationsbiblioteket till enda bindande styrning, och låsa produkten som generell svensk företagsplattform.

**Varför fasen behövs**  
Nuvarande roadmap och bible har bra struktur men deras [x]-markeringar kan inte behandlas som leveransbevis. Utan ett hårt styrningsreset fortsätter gammal dokumentlogik att styra fel ordning och fel riskaptit.

**Exakt vad som ska uppnås**  
Ogiltigförklara gamla självattesterade statusmarkeringar, göra denna roadmap och implementationsbiblioteket till enda bindande styrning, och låsa produkten som generell svensk företagsplattform.

**Kodområden från zipen som påverkas**  
- /mnt/data/GO_LIVE_BLOCKERS_AND_FIXES.md
- docs/implementation-control/GO_LIVE_ROADMAP.md
- docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md
- docs/implementation-control/*
- scripts/lib/runtime-mode.mjs
- scripts/lib/runtime-diagnostics.mjs
- apps/api/src/platform.mjs
- apps/api/src/server.mjs

**Behåll**  
- Nuvarande fasdisciplin som arbetsform.
- Nuvarande förståelse att produkten är generell företagsplattform.
- Nuvarande riktning att trial/live och operator-stöd är egna problem att lösa.

**Förstärk / härda**  
- Dokumentsupersession, repo-referenser och no-go-regler.

**Skriv om**  
- All användning av äldre `[x]`-markeringar som om de vore acceptansbevis.

**Ersätt**  
- Historiska 'phase bucket'-berättelser med blocker- och gate-driven styrning.

**Ta bort / deprecate**  
- Gammal styrning som behandlar bygg/field som produktkärna.
- Alla påståenden om att simulatorer eller shell-ytor är live coverage.

**Migrera**  
- Traceability från blockerfil, nuvarande roadmap och nuvarande bible in i finaldokumenten.

**Nya objekt / objektmodell**  
- `GovernanceDecision(decisionId, supersedes, effectiveFrom, evidenceRefs)`
- `RoadmapGate(gateId, phaseId, type, status, evidenceRefs)`
- `BlockerTrace(blockerId, sourceDoc, targetSubphases)`

**Source of truth**  
`GO_LIVE_ROADMAP_FINAL.md` och `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` är enda bindande källor. Nuvarande `GO_LIVE_ROADMAP.md` och `PHASE_IMPLEMENTATION_BIBLE.md` blir historiska referenser.

**State machines**  
- `RoadmapGate: draft -> active -> passed | failed | waived`

**Commands**  
- `supersedeHistoricalRoadmap`
- `registerBlockerTrace`
- `publishNoGoRules`

**Events**  
- `governance.superseded`
- `roadmap.gate.published`
- `blocker.trace.registered`

**API-kontrakt**  
- `/v1/governance/roadmap-gates/*` (new, internal/backoffice only)

**Webhook-kontrakt**  
- Inga.

**Permissions**  
- security_admin
- platform_owner
- implementation_lead
- finance_architect

**Review boundaries**  
- Ingen produktionsfas får börja utan godkänt supersession-beslut.
- Waiver av no-go-regel kräver platform owner + security admin + finance owner.

**Blockerande valideringar**  
- Historiska docs får inte länkas som 'current' i repo-root eller release notes.
- Alla F-001–F-066 måste ha minst en target-subphase.

**Auditkrav / evidence / receipts**  
- Governance-beslut, no-go-policy-publicering, waiver-beslut och roadmap-publicering är audit-critical.

**Retry / replay / dead-letter / recovery**  
- Ej tillämpligt, men gate-publicering ska vara idempotent.

**Rulepacks / versionering / effective dating**  
- Inga.

**Testkrav**  
- Markdown link checks
- traceability completeness check
- release packaging check

**Golden scenarios**  
- Alla blockers syns i traceability-tabell.

**Migrations- / cutoverkrav**  
- Ingen.

**Runbooks som krävs**  
- `docs/runbooks/governance-supersession.md`
- `docs/runbooks/go-live-no-go-enforcement.md`

**Roadmap-delfaser och exakt implementation**  
- **0.1 [REWRITE][REMOVE/DEPRECATE]** — Ogiltigförklara historiska `[x]` och markera `GO_LIVE_ROADMAP.md` samt `PHASE_IMPLEMENTATION_BIBLE.md` som historiska input, inte som acceptansbevis.
- **0.2 [REWRITE]** — Behåll det som är rätt i nuvarande styrning: generell plattform, trial/live-separation, provider-baselines, project core efter finance/payroll och operator-first support.
- **0.3 [NEW BUILD]** — Skriv full blocker-traceability för alla findings F-001–F-066 samt nya obligatoriska arbetsobjekt som saknas i gamla dokument.
- **0.4 [REMOVE/DEPRECATE]** — Förbjud seed-, stub-, simulator- och phasebucket-antaganden som live coverage.
- **0.5 [NEW BUILD]** — Lås in saknade men obligatoriska kapabiliteter: bank-grade security, 1-klick migration/import, SIE4 import/export, aktieutdelning/owner distributions, corporate tax/tax declaration pack.
- **0.6 [OPERATIONALIZE]** — Sätt absoluta no-go-regler för live, parity och advantage.

**Exit gate**  
- Båda finaldokumenten finns och är ensamt bindande.
- Historiska statusmarkeringar är uttryckligen icke-bindande.
- Alla 66 blockers och nya obligatoriska byggposter har en fasplats.

## Fas 1 — Canonical value kernel, objektsemantik och runtime-ärlighet

**Mål**  
Skapa en enda sanning för pengar, procentsatser, kvantiteter, valutakurser, kloning, normalisering och identitets-/formatvalidering innan någon regulatorisk kedja får byggas vidare.

**Varför fasen behövs**  
Repoet använder inkompatibla `roundMoney`, `normalizeMoney`, `copy` och `clone` över domäner. Så länge värdekärnan inte är enhetlig kommer varje senare domänbygge att reproducera fel matematik och fel serialisering.

**Exakt vad som ska uppnås**  
Skapa en enda sanning för pengar, procentsatser, kvantiteter, valutakurser, kloning, normalisering och identitets-/formatvalidering innan någon regulatorisk kedja får byggas vidare.

**Kodområden från zipen som påverkas**  
- packages/domain-core/src/value-kernel.mjs (new)
- packages/domain-core/src/validation.mjs (new)
- packages/domain-core/src/clone.mjs (new)
- packages/domain-ledger/src/index.mjs
- packages/domain-ar/src/index.mjs
- packages/domain-ap/src/index.mjs
- packages/domain-vat/src/index.mjs
- packages/domain-payroll/src/index.mjs
- packages/domain-banking/src/index.mjs
- packages/domain-reporting/src/index.mjs
- packages/domain-annual-reporting/src/index.mjs
- packages/domain-benefits/src/index.mjs
- packages/domain-travel/src/index.mjs
- packages/domain-pension/src/index.mjs
- packages/domain-hus/src/index.mjs
- packages/domain-projects/src/index.mjs
- packages/document-engine/src/index.mjs
- packages/domain-integrations/src/index.mjs
- packages/domain-field/src/index.mjs
- packages/domain-personalliggare/src/index.mjs
- packages/domain-kalkyl/src/index.mjs

**Behåll**  
- Affärsdomänernas semantik, men inte deras lokala money/clone helpers.

**Förstärk / härda**  
- Anropare till money/value helpers i ledger, AR/AP, payroll, VAT, banking, reporting, HUS, travel, pension och projects.

**Skriv om**  
- Alla lokala `roundMoney`, `normalizeMoney`, `copy`, `clone`, `normalizeDate`-familjer.

**Ersätt**  
- Hårdkodad BAS/DSAM i `packages/domain-ledger/src/index.mjs` med importerad, versionerad data.

**Ta bort / deprecate**  
- Lokala helperkopior i domänerna.
- Implicit `undefined -> NaN`-semantik.

**Migrera**  
- Konsumenter till nya `value-kernel`-API:t.
- Kontoplan och valideringsregler till data-/validation-kärna.

**Nya objekt / objektmodell**  
- `MoneyAmount(amountMinor, currencyCode, scale, source)`
- `Rate(numerator, denominator, precision, source)`
- `FxRate(baseCurrency, quoteCurrency, rate, rateScale, source, observedAt)`
- `AccountCatalogVersion(versionId, sourceName, checksum, effectiveFrom)`
- `ValidatedIdentifier(type, normalizedValue, maskedValue, fingerprint)`

**Source of truth**  
`packages/domain-core/src/value-kernel.mjs`, `packages/domain-core/src/validation.mjs` och en versionerad BAS/DSAM-datakälla blir enda tillåtna sanning för pengar, rates, fx, identifiers och account metadata.

**State machines**  
- Ingen lång state machine; dessa är immutabla värdeobjekt med versionerade källor.

**Commands**  
- `publishValueKernelVersion`
- `publishAccountCatalogVersion`
- `validateIdentifier`
- `normalizeValuePayload`

**Events**  
- `value_kernel.version.published`
- `account_catalog.version.published`

**API-kontrakt**  
- Inga publika API:er; endast intern konsumtion från domäner.

**Webhook-kontrakt**  
- Inga.

**Permissions**  
- platform_owner
- finance_architect
- security_admin (för identifierklassning)

**Review boundaries**  
- Förändringar i rounding/normalization kräver finance + payroll + VAT review.
- Nya identifiernormer kräver security + domain owner review.

**Blockerande valideringar**  
- Ingen domän får skapa lokal `roundMoney`/`normalizeMoney`.
- `GR` och `EL` måste resolve:a till samma VAT country meaning.
- `undefined`/`null` får aldrig ge `NaN`.

**Auditkrav / evidence / receipts**  
- Versionpublicering av value kernel och account catalog.

**Retry / replay / dead-letter / recovery**  
- Value normalization ska vara ren och idempotent; inga side effects.

**Rulepacks / versionering / effective dating**  
- BAS/DSAM account catalog versioneras separat men kopplas till rulepack registry.

**Testkrav**  
- Cross-domain rounding suite
- cross-domain normalize suite
- clone semantics suite
- BAS/DSAM checksum + accountClass tests
- identifier normalization tests

**Golden scenarios**  
- Samma belopp genom AR->VAT->ledger->reporting ger samma minor units.
- `EXPENSE_REIMBURSEMENT` input kan representeras utan rounding drift.

**Migrations- / cutoverkrav**  
- Alla importer går genom denna kärna innan mapping och diff.

**Runbooks som krävs**  
- `docs/runbooks/value-kernel-publication.md`
- `docs/runbooks/account-catalog-update.md`

**Roadmap-delfaser och exakt implementation**  
- **1.1 [REWRITE][HARDEN]** — Inför `packages/domain-core/src/value-kernel.mjs` med canonical `MoneyAmount`, `Rate`, `Quantity`, `FxRate`, `roundMoney`, `normalizeAmount`, `normalizePositiveAmount`, `normalizeSignedAmount`, `roundRate`, `roundQuantity`.
- **1.2 [REPLACE][REMOVE/DEPRECATE]** — Byt ut alla lokala `copy`/`clone`/`structuredClone`/`JSON.parse(JSON.stringify())` mot ett kontrollerat clone-API med definierad behandling av datum, `undefined`, `Map`, `Set`, binärdata och snapshots.
- **1.3 [REWRITE][MIGRATE]** — Externalisera BAS/DSAM-tabeller och kontometadata från hårdkodad källkod till versionerad datafil med checksumma, källa och importerbar validering.
- **1.4 [HARDEN]** — Gör runtime mode och provider capability truth explicit: inga simulatorer, demo-seeds eller `supportsLegalEffect=false`-adaptrar får maskeras som live.
- **1.5 [NEW BUILD]** — Inför central valideringskärna för organisationsnummer, personnummer/samordningsnummer, OCR-/betalningsreferenser, VAT-nummer-normalisering (`GR`/`EL`) och datum/tidszonnormalisering.

**Exit gate**  
- Ingen ekonomisk eller regulatorisk domän använder lokal money/clone-helper.
- BAS/DSAM-data kommer från versionsstyrd källa, inte hårdkodad tabellmassa.
- Valideringskärnan används av auth, AR/AP, VAT, HUS, payroll och migration.

## Fas 2 — Durable persistence, transaktionsgränser, outbox, replay och recovery

**Mål**  
Göra varje muterande kommando atomärt, idempotent, versionssatt och återställbart över alla domäner, inte bara ett urval i `CRITICAL_DOMAIN_KEYS`.

**Varför fasen behövs**  
Nuvarande plattform muterar ofta först och sparar sedan. Stora delar av produkten saknar central durability. Det är inte driftbart för ekonomi, lön, HUS, support eller migration.

**Exakt vad som ska uppnås**  
Göra varje muterande kommando atomärt, idempotent, versionssatt och återställbart över alla domäner, inte bara ett urval i `CRITICAL_DOMAIN_KEYS`.

**Kodområden från zipen som påverkas**  
- apps/api/src/platform.mjs
- apps/worker/src/worker.mjs
- packages/domain-core/src/command-log.mjs
- packages/domain-core/src/repositories.mjs
- packages/domain-core/src/repositories-postgres.mjs
- packages/domain-core/src/critical-domain-state-store.mjs
- packages/domain-core/src/state-snapshots.mjs
- packages/domain-core/src/jobs.mjs
- packages/domain-core/src/resilience.mjs
- packages/domain-core/src/transaction-boundary.mjs (new)
- packages/db/migrations/*.sql
- alla produktionsdomäner som idag inte ligger bakom central durability

**Behåll**  
- Domänlogiken i sig, men inte in-memory- eller proxy-tricket som idag omger den.

**Förstärk / härda**  
- `apps/api/src/platform.mjs`, `apps/worker/src/worker.mjs`, `packages/domain-core/src/state-snapshots.mjs`.

**Skriv om**  
- Persistence-proxy, worker-attempt lifecycle, snapshot import/export semantics.

**Ersätt**  
- Namnheuristik för read/write med explicit transactional metadata.
- Best-effort save efter mutation med commit-först logik.

**Ta bort / deprecate**  
- Memory-only affärsdomäner.
- Implicit state success utan commit-ack.

**Migrera**  
- Alla domäner till repository + command journal + outbox.
- Gamla snapshots till versionsstyrda schema snapshots.

**Nya objekt / objektmodell**  
- `CommandRecord(commandId, aggregateType, aggregateId, idempotencyKey, status, requestedBy, requestedAt)`
- `AggregateEnvelope(aggregateId, aggregateType, version, stateRef)`
- `DomainEventRecord(eventId, aggregateId, version, eventType, payloadRef)`
- `OutboxMessage(messageId, topic, payloadRef, status, retryCount)`
- `SnapshotArtifact(snapshotId, schemaVersion, classMask, checksum)`
- `RollbackCheckpoint(checkpointId, scope, snapshotRefs, createdAt)`

**Source of truth**  
Repository-lagret (`repositories-postgres.mjs`) och command journal är primär sanning. Snapshots, projections och caches är sekundära artefakter.

**State machines**  
- `CommandRecord: received -> executing -> committed | rejected | dead_lettered`
- `OutboxMessage: pending -> dispatched | failed | dead_lettered`
- `RollbackCheckpoint: open -> sealed -> used | expired`

**Commands**  
- `executeCommandTransaction`
- `sealRollbackCheckpoint`
- `importSnapshotArtifact`
- `replayOutboxWindow`
- `markWorkerAttemptFailed`

**Events**  
- `command.committed`
- `command.rejected`
- `outbox.dispatched`
- `snapshot.imported`
- `rollback.checkpoint.sealed`

**API-kontrakt**  
- Interna repository APIs; operativa routes under `/v1/backoffice/replay/*`, `/v1/backoffice/checkpoints/*` (new).

**Webhook-kontrakt**  
- Inga nya; webhook deliveries sker via outbox och adapter layer i fas 15.

**Permissions**  
- platform_owner
- incident_commander
- support_admin (read only until phase 17)

**Review boundaries**  
- Rollback-checkpoints för regulated scopes kräver dual review vid användning.
- Schema migration med data rewrite kräver DBA/finance/security signoff.

**Blockerande valideringar**  
- Muterande calls får inte returnera success före commit.
- Snapshot import med okända eller saknade kritiska fält failar hårt.
- Worker attempt måste kunna markeras failad även vid early crash.

**Auditkrav / evidence / receipts**  
- Alla commits, replays, snapshot imports och rollback-checkpoint actions auditloggas.

**Retry / replay / dead-letter / recovery**  
- Outbox och worker använder explicit retry policy med backoff och dead-letter reason codes.

**Rulepacks / versionering / effective dating**  
- Schema versions och migration versions är egna technical baselines.

**Testkrav**  
- atomic commit tests
- optimistic concurrency tests
- crash recovery tests
- snapshot schema compatibility tests
- dead-letter replay tests

**Golden scenarios**  
- Restart under pågående pay run ger antingen committed eller cleanly rejected resultat; aldrig split-brain.

**Migrations- / cutoverkrav**  
- Checkpoint krävs före varje destructive import, cutover och promotion.

**Runbooks som krävs**  
- `docs/runbooks/transaction-boundary.md`
- `docs/runbooks/replay-and-dead-letter.md`
- `docs/runbooks/rollback-checkpoints.md`

**Roadmap-delfaser och exakt implementation**  
- **2.1 [REWRITE][MIGRATE]** — Lägg alla produktionsdomäner bakom riktiga repositories med versionsfält, optimistic concurrency och explicit durabilitypolicy. Inga memory-only affärsdomäner tillåts.
- **2.2 [REWRITE][HARDEN]** — Ersätt mutate-then-persist med `command_journal + aggregate_state + domain_events + outbox_messages + evidence_refs` i samma commit. `apps/api/src/platform.mjs` får inte gissa read/write via metodnamn.
- **2.3 [REWRITE]** — Gör snapshot import/export schema-aware, versionsstyrd och fail-fast. Snapshot är återställningsartefakt, inte primär sanning.
- **2.4 [HARDEN]** — Bygg worker-attempt-livscykel med claim, heartbeat, retry, dead-letter, replay och säker fail-markering även när attempt-starten kraschar.
- **2.5 [REPLACE]** — Gör Postgres-migrationslagret bindande för runtime istället för sidovagn. CHECK/FK/UNIQUE/index måste spegla domänregler och användas av applikationen.
- **2.6 [OPERATIONALIZE]** — Inför restore checkpoints, replay drills, projection rebuild-gates och commit-lag-övervakning.

**Exit gate**  
- Alla muterande endpoints går genom atomär commit-path.
- Alla produktionsdomäner har durabilitypolicy och restart-bevis.
- Worker, replay och dead-letter är bevisat återupptagbara.

## Fas 3 — Bank-grade security foundation och dataklassificering

**Mål**  
Flytta hela produkten från ad hoc-hemligheter och plaintext-risk till explicit dataklassificering, KMS/HSM-styrd kryptering, tokenisering, blind indexes, rate limiting och riskkontroller.

**Varför fasen behövs**  
TOTP-secrets ligger i klartext, login/TOTP saknar throttling, API-edge saknar basala skydd och vanliga snapshots kan bli läckkanal. Det duger inte för löne-, skatte- och bankdata.

**Exakt vad som ska uppnås**  
Flytta hela produkten från ad hoc-hemligheter och plaintext-risk till explicit dataklassificering, KMS/HSM-styrd kryptering, tokenisering, blind indexes, rate limiting och riskkontroller.

**Kodområden från zipen som påverkas**  
- packages/domain-core/src/security-classes.mjs (new)
- packages/domain-core/src/crypto.mjs (new)
- packages/domain-core/src/secrets.mjs (new)
- packages/domain-org-auth/src/index.mjs
- packages/auth-core/src/index.mjs
- apps/api/src/server.mjs
- apps/api/src/route-helpers.mjs
- packages/domain-core/src/backoffice.mjs
- packages/domain-core/src/state-snapshots.mjs
- packages/domain-documents/src/index.mjs
- packages/domain-evidence/src/index.mjs
- packages/domain-integrations/src/providers/*.mjs

**Behåll**  
- Tanken på secret governance och restore drills från nuvarande bible.

**Förstärk / härda**  
- Org-auth/auth-core storage, provider credentials, webhooks, support flows, logs, search projections, snapshots.

**Skriv om**  
- Plaintext TOTP, unscoped secret handling, loose API edge protection.

**Ersätt**  
- Vanlig durable state för secrets med separat secret-lager och key refs.

**Ta bort / deprecate**  
- TOTP secrets i snapshots/exporter.
- Plaintext provider tokens i business state.
- Omaskerade personnummer/banknummer i stödytor.

**Migrera**  
- Auth factors, provider creds, webhook secrets, signing material och sensitive fields till klassad storage.

**Nya objekt / objektmodell**  
- `ClassifiedField(classCode, storageMode, maskPolicy, indexPolicy)`
- `SecretRef(secretId, classCode, keyVersion, owner, mode)`
- `BlindIndex(indexId, purpose, keyVersion, digest)`
- `RotationPlan(rotationId, secretClass, oldKeyVersion, newKeyVersion, overlapUntil)`
- `SecurityIncident(incidentId, severity, openedAt, relatedEvidenceRefs)`

**Source of truth**  
`packages/domain-core/src/security-classes.mjs`, `crypto.mjs`, `secrets.mjs` plus KMS/HSM och mode-separerat secrets-lager är enda sanning för hemligheter och skyddade fält.

**State machines**  
- `RotationPlan: planned -> dual_running -> rewrapped -> cut_over -> retired`
- `SecurityIncident: open -> contained -> remediated -> closed`

**Commands**  
- `classifyField`
- `storeSecretMaterial`
- `rotateSecretClass`
- `rewrapSensitiveFieldSet`
- `registerSecurityIncident`

**Events**  
- `secret.stored`
- `secret.rotated`
- `field.rewrapped`
- `security.incident.opened`

**API-kontrakt**  
- Interna security admin routes under `/v1/security/*` och masked config views under backoffice.

**Webhook-kontrakt**  
- Alla inbound webhooks måste ha signature metadata, replay window och delivery evidence; definieras i fas 15 men policy här.

**Permissions**  
- security_admin
- platform_owner
- incident_commander

**Review boundaries**  
- Alla rotationer för S4/S5 kräver tvåpersonsgodkännande.
- Exception för plaintext-lagring är förbjudna för S4/S5 och kräver security incident om upptäckta.

**Blockerande valideringar**  
- Sessiontokens lagras bara som HMAC/hash.
- TOTP secrets, provider tokens och signing secrets får aldrig ligga i domain snapshots.
- Personnummer och bankkonton måste ha maskpolicy och blind index innan persistence.

**Auditkrav / evidence / receipts**  
- Secret access, failed rate-limit decisions, risk escalations, anomaly hits och rotationer auditloggas.

**Retry / replay / dead-letter / recovery**  
- Rotation och rewrap är resumable jobs med checkpoint.

**Rulepacks / versionering / effective dating**  
- Risk thresholds kan ligga i security policy packs, inte i affärsdomänkod.

**Testkrav**  
- classification matrix tests
- secret redaction tests
- rotation dual-run tests
- rate-limit tests
- masked projection tests

**Golden scenarios**  
- Export av durable state innehåller inga råa TOTP-hemligheter eller provider tokens.

**Migrations- / cutoverkrav**  
- Source-system credentials i migration lagras som SecretRef med TTL och revocation.

**Runbooks som krävs**  
- `docs/runbooks/security-data-classification.md`
- `docs/runbooks/key-rotation.md`
- `docs/runbooks/security-incident-response.md`

**Roadmap-delfaser och exakt implementation**  
- **3.1 [NEW BUILD][SECURE]** — Inför central data- och secretklassificering (`S0` offentlig metadata, `S1` intern drift, `S2` business confidential, `S3` regulated personal/finance, `S4` secrets/factors/credentials, `S5` non-exportable signing keys).
- **3.2 [NEW BUILD][SECURE]** — Inför KMS/HSM-baserad envelope encryption, separat secrets-lager, blind-index/HMAC för uppslag och full snapshot-redaction för S4/S5-data.
- **3.3 [SECURE][REWRITE]** — Kryptera eller tokenisera personnummer, bankkonton, löne-/skattepayloads, provider tokens och webhook secrets enligt klassmatrisen. Sessiontokens lagras bara som HMAC-hash. TOTP-hemligheter lagras endast krypterade via secret-ref.
- **3.4 [SECURE][HARDEN]** — Härda API edge: body size limit, request timeout, origin policy, security headers, signed webhooks, anti-replay, abuse throttling, cookie/CSRF-regler där cookies används.
- **3.5 [SECURE][NEW BUILD]** — Bygg rate limiting, lockout, anomaly detection och risk scoring för login, TOTP, passkey enrollment, BankID initiation, provider callback spikes, exportmassor, support access och break-glass.
- **3.6 [SECURE][OPERATIONALIZE]** — Inför nyckelrotation, credential rotation, certifikatrotation, emergency revoke och incident response som operativ standard.

**Exit gate**  
- Ingen hemlighet, faktorhemlighet, provider token eller signing secret ligger i vanlig durable state eller snapshot.
- KMS/HSM, rotation, blind indexes och edge controls är i drift.
- Riskmotor och lockout fungerar för auth och high-risk actions.

## Fas 4 — Audit, evidence, observability, canonical contracts och permission resolution

**Mål**  
Standardisera alla envelopes, auditspår, evidence packs, permission boundaries och driftlarm så att systemet går att styra, granska och supporta utan handpåläggning.

**Varför fasen behövs**  
Nuvarande kod har blandade route-familjer, varierande felkontrakt och för grova basbehörigheter. Utan hårda kontrakt och evidens blir resten dyrt att driva och svårt att bevisa.

**Exakt vad som ska uppnås**  
Standardisera alla envelopes, auditspår, evidence packs, permission boundaries och driftlarm så att systemet går att styra, granska och supporta utan handpåläggning.

**Kodområden från zipen som påverkas**  
- packages/events/src/index.mjs
- packages/domain-evidence/src/index.mjs
- packages/domain-observability/src/index.mjs
- packages/domain-review-center/src/engine.mjs
- packages/domain-activity/src/engine.mjs
- packages/domain-notifications/src/engine.mjs
- packages/domain-search/src/engine.mjs
- apps/api/src/route-helpers.mjs
- apps/api/src/server.mjs
- apps/api/src/phase*-routes.mjs
- apps/worker/src/worker.mjs

**Behåll**  
- Nuvarande riktning med canonical envelopes och review center som tydlig boundary.

**Förstärk / härda**  
- Audit/evidence across all packages.
- Route decomposition and error contracts.

**Skriv om**  
- Grova permissions, phasebucket routes och blandade payload shapes.

**Ersätt**  
- Basrollstyrning med action/resource policies.
- Ad hoc logs med canonical audit/evidence packs.

**Ta bort / deprecate**  
- Routes som blandar unrelated concerns i phase files.
- Felmeddelanden med rå intern semantik till klient.

**Migrera**  
- Existerande routes till domändrivna familjer.
- Gamla audit writers till canonical envelope.

**Nya objekt / objektmodell**  
- `AuditEnvelope(auditId, actionClass, actorId, sessionId, trustLevel, objectRefs, evidenceRefs)`
- `EvidenceBundle(bundleId, bundleType, checksum, retentionClass, artifactRefs)`
- `PermissionPolicy(policyId, resourceType, actionClass, decisionRules)`
- `ApiError(errorCode, httpStatus, retryable, userMessageKey)`

**Source of truth**  
Canonical envelopes i `packages/events/src/index.mjs` och `packages/domain-evidence/src/index.mjs` blir enda tillåtna format för audit, evidence och error contracts.

**State machines**  
- `EvidenceBundle: open -> frozen -> archived`
- `PermissionPolicy: draft -> active -> retired`

**Commands**  
- `writeAuditEnvelope`
- `freezeEvidenceBundle`
- `publishPermissionPolicy`
- `registerApiContractVersion`

**Events**  
- `audit.written`
- `evidence.bundle.frozen`
- `permission.policy.published`
- `api.contract.versioned`

**API-kontrakt**  
- Domänspecifika routefamiljer under `/v1/<domain>/*`; phasebucket-filer ska brytas upp och ersättas.

**Webhook-kontrakt**  
- Error envelopes och receipt contracts gäller även webhook callbacks där relevant.

**Permissions**  
- domain_owner
- security_admin
- support_admin (masked only)
- auditor (read evidence only)

**Review boundaries**  
- SoD-policyer för manual journal, payroll overrides, submission send, migration signoff, owner distribution payout.

**Blockerande valideringar**  
- Alla muterande endpoints kräver idempotency key.
- Felkontrakt får inte exponera intern stack/exceptiontext.
- Permissions måste vara server-side resolved per action class.

**Auditkrav / evidence / receipts**  
- All policy publication, route contract change och evidence export auditloggas.

**Retry / replay / dead-letter / recovery**  
- Retryable/non-retryable error codes måste vara definierade per action.

**Rulepacks / versionering / effective dating**  
- Action classes och review boundaries kan referera policy packs.

**Testkrav**  
- route contract tests
- permission matrix tests
- evidence integrity tests
- error envelope tests

**Golden scenarios**  
- Samma payroll error kan tolkas likadant via API, worker log och support cockpit.

**Migrations- / cutoverkrav**  
- Migration och support-API använder samma envelope- och permissionregler.

**Runbooks som krävs**  
- `docs/runbooks/api-contract-versioning.md`
- `docs/runbooks/evidence-export.md`

**Roadmap-delfaser och exakt implementation**  
- **4.1 [HARDEN]** — Inför canonical command-, event-, error-, receipt- och audit-envelope över alla domäner och workerflöden.
- **4.2 [NEW BUILD]** — Bygg evidence-bundle-kedja för filings, support, cutover, owner distributions, payroll approvals och close/reopen.
- **4.3 [HARDEN]** — Inför invariant alarms, queue-age alarms, projection-lag, provider-health, risk alarms och restore-drill telemetry.
- **4.4 [REWRITE]** — Bryt upp phasebucket-routes till domain-driven routefamiljer och tvinga inputvalidering, body limits, typed error codes och idempotency keys.
- **4.5 [REWRITE][SECURE]** — Skriv om permissions från grova roller till action/resource-policys med separation of duties, review boundaries och masked projections.

**Exit gate**  
- Alla muterande calls använder canonical envelopes och idempotency keys.
- Evidence-bundle finns för alla regulatoriska och finansiella high-risk actions.
- Route space och permission enforcement är domänstyrt, inte fasstyrt.

## Fas 5 — Rulepack-registry, regulatoriska baselines och provider-baselines

**Mål**  
Göra alla lagstyrda procentsatser, tabeller, trösklar, klassificeringar, basbelopp och provider-format versionerade, effective-dated, historiskt pinnade och rollbackbara.

**Varför fasen behövs**  
Regler ligger idag delvis hårdkodade i kod. Felaktig 2025-ROT och 2026-konstanter visar att governance måste vara förstaklassig, inte ett årligt kodgrep.

**Exakt vad som ska uppnås**  
Göra alla lagstyrda procentsatser, tabeller, trösklar, klassificeringar, basbelopp och provider-format versionerade, effective-dated, historiskt pinnade och rollbackbara.

**Kodområden från zipen som påverkas**  
- packages/rule-engine/src/index.mjs
- packages/rule-engine/src/change-calendar.mjs
- packages/domain-benefits/src/index.mjs
- packages/domain-travel/src/index.mjs
- packages/domain-travel/src/normal-amounts-2026.mjs
- packages/domain-payroll/src/index.mjs
- packages/domain-hus/src/index.mjs
- packages/domain-vat/src/index.mjs
- packages/domain-annual-reporting/src/index.mjs
- packages/domain-integrations/src/index.mjs
- packages/domain-integrations/src/providers/*.mjs
- docs/compliance/se/*.md

**Behåll**  
- Idén om rulepack registry och provider baseline registry i nuvarande documents.

**Förstärk / härda**  
- Regulatoriska values, rate tables, source dates, provider schemas.

**Skriv om**  
- Hårdkodade konstanter i benefits, travel, HUS och payroll.

**Ersätt**  
- Implicit yearly code edits med publication workflow + golden vectors.

**Ta bort / deprecate**  
- Stumma konstanter utan källhänvisning och effective dating.

**Migrera**  
- Årsberoende konstanter från kod till packs.
- Provider schema versions till baseline registry.

**Nya objekt / objektmodell**  
- `Rulepack(rulepackId, domainCode, effectiveFrom, effectiveTo, checksum, sourceRefs)`
- `ProviderBaseline(baselineId, providerCode, version, effectiveFrom, checksum)`
- `OfficialValueVector(vectorId, rulepackId, scenarioCode, inputJson, expectedJson)`

**Source of truth**  
`packages/rule-engine/src/index.mjs` är central resolver; inga affärsdomäner får hardkoda regulatoriska 2026+ värden utanför testvektorer eller fallback annotations.

**State machines**  
- `Rulepack: draft -> reviewed -> published -> superseded`
- `ProviderBaseline: draft -> published -> superseded`

**Commands**  
- `publishRulepack`
- `publishProviderBaseline`
- `pinRulepackRef`
- `pinProviderBaselineRef`

**Events**  
- `rulepack.published`
- `provider_baseline.published`

**API-kontrakt**  
- `/v1/rule-governance/*` och `/v1/provider-baselines/*` (align with existing governance routes).

**Webhook-kontrakt**  
- Inga.

**Permissions**  
- rulepack_admin
- provider_admin
- finance_owner
- payroll_owner
- security_admin

**Review boundaries**  
- Regulated rulepack-publicering kräver minst domänägare + compliance/finance owner.
- Provider baseline-publicering kräver integration owner + security owner.

**Blockerande valideringar**  
- Varje publicerat pack måste ha official source refs och golden vectors.
- Historiska beslut måste fortsatt resolve:a samma pack som när de skapades.

**Auditkrav / evidence / receipts**  
- Publication, rollback och emergency override är audit-critical.

**Retry / replay / dead-letter / recovery**  
- Pack publication är idempotent på checksumma/version.

**Rulepacks / versionering / effective dating**  
- Detta är fasen där rulepacks byggs.

**Testkrav**  
- golden vectors against official values
- date cutover tests
- rollback-to-previous-pack tests

**Golden scenarios**  
- 2025 ROT före/efter 2025-05-12 ger olika korrekt rate.
- 2026 youth contribution split works at 25 000 threshold.

**Migrations- / cutoverkrav**  
- Historiska importer måste kunna map to the original applicable pack or explicit migration override.

**Runbooks som krävs**  
- `docs/runbooks/rulepack-publication.md`
- `docs/runbooks/provider-baseline-update.md`

**Roadmap-delfaser och exakt implementation**  
- **5.1 [NEW BUILD]** — Utöka rule-engine till regulatoriska rulepacks för BAS/DSAM, arbetsgivaravgifter, skattetabeller, SINK/A-SINK, växa-stöd, benefits, traktamente, HUS, VAT-klassificeringar, periodregler och legal-form obligations.
- **5.2 [HARDEN]** — Inför provider baseline registry för BankID, signing archive, Peppol, ISO20022, Skatteverket transports, Bolagsverket annual, SIE4-format och migration file families.
- **5.3 [OPERATIONALIZE]** — Bygg publiceringsprocess med källa, checksumma, effectiveFrom/effectiveTo, signoff, rollback och golden test vectors från officiella källor.
- **5.4 [HARDEN]** — Gör historisk pinning obligatorisk: alla beslut, deklarationer och beräkningar måste bära rulepack- och baseline-ref.
- **5.5 [SECURE]** — Emergency override av rulepack kräver dual review, reason code, time-boxing och återgångsplan.

**Exit gate**  
- Alla regulatoriska värden och providerformat kommer från signerade rulepacks/baselines.
- Domäner bär pinned refs till använd regelversion.
- Årlig/halvårsvis regulatorisk uppdatering är operativt definierad.

## Fas 6 — Identity trust, MFA, BankID, passkeys, tenant bootstrap och trial/live isolation

**Mål**  
Bygga riktig identitets- och sessionssanning med broker, MFA, BankID/passkeys, orgbootstrap, step-up, supportgränser och hård trial/live-isolering.

**Varför fasen behövs**  
Auth måste både vara säkert och driftbart. Nuvarande kod har bra riktning men behöver bank-grade storage, rate limits, session indexing, strict trial/live split och explicit org bootstrap.

**Exakt vad som ska uppnås**  
Bygga riktig identitets- och sessionssanning med broker, MFA, BankID/passkeys, orgbootstrap, step-up, supportgränser och hård trial/live-isolering.

**Kodområden från zipen som påverkas**  
- packages/domain-org-auth/src/index.mjs
- packages/auth-core/src/index.mjs
- packages/domain-tenant-control/src/index.mjs
- packages/domain-core/src/backoffice.mjs
- apps/api/src/phase6-auth-routes.mjs
- apps/api/src/route-helpers.mjs
- apps/api/src/server.mjs
- packages/domain-integrations/src/providers/auth-broker.mjs
- packages/domain-integrations/src/providers/signicat-bankid.mjs
- packages/domain-integrations/src/providers/local-passkey.mjs
- packages/domain-integrations/src/providers/local-totp.mjs
- packages/domain-integrations/src/providers/workos-federation.mjs

**Behåll**  
- Nuvarande auth-broker-riktning, step-up, device trust och trial/live-tänk.

**Förstärk / härda**  
- Secret storage, session indexing, org bootstrap, support impersonation.

**Skriv om**  
- Any factor storage still embedded in domain state.
- Any trust decision not tied to action class.

**Ersätt**  
- O(n) session lookup with indexed tokenhash.
- Ad hoc org creation with validated bootstrap.

**Ta bort / deprecate**  
- Shared trial/live provider refs or credentials.
- Implicit trust escalation.

**Migrera**  
- Existing auth factors, sessions and tenant bootstrap flows to new models.

**Nya objekt / objektmodell**  
- `AuthFactor(factorId, factorType, secretRef, publicKeyRef, enrolledAt, disabledAt)`
- `SessionRevision(sessionId, tokenHash, trustClass, deviceTrustId, expiresAt)`
- `ChallengeRecord(challengeId, actionClass, trustRequired, completedAt)`
- `TenantBootstrapRecord(tenantId, orgNumberFingerprint, legalFormCode, readinessFlags)`
- `PromotionPlan(planId, sourceTrialTenantId, targetLiveTenantId, allowedObjectRefs)`
- `ImpersonationGrant(grantId, scope, approvedBy, expiresAt, watermarkCode)`

**Source of truth**  
`packages/domain-org-auth/src/index.mjs`, `packages/auth-core/src/index.mjs` och `packages/domain-tenant-control/src/index.mjs` är source of truth för identity/session/tenant readiness; provider-specific refs lever i integrations control plane men hemligheter i secret store.

**State machines**  
- `AuthFactor: pending_enrollment -> active -> suspended | removed`
- `SessionRevision: active -> stepped_up -> expired | revoked`
- `PromotionPlan: draft -> validated -> approved -> executed | aborted`

**Commands**  
- `enrollAuthFactor`
- `completeChallenge`
- `issueSessionRevision`
- `bootstrapTenant`
- `planTrialPromotion`
- `approveImpersonationGrant`

**Events**  
- `auth.factor.enrolled`
- `session.revision.issued`
- `tenant.bootstrapped`
- `trial.promotion.planned`
- `impersonation.grant.approved`

**API-kontrakt**  
- `/v1/auth/*`
- `/v1/tenant-control/*`
- `/v1/backoffice/impersonation/*`

**Webhook-kontrakt**  
- Auth broker/provider callbacks only through signed callback endpoints with mode isolation.

**Permissions**  
- company_admin
- security_admin
- support_admin
- support_lead
- platform_owner

**Review boundaries**  
- High-risk factor changes require fresh step-up.
- Trial promotion requires customer owner + implementation lead + security approval.

**Blockerande valideringar**  
- Org number checksum mandatory.
- Trial objects, receipts, secrets and sequences may not be reused in live.
- No support-write without impersonation/break-glass grant.

**Auditkrav / evidence / receipts**  
- All factor/session/bootstrap/promotion/impersonation actions auditloggas with trust metadata.

**Retry / replay / dead-letter / recovery**  
- Provider callbacks and challenge completion flows idempotent by provider order ref + challenge id.

**Rulepacks / versionering / effective dating**  
- Trust TTL and risk thresholds may be policy-driven.

**Testkrav**  
- factor enrollment tests
- session hash index tests
- org bootstrap validation tests
- trial/live isolation tests
- impersonation dual-approval tests

**Golden scenarios**  
- A trial tenant can be promoted without carrying over sessions, secrets or receipts.
- A failed TOTP lockout requires alternate recovery and full audit.

**Migrations- / cutoverkrav**  
- Identity and tenant migration can only move allowed objects and masked references.

**Runbooks som krävs**  
- `docs/runbooks/auth-broker-setup.md`
- `docs/runbooks/trial-to-live-promotion.md`
- `docs/runbooks/support-impersonation.md`

**Roadmap-delfaser och exakt implementation**  
- **6.1 [REPLACE][SECURE]** — Auth broker blir enda väg för BankID/federation; lokala passkeys/TOTP lever som factor types med secret refs, inte rå state.
- **6.2 [NEW BUILD][SECURE]** — Inför `SessionRevision`, `ChallengeRecord`, device trust, fresh step-up och action-classade TTL:er; sessionuppslag indexeras på tokenhash.
- **6.3 [HARDEN]** — Tenant/company bootstrap validerar organisationsnummer, legal form, VAT-registrering, fiscal-year profile och finance readiness redan vid skapande.
- **6.4 [NEW BUILD][MIGRATE]** — Trial/live separeras i tenant, credentials, receipts, sequence space, evidence, provider refs, jobs, dashboards och KMS-nycklar; promotion är aldrig in-place.
- **6.5 [SECURE][HARDEN]** — Support impersonation, break-glass och access attestation kräver masked views, allowlists, incident id, two-person approval och vattenmärkt session.
- **6.6 [SECURE][OPERATIONALIZE]** — Login/TOTP/passkey/BankID riskkontroller, lockouts, anomaly rules och recovery-flöden körs live.

**Exit gate**  
- Auth-factorer och sessioner följer bank-grade storage-regler.
- Trial och live är tekniskt och kryptografiskt separerade.
- High-risk actions kräver fresh step-up och rätt trust class.

## Fas 7 — Finansiell grund: legal form, fiscal year, accounting method, ledgerkärna, close och SIE4

**Mål**  
Göra huvudboken, företagsformen, räkenskapsåret, bokföringsmetoden, close-processen och SIE4 till verkliga grunddomäner med rätt svenska regler och rätt transaktionsspår.

**Varför fasen behövs**  
Nuvarande repo saknar bland annat opening balance-motor, depreciation, accruals, VAT clearing, SIE4 och korrekt FX/numbering/description governance. Utan detta finns ingen hållbar redovisningskärna.

**Exakt vad som ska uppnås**  
Göra huvudboken, företagsformen, räkenskapsåret, bokföringsmetoden, close-processen och SIE4 till verkliga grunddomäner med rätt svenska regler och rätt transaktionsspår.

**Kodområden från zipen som påverkas**  
- packages/domain-legal-form/src/index.mjs
- packages/domain-fiscal-year/src/index.mjs
- packages/domain-accounting-method/src/index.mjs
- packages/domain-ledger/src/index.mjs
- packages/domain-core/src/close.mjs
- packages/domain-reporting/src/index.mjs
- packages/domain-annual-reporting/src/index.mjs
- packages/domain-sie/src/index.mjs (new)
- packages/db/migrations/*.sql
- docs/compliance/se/*.md

**Behåll**  
- Nuvarande domäner legal-form, fiscal-year, accounting-method, ledger och close — men inte deras luckor.

**Förstärk / härda**  
- Posting intent model, close checklist, fiscal-year restrictions, accounting-method enforcement.

**Skriv om**  
- Voucher numbering timing, descriptions, SoD, FX in SEK, chart metadata.

**Ersätt**  
- Hardcoded chart with external catalog.
- Metadata catch-up with real posting engines.
- Missing SIE with first-class domain.

**Ta bort / deprecate**  
- Draft-time voucher number burn.
- Description-optional verification.
- FX amounts without SEK truth.

**Migrera**  
- Chart data, existing vouchers, close snapshots, accounting-method outputs to new models.

**Nya objekt / objektmodell**  
- `PostingIntent(intentId, sourceType, sourceId, postingRecipeCode, journalPlan)`
- `VoucherSeries(seriesCode, nextNumber, allocationPolicy)`
- `JournalEntryDraft(draftId, lines, description, evidenceRefs)`
- `ChartAccount(accountNo, name, accountClass, normalSide, effectiveFrom)`
- `OpeningBalanceBatch(batchId, fiscalYearId, sourceRef, checksum)`
- `VatClearingRun(runId, periodId, decisionRefs, journalEntryId)`
- `SieExportJob(jobId, scope, version, checksum)`
- `AssetCard(assetId, acquisitionDate, costAmount, depreciationPlan)`
- `AccrualSchedule(scheduleId, sourceRef, startDate, endDate, pattern)`

**Source of truth**  
Ledger owns journal truth. Legal form + fiscal year + accounting method own governing profiles. SIE domain owns import/export format truth. Close owns checklist and signoff truth but not ledger amounts.

**State machines**  
- `JournalEntryDraft: draft -> approved_for_post -> posted | voided`
- `OpeningBalanceBatch: draft -> validated -> posted`
- `SieExportJob: draft -> validated -> exported | failed`
- `AssetCard: active -> fully_depreciated | disposed`
- `AccrualSchedule: active -> completed | reversed`

**Commands**  
- `createPostingIntent`
- `allocateVoucherNumber`
- `postJournalEntry`
- `registerOpeningBalanceBatch`
- `runVatClearing`
- `exportSie4`
- `importSie4`
- `registerAssetCard`
- `runDepreciationBatch`
- `runAccrualBatch`

**Events**  
- `journal_entry.posted`
- `opening_balance.posted`
- `vat_clearing.completed`
- `sie4.exported`
- `asset.depreciation.booked`
- `accrual.booked`

**API-kontrakt**  
- `/v1/legal-form/*`
- `/v1/fiscal-year/*`
- `/v1/accounting-method/*`
- `/v1/ledger/*`
- `/v1/close/*`
- `/v1/sie/*` (new)

**Webhook-kontrakt**  
- Inga externa; SIE is file-oriented.

**Permissions**  
- finance_admin
- controller
- auditor
- security_admin for overrides

**Review boundaries**  
- Manual journal, period reopen, soft-lock override and opening balance post require dual control.
- SIE export of full ledger requires finance or auditor scope.

**Blockerande valideringar**  
- Voucher numbers only on post.
- Description mandatory on every legal journal.
- All journal lines balanced in SEK.
- BAS accountClass and fallback account existence mandatory.

**Auditkrav / evidence / receipts**  
- All posts, reopens, clears, SIE jobs and close signoffs produce evidence bundles.

**Retry / replay / dead-letter / recovery**  
- Batch jobs for depreciation/accrual/VAT clearing and SIE export are idempotent by scope and sequence.

**Rulepacks / versionering / effective dating**  
- BAS catalog, fiscal-year rules, accounting-method rules, VAT clearing recipe versions.

**Testkrav**  
- voucher sequence tests
- description required tests
- BAS account class tests
- FX SEK tests
- opening balance tests
- SIE4 import/export roundtrip tests
- depreciation/accrual tests
- close attribution tests

**Golden scenarios**  
- A year-end catch-up on kontantmetod produces real journals and can be reversed.
- A foreign-currency invoice is posted in SEK and later revalued without losing original currency metadata.

**Migrations- / cutoverkrav**  
- Opening balance, SIE4 import and retained earnings transfer are mandatory migration paths.

**Runbooks som krävs**  
- `docs/runbooks/opening-balances-and-sie.md`
- `docs/runbooks/vat-clearing.md`
- `docs/runbooks/close-and-reopen.md`

**Roadmap-delfaser och exakt implementation**  
- **7.1 [HARDEN]** — Legal form och fiscal year profiles blir förstaklassiga obligationsmotorer; kalenderårskrav, deklarationsprofiler och close-krav styrs därifrån.
- **7.2 [REWRITE][SECURE]** — Ledger posting kernel skrivs om för nummer-vid-postning, obligatorisk beskrivning, verifikationsserier, dual control för manuella poster och soft-lock override, samt canonical posting intents.
- **7.3 [REWRITE][MIGRATE]** — BAS/DSAM chart externaliseras, accountClass rättas, fallback-konton verifieras och kontoplanen versioneras/testas mot källtabell.
- **7.4 [REWRITE]** — Utländsk valuta bokförs alltid i redovisningsvaluta (SEK eller explicit europrofil), med originalvaluta som metadata och separat revaluation/realized FX-motor.
- **7.5 [NEW BUILD]** — Opening balances, retained earnings transfer, accounting-method catch-up, fiscal-year open/close och resultatoverföring blir riktiga posting-flöden.
- **7.6 [NEW BUILD]** — Bygg depreciation, accrual/prepaid engine, VAT clearing 2610–2640 -> 2650 och `packages/domain-sie/src/index.mjs` för SIE4 import/export.
- **7.7 [HARDEN]** — Close/reopen/hard-close kräver rätt actor attribution, evidence och signoff chain.

**Exit gate**  
- Ledgern har korrekt chart, nummerpolicy, FX-policy och closepolicy.
- Opening balances, catch-up, VAT clearing, depreciation, accruals och SIE4 finns som riktiga motorer.
- Legal form/fiscal year/accounting method styr downstream-domäner.

## Fas 8 — AR, AP, VAT, banking och tax account som sammanhängande financial truth

**Mål**  
Göra kundreskontra, leverantörsreskontra, moms, bankhändelser och skattekonto till en enda sammanhängande sanningskedja med riktiga `VatDecision`-objekt och ledgerbryggor.

**Varför fasen behövs**  
Nuvarande repo bokför delar av AR/AP men bygger inte deklarationssanning konsekvent. Banking och tax account saknar full ledger-spegel. VAT undantag och VIES saknas eller är tunna.

**Exakt vad som ska uppnås**  
Göra kundreskontra, leverantörsreskontra, moms, bankhändelser och skattekonto till en enda sammanhängande sanningskedja med riktiga `VatDecision`-objekt och ledgerbryggor.

**Kodområden från zipen som påverkas**  
- packages/domain-ar/src/index.mjs
- packages/domain-ap/src/index.mjs
- packages/domain-vat/src/index.mjs
- packages/domain-banking/src/index.mjs
- packages/domain-tax-account/src/engine.mjs
- packages/domain-tax-account/src/constants.mjs
- packages/domain-tax-account/src/helpers.mjs
- packages/domain-ledger/src/index.mjs
- packages/domain-reporting/src/index.mjs
- packages/domain-integrations/src/providers/pagero-peppol.mjs
- packages/domain-integrations/src/providers/stripe-payment-links.mjs
- packages/domain-integrations/src/providers/enable-banking.mjs
- packages/domain-integrations/src/providers/skatteverket-vat.mjs

**Behåll**  
- AR/AP/VAT/tax-account domain separation, but not split truths.

**Förstärk / härda**  
- State machines, VAT truth, ledger bridges, statement handling, tax-account discrepancy workflows.

**Skriv om**  
- AR/AP VAT creation paths, banking event coverage, tax-account classification gaps.

**Ersätt**  
- Local VAT proposals with `VatDecision` truth.
- Implicit timing assumptions with accounting-method-driven policy.

**Ta bort / deprecate**  
- `vatDecisionId: null` for domestic AP VAT.
- AR issue without mandatory VAT path.

**Migrera**  
- Existing invoice/payment objects and tax account events to new truth references.

**Nya objekt / objektmodell**  
- `Invoice(invoiceId, status, invoiceNo, customerRef, vatDecisionRefs, journalEntryId)`
- `SupplierInvoice(supplierInvoiceId, status, supplierTaxStatus, vatDecisionRefs, journalEntryId)`
- `VatDecision(decisionId, scenarioCode, taxPointDate, declarationBoxes, sekAmounts, sourceRef, rulepackRef)`
- `BankStatementEvent(eventId, bankAccountRef, eventType, amount, matchedObjectRefs, journalEntryId)`
- `TaxAccountEvent(eventId, eventType, liabilityDirection, amount, offsetPriority, journalEntryId)`
- `DiscrepancyCase(caseId, sourceDomain, differenceType, blockerCode)`

**Source of truth**  
AR owns invoice truth, AP owns supplier invoice truth, VAT owns tax classification truth, banking owns statement-event truth, tax-account owns authority ledger mirror truth. Ledger remains posting truth.

**State machines**  
- `Invoice: draft -> issued -> partially_paid -> paid | credited | written_off`
- `SupplierInvoice: draft -> booked -> partially_paid -> paid | credited | disputed`
- `VatDecision: proposed -> approved -> posted -> declared | corrected`
- `BankStatementEvent: imported -> classified -> matched -> posted | exception`
- `TaxAccountEvent: registered -> offset -> reconciled | discrepancy`

**Commands**  
- `issueInvoice`
- `issueCreditNote`
- `bookSupplierInvoice`
- `bookSupplierCredit`
- `evaluateVatDecision`
- `registerBankStatementEvent`
- `classifyTaxAccountEvent`
- `reconcileFinancialDifference`

**Events**  
- `invoice.issued`
- `supplier_invoice.booked`
- `vat.decision.approved`
- `bank_event.posted`
- `tax_account_event.reconciled`

**API-kontrakt**  
- `/v1/ar/*`
- `/v1/ap/*`
- `/v1/vat/*`
- `/v1/banking/*`
- `/v1/tax-account/*`

**Webhook-kontrakt**  
- Payment link PSP webhooks, Peppol receipts, open banking callbacks, Skatteverket VAT transport receipts via adapter layer.

**Permissions**  
- finance_admin
- ar_clerk
- ap_clerk
- tax_specialist
- controller

**Review boundaries**  
- Write-off, bad debt VAT, manual tax-account adjustment, unmatched bank event and VAT override require explicit review flows.

**Blockerande valideringar**  
- AR/AP posting must have mandatory VAT truth when VAT-affecting.
- VIES required where EU B2B rulepack says so.
- Dröjsmålsränta references current reference rate baseline.
- Banking cannot post fees/interest without ledger recipe.

**Auditkrav / evidence / receipts**  
- Invoice issue, supplier approval, VAT decisions, bank event exceptions and tax-account adjustments are audit-critical.

**Retry / replay / dead-letter / recovery**  
- Transports and bank imports are idempotent on provider/event reference + checksum.

**Rulepacks / versionering / effective dating**  
- VAT scenario packs, reference-rate baselines, supplier tax status policy, accounting-method timing policy.

**Testkrav**  
- AR state machine tests
- AP domestic VAT truth tests
- VIES/GR/EL tests
- bank statement posting tests
- tax-account mapping tests
- bad debt VAT tests
- advance payment VAT tests

**Golden scenarios**  
- AR invoice -> VatDecision -> ledger -> VAT declaration -> tax account -> VAT clearing -> locked reporting.
- Domestic AP invoice -> VatDecision -> payment -> bank match -> ledger -> VAT declaration.

**Migrations- / cutoverkrav**  
- Open AR/AP items, VAT decisions, bank statements and tax-account history must be importable with reconciliation.

**Runbooks som krävs**  
- `docs/runbooks/ar-ap-vat-cutover.md`
- `docs/runbooks/bank-statement-reconciliation.md`
- `docs/runbooks/tax-account-discrepancies.md`

**Roadmap-delfaser och exakt implementation**  
- **8.1 [REWRITE]** — AR state machine härdas: draft->issued->partially_paid->paid->credited->written_off, med riktiga invoice requirements, advance payments, credit notes, bad debt VAT, OCR-kontroll och dröjsmålsränta enligt referensränta + 8.
- **8.2 [REWRITE]** — AP state machine härdas: domestic VAT går genom riktig `VatDecision`, F-skatt/A-skatt-konsekvenser modelleras, credits och payment blocks/release blir explicita.
- **8.3 [REWRITE][HARDEN]** — VAT truth model gör `VatDecision` obligatoriskt för alla VAT-affecting events; `GR`/`EL`, VIES, reverse charge-undantag, OSS, import VAT, pro rata och blocked deductions implementeras i scenariomotorn.
- **8.4 [NEW BUILD]** — Banking får statement/event core för avgifter, räntor, settlements och matchning, inte bara AP-disbursement rail.
- **8.5 [REWRITE]** — Tax account får komplett eventklassificering, offset-regler, ledger-spegel och discrepancy workbench.
- **8.6 [HARDEN]** — Accounting method blir verkställande policy över AR/AP/VAT/ledger i stället för separat annotering.

**Exit gate**  
- AR/AP/VAT/banking/tax account producerar samma ekonomiska och deklarativa sanning.
- Alla momsrelevanta händelser skapar `VatDecision` och rätt ledger-spår.
- Skattekonto och bankhändelser går att avstämma mot huvudbok.

## Fas 9 — Documents, OCR, klassificering, import cases och review center

**Mål**  
Göra dokumentkedjan till ett säkert, evidence-bundet underlag för AP, travel, benefits, payroll, importmoms och support — utan att dokument blir felaktig affärssanning.

**Varför fasen behövs**  
Dokumentflöden måste vara pålitliga men får inte ersätta source-of-truth-domänerna. OCR, klassificering och review måste styra rätt domän med rätt blocker codes.

**Exakt vad som ska uppnås**  
Göra dokumentkedjan till ett säkert, evidence-bundet underlag för AP, travel, benefits, payroll, importmoms och support — utan att dokument blir felaktig affärssanning.

**Kodområden från zipen som påverkas**  
- packages/domain-documents/src/index.mjs
- packages/document-engine/src/index.mjs
- packages/domain-document-classification/src/index.mjs
- packages/domain-document-classification/src/engine.mjs
- packages/domain-document-classification/src/helpers.mjs
- packages/domain-import-cases/src/engine.mjs
- packages/domain-review-center/src/engine.mjs
- packages/domain-evidence/src/index.mjs
- apps/api/src/phase14-review-routes.mjs

**Behåll**  
- Documents as supporting evidence, not business truth.

**Förstärk / härda**  
- Retention, OCR lineage, classification and review center.

**Skriv om**  
- Any direct document-driven posting without review/lineage.
- Any sensitive OCR text leakage to search.

**Ersätt**  
- Ad hoc import-case handling with canonical case/replacement chain.

**Ta bort / deprecate**  
- Unclassified or unreviewed auto-propagation into finance/payroll.

**Migrera**  
- Existing documents to versioned, fingerprinted artifacts and extraction projections.

**Nya objekt / objektmodell**  
- `DocumentVersion(documentId, versionNo, checksumSha256, retentionClass, sourceFingerprint)`
- `ExtractionProjection(projectionId, extractionFamilyCode, targetDomainCode, normalizedFieldsJson, payloadHash)`
- `ImportCase(caseId, blockerCodes, correctionRequestRefs, targetDomainCode)`
- `ReviewItem(itemId, state, reviewerScope, decisionRefs)`

**Source of truth**  
Documents own original artifacts and extraction lineage. Downstream domains own business truth after explicit accept/command.

**State machines**  
- `DocumentVersion: uploaded -> classified -> linked | archived`
- `ImportCase: open -> waiting_input -> ready_for_apply -> applied | replaced`
- `ReviewItem: open -> escalated | approved | rejected`

**Commands**  
- `registerDocumentVersion`
- `materializeExtractionProjection`
- `openImportCase`
- `decideReviewItem`

**Events**  
- `document.version.registered`
- `extraction.projection.materialized`
- `import_case.opened`
- `review_item.decided`

**API-kontrakt**  
- `/v1/documents/*`
- `/v1/document-classification/*`
- `/v1/import-cases/*`
- `/v1/review-center/*`

**Webhook-kontrakt**  
- Document AI/OCR callbacks only via signed adapter webhook flow.

**Permissions**  
- document_reviewer
- finance_reviewer
- payroll_reviewer
- support_admin (masked read only)

**Review boundaries**  
- All low-confidence or regulated document decisions route through review center.

**Blockerande valideringar**  
- No payroll/AP/import apply without document lineage or alternate explicit evidence.
- Sensitive document text must not be indexed in plaintext.

**Auditkrav / evidence / receipts**  
- Document registration, classification override and review decisions auditloggas.

**Retry / replay / dead-letter / recovery**  
- OCR and extraction runs idempotent by document version + provider run ref.

**Rulepacks / versionering / effective dating**  
- Document classification families and retention classes can be rulepack-driven.

**Testkrav**  
- document lineage tests
- classification route tests
- masked index tests
- import case correction tests

**Golden scenarios**  
- An AP invoice PDF can become a booked supplier invoice only through extraction -> classification -> review/apply chain.

**Migrations- / cutoverkrav**  
- Historical docs can be ingested with fingerprints and retention classes; no retroactive OCR truth without review.

**Runbooks som krävs**  
- `docs/runbooks/document-classification-review.md`
- `docs/runbooks/import-case-review.md`

**Roadmap-delfaser och exakt implementation**  
- **9.1 [HARDEN]** — Originaldokument, versioner, checksummor, retentionklasser och evidence refs blir oföränderliga grundobjekt.
- **9.2 [HARDEN]** — OCR/extraction materialiserar canonical extraction projections med confidence, field lineage, attachment refs och payload hash.
- **9.3 [REWRITE]** — Document classification styr målobjekt, downstream domain, blocker codes och review boundary; person-/lönekänsligt innehåll får aldrig gå till sökindex i klartext.
- **9.4 [NEW BUILD]** — Import cases och correction requests blir eget styrt flöde för tull/importmoms, saknade underlag och replacement chains.
- **9.5 [HARDEN]** — Review center blir enda vägen för manuella undantag, inte spridda domänlokala flaggor.

**Exit gate**  
- Alla dokument har versionkedja, checksumma och retentionclass.
- OCR/klassificering producerar explicita candidates och blocker codes.
- Review center styr alla mänskliga undantag.

## Fas 10 — HR, time, balances, collective agreements och migration intake

**Mål**  
Skapa en ren personalsanning med överlappskontroller, approved time/absence sets, semesterbalanser och körbar kollektivavtalsoverlay som payroll kan lita på.

**Varför fasen behövs**  
Payroll kan inte bli rätt om HR, time, balances och avtal bara är frikopplade eller halvmanuella. Migration av person- och YTD-data måste också börja här.

**Exakt vad som ska uppnås**  
Skapa en ren personalsanning med överlappskontroller, approved time/absence sets, semesterbalanser och körbar kollektivavtalsoverlay som payroll kan lita på.

**Kodområden från zipen som påverkas**  
- packages/domain-hr/src/index.mjs
- packages/domain-time/src/index.mjs
- packages/domain-balances/src/engine.mjs
- packages/domain-balances/src/constants.mjs
- packages/domain-balances/src/helpers.mjs
- packages/domain-collective-agreements/src/engine.mjs
- packages/domain-collective-agreements/src/constants.mjs
- packages/domain-collective-agreements/src/helpers.mjs
- apps/api/src/phase14-balances-routes.mjs
- apps/api/src/phase14-collective-agreements-routes.mjs
- apps/api/src/phase14-migration-intake-routes.mjs

**Behåll**  
- Separate domains for HR, time, balances and agreements.

**Förstärk / härda**  
- Employment scope, approved time sets, balance carry/expiry, agreement execution.

**Skriv om**  
- Any payroll reliance on loose snapshots or ignored agreement overlays.

**Ersätt**  
- Static pay-item rates with agreement-driven rates where applicable.

**Ta bort / deprecate**  
- Overlapping active employments without explicit legal model.
- Manual side channels for approved time.

**Migrera**  
- HR/time/history inputs and agreement mappings into canonical snapshots.

**Nya objekt / objektmodell**  
- `EmploymentScope(employmentId, employeeId, validFrom, validTo, status, payrollEligibility)`
- `ApprovedTimeSet(setId, employeeId, periodId, entries, approvedAt)`
- `AbsenceDecision(decisionId, absenceType, fromDate, toDate, payrollImpact)`
- `VacationBalance(balanceId, employeeId, yearId, paidDays, savedDays, expiresAt)`
- `AgreementOverlay(overlayId, agreementCode, rateComponents, validFrom, validTo)`

**Source of truth**  
HR owns employment truth, time owns approved time/absence truth, balances own leave-day truth, agreements own executable rate truth.

**State machines**  
- `EmploymentScope: draft -> active -> ended | superseded`
- `ApprovedTimeSet: draft -> approved -> locked`
- `VacationBalance: open_year -> carried -> expired | settled`

**Commands**  
- `createEmploymentScope`
- `approveTimeSet`
- `decideAbsence`
- `carryVacationBalance`
- `evaluateAgreementOverlay`

**Events**  
- `employment_scope.created`
- `time_set.approved`
- `absence.decision.made`
- `vacation_balance.carried`
- `agreement_overlay.evaluated`

**API-kontrakt**  
- `/v1/hr/*`
- `/v1/time/*`
- `/v1/balances/*`
- `/v1/collective-agreements/*`

**Webhook-kontrakt**  
- Inga externa webhooks required for core truth.

**Permissions**  
- hr_admin
- time_approver
- payroll_admin
- agreement_admin

**Review boundaries**  
- Retroaktiva employment changes, absence changes after payroll freeze and agreement exceptions require review.

**Blockerande valideringar**  
- No overlapping active employments unless legal-form profile explicitly allows.
- Payroll consumes only approved and locked inputs.

**Auditkrav / evidence / receipts**  
- Employment changes, time approvals, absence decisions and agreement overrides auditloggas.

**Retry / replay / dead-letter / recovery**  
- Agreement evaluation and carry-forward batches idempotent by employee/year/period.

**Rulepacks / versionering / effective dating**  
- Leave rules, carry/expiry and agreement versioning.

**Testkrav**  
- employment overlap tests
- approved time lock tests
- vacation carry/expiry tests
- agreement rate execution tests

**Golden scenarios**  
- A retroactive agreement change triggers new payroll input snapshot and explicit review, not silent recomputation.

**Migrations- / cutoverkrav**  
- Employee master, history, YTD and agreements imported and diffed before first payroll.

**Runbooks som krävs**  
- `docs/runbooks/hr-time-cutover.md`
- `docs/runbooks/agreement-overlay-verification.md`

**Roadmap-delfaser och exakt implementation**  
- **10.1 [REWRITE]** — HR blockerar överlappande anställningar, kontrakt, placeringar och samtidiga aktiva scopes där de inte uttryckligen stöds.
- **10.2 [HARDEN]** — Time/absence/flex/overtime levererar `ApprovedTimeSet` och `AbsenceDecision` med låst payroll input per period.
- **10.3 [REWRITE]** — Balances engine blir källa för semesterdagar, carry-forward, expiry och semesterårsgränser.
- **10.4 [REWRITE]** — Collective agreements levererar körbara rates, OB-, jour-, beredskaps- och pension/semesterpåslag som payroll faktiskt konsumerar.
- **10.5 [NEW BUILD][MIGRATE]** — Migration intake definierar canonical employee master, employment history, YTD, absence, benefits, travel, pension and agreement snapshots.

**Exit gate**  
- En anställd har en entydig aktiv employment truth.
- Payroll-input kommer från approved sets och körbara agreement overlays.
- Historikimport för personal och YTD är definierad och testad.

## Fas 11 — Payroll, AGI, benefits, travel, pension och garnishment

**Mål**  
Bygga en verklig svensk payrollmotor med skattetabeller, SINK/A-SINK, sjuklön, karens, semester, AGI, särskild löneskatt, växa-stöd, negative net pay och anställdfordran.

**Varför fasen behövs**  
Nuvarande payroll har viktiga kopplingar men saknar kärnlogik: skattetabeller, A-SINK, korrekt expense reimbursement, automatisk sjuklön/karens, riktig semesterlogik och employee receivable-hantering.

**Exakt vad som ska uppnås**  
Bygga en verklig svensk payrollmotor med skattetabeller, SINK/A-SINK, sjuklön, karens, semester, AGI, särskild löneskatt, växa-stöd, negative net pay och anställdfordran.

**Kodområden från zipen som påverkas**  
- packages/domain-payroll/src/index.mjs
- packages/domain-benefits/src/index.mjs
- packages/domain-travel/src/index.mjs
- packages/domain-pension/src/index.mjs
- packages/domain-hr/src/index.mjs
- packages/domain-time/src/index.mjs
- packages/domain-balances/src/engine.mjs
- packages/domain-collective-agreements/src/engine.mjs
- packages/domain-ledger/src/index.mjs
- packages/domain-regulated-submissions/src/module.mjs
- apps/api/src/phase14-routes.mjs (decompose payroll-related paths)

**Behåll**  
- Payroll as separate domain with downstream AGI and posting responsibilities.

**Förstärk / härda**  
- Tax decision snapshots, contribution decisions, AGI versions, payment batches.

**Skriv om**  
- Manual-rate ordinary tax, expense reimbursement treatment, missing negative-net-pay chain.

**Ersätt**  
- Implicit travel/benefit/pension handling with explicit classified inputs and decision snapshots.

**Ta bort / deprecate**  
- `Math.max(0, netPay)` clipping.
- Taxable treatment of true expense reimbursements.

**Migrera**  
- Existing pay items and runs to classified pay items and receivable-aware postings.

**Nya objekt / objektmodell**  
- `TaxDecisionSnapshot(decisionId, decisionType, municipalityCode, tableCode, columnCode, annualIncomeBasisAmount, validFrom, validTo, evidenceRef)`
- `SinglePaymentTaxProfile(profileId, validFrom, validTo, thresholdBands)`
- `EmployerContributionDecisionSnapshot(decisionId, ageBucket, rates, thresholds, legalBasisCode)`
- `EmployeeReceivable(receivableId, employeeId, sourcePayRunId, amount, status)`
- `AgiVersion(versionId, periodId, employeeConstituents, employerTotals, payloadHash)`
- `PayRunFingerprint(fingerprintId, periodId, rulepackRefs, inputSnapshotRefs)`

**Source of truth**  
Payroll owns pay-run truth, AGI constituents and payment-batch truth; time/travel/benefits/pension/agreement only contribute input snapshots.

**State machines**  
- `PayRun: draft -> calculated -> approved -> posted -> paid | corrected`
- `EmployeeReceivable: open -> scheduled_offset -> partially_settled -> settled | written_off`
- `AgiVersion: draft -> ready_for_sign -> submitted | corrected`

**Commands**  
- `calculatePayRun`
- `approvePayRun`
- `postPayRun`
- `registerEmployeeReceivable`
- `buildAgiVersion`
- `submitAgiVersion`

**Events**  
- `pay_run.calculated`
- `pay_run.posted`
- `employee_receivable.registered`
- `agi.version.built`
- `agi.version.submitted`

**API-kontrakt**  
- `/v1/payroll/*`
- `/v1/payroll/agi/*`
- `/v1/payroll/receivables/*`

**Webhook-kontrakt**  
- AGI transport receipts via regulated submissions engine; bank payout confirmations via banking/integrations.

**Permissions**  
- payroll_admin
- payroll_reviewer
- finance_admin
- controller

**Review boundaries**  
- Emergency manual tax fallback, negative net pay write-off, garnishment override, retroactive correction and off-cycle pay run require review.

**Blockerande valideringar**  
- Ordinary tax cannot use manual_rate in live.
- Expense reimbursements must declare tax/avgift class explicitly.
- Sick pay/qualifying deduction and vacation logic mandatory when input conditions met.
- Negative net pay must create receivable or explicit approved alternative.

**Auditkrav / evidence / receipts**  
- Pay-run approvals, AGI builds/submissions, receivable settlements and garnishment actions auditloggas.

**Retry / replay / dead-letter / recovery**  
- AGI submission and payment batches idempotent by version/ref.
- Pay run recalculation must use immutable input fingerprint.

**Rulepacks / versionering / effective dating**  
- Tax tables, SINK/A-SINK rates, employer contribution rates, vacation law, sick pay rules, benefit/travel values, pension tax rules.

**Testkrav**  
- official tax table vectors
- SINK/A-SINK vectors
- expense reimbursement tests
- vacation law tests
- sick pay tests
- negative net pay tests
- AGI employer totals tests

**Golden scenarios**  
- Employee with salary + benefit + travel expense + sickness + vacation + garnishment yields correct net, AGI and ledger.
- Negative net pay becomes employee receivable and later offset.

**Migrations- / cutoverkrav**  
- Payroll history and YTD import requires parallel run and diff before first live pay run.

**Runbooks som krävs**  
- `docs/runbooks/payroll-parallel-run.md`
- `docs/runbooks/agi-corrections.md`
- `docs/runbooks/employee-receivables.md`

**Roadmap-delfaser och exakt implementation**  
- **11.1 [REWRITE]** — Bygg tax table engine med municipality/table/column, engångsskatt, jämkning, SINK, A-SINK och emergency manual fallback endast under dual review.
- **11.2 [REWRITE]** — Bygg employer contribution engine med full rate, 67+-regim, youth reduction, 1937-or-earlier no-contribution, special cases och växa-stöd som 2026 refund process mot skattekonto.
- **11.3 [REWRITE]** — Splitta utlägg, kostnadsersättningar, traktamente, milersättning, benefits och pension contributions korrekt före skatt/AGI mapping. Travel receipt VAT separeras från payroll reimbursement.
- **11.4 [NEW BUILD]** — Inför sjuklön dag 2–14, karensavdrag, semesterlön, semestertillägg, sparade dagar och semesterskuld inklusive arbetsgivaravgifter.
- **11.5 [NEW BUILD]** — Negative net pay ger `EmployeeReceivable`, repayment/offset plan och riktig ledger-posting; garnishment styrs av beslutssnapshot och prioritetsordning.
- **11.6 [HARDEN]** — AGI build chain inkluderar employer-level contribution totals, correction versions, evidence and submission readiness.
- **11.7 [HARDEN]** — Payroll konsumerar time, benefits, travel, pension och collective agreements automatiskt genom versionerade input snapshots och project dimensions.

**Exit gate**  
- Payroll använder officiella tabeller/rulepacks och rätt 2026-regler.
- Utlägg, sjuklön, semester, garnishment och negative net pay fungerar regulatoriskt.
- AGI kan byggas och rättas med full evidence chain.

## Fas 12 — HUS, regulated submissions, annual reporting, corporate tax och owner distributions

**Mål**  
Slutföra alla reglerade flöden: HUS/ROT/RUT, AGI/VAT/HUS/annual submissions, årsredovisning, tax declaration och aktieutdelning/owner distributions med full ledger- och evidencekedja.

**Varför fasen behövs**  
Nuvarande repo saknar HUS-ledgerbridge, rätt signatory chain, corporate-tax-pack och owner-distribution domain. Det blockerar verkligt svenskt AB-go-live.

**Exakt vad som ska uppnås**  
Slutföra alla reglerade flöden: HUS/ROT/RUT, AGI/VAT/HUS/annual submissions, årsredovisning, tax declaration och aktieutdelning/owner distributions med full ledger- och evidencekedja.

**Kodområden från zipen som påverkas**  
- packages/domain-hus/src/index.mjs
- packages/domain-regulated-submissions/src/module.mjs
- packages/domain-regulated-submissions/src/index.mjs
- packages/domain-annual-reporting/src/index.mjs
- packages/domain-legal-form/src/index.mjs
- packages/domain-fiscal-year/src/index.mjs
- packages/domain-ledger/src/index.mjs
- packages/domain-evidence/src/index.mjs
- packages/domain-owner-distributions/src/index.mjs (new)
- packages/domain-integrations/src/providers/skatteverket-hus.mjs
- packages/domain-integrations/src/providers/skatteverket-agi.mjs
- packages/domain-integrations/src/providers/skatteverket-vat.mjs
- packages/domain-integrations/src/providers/bolagsverket-annual.mjs
- packages/domain-integrations/src/providers/signicat-signing-archive.mjs

**Behåll**  
- Separate HUS and annual-reporting domains plus regulated-submissions concept.

**Förstärk / härda**  
- Claim lifecycles, regulated receipts, signatory chains, annual/tax packs.

**Skriv om**  
- HUS labor-cost semantics, HUS ledger absence, annual signoff weakness.

**Ersätt**  
- Metadata-only rollback/signoff with actual regulated evidence and payout logic.

**Ta bort / deprecate**  
- Owner distributions as manual side process outside product.
- Partial annual signoff accepted as complete.

**Migrera**  
- HUS claims, annual packages and shareholder data to first-class objects.

**Nya objekt / objektmodell**  
- `HusCase(caseId, workTypeCode, laborCostInclVatAmount, buyerAllocations, status)`
- `HusClaim(claimId, husCaseId, claimReadyAt, submissionAttemptRef, decisionRef)`
- `AnnualPackage(packageId, fiscalYearId, frameworkCode, lockedSnapshotRefs, signatoryChain)`
- `TaxDeclarationPack(packId, fiscalYearId, legalFormCode, currentTaxComputation, sruArtifacts)`
- `DividendDecision(decisionId, companyId, decisionDate, perShareAmount, totalAmount, signoffRefs)`
- `KU31Draft(draftId, dividendDecisionId, recipientRefs, fieldMap, filingYear)`
- `KupongskattRecord(recordId, dividendDecisionId, recipientRef, withholdingRate, treatyEvidenceRef)`

**Source of truth**  
HUS owns claim truth, regulated-submissions owns transport/receipt truth, annual-reporting owns report package truth, owner-distributions owns dividend truth. Ledger still owns posted amounts.

**State machines**  
- `HusCase: draft -> claim_ready -> claimed -> accepted | partially_accepted | rejected -> paid_out | recovered | written_off`
- `AnnualPackage: draft -> locked -> ready_for_sign -> signed -> submitted | corrected`
- `DividendDecision: draft -> board_proposed -> review_pending -> stamma_resolved -> payable -> scheduled -> paid | partially_paid | reversed`

**Commands**  
- `prepareHusClaim`
- `submitHusClaim`
- `recordHusDecision`
- `buildAnnualPackage`
- `signAnnualPackage`
- `buildTaxDeclarationPack`
- `proposeDividendDecision`
- `resolveDividendAtStamma`
- `scheduleDividendPayout`
- `buildKu31Draft`

**Events**  
- `hus.claim.submitted`
- `hus.decision.recorded`
- `annual_package.signed`
- `tax_declaration_pack.built`
- `dividend.decision.resolved`
- `ku31.draft.built`

**API-kontrakt**  
- `/v1/hus/*`
- `/v1/submissions/*`
- `/v1/annual-reporting/*`
- `/v1/owner-distributions/*` (new)

**Webhook-kontrakt**  
- Authority transport callbacks for AGI/VAT/HUS/annual via regulated-submissions layer.

**Permissions**  
- tax_specialist
- finance_admin
- annual_signatory
- board_member
- security_admin for high-risk sends

**Review boundaries**  
- HUS overrides, annual corrections after sign, corporate tax overrides, dividend payout and treaty-based kupongskatt reductions require chained approvals.

**Blockerande valideringar**  
- HUS must use labor cost including VAT and valid buyer identity.
- Annual package cannot submit without full signatory chain and locked close.
- Dividend cannot resolve or pay without free-equity proof, board/stämma evidence and recipient tax profile.

**Auditkrav / evidence / receipts**  
- All regulated submissions, signings, annual/declaration builds and dividend actions are audit-critical.

**Retry / replay / dead-letter / recovery**  
- Submission attempts, annual packaging and KU31 build are idempotent by package/decision/version.

**Rulepacks / versionering / effective dating**  
- HUS rules, annual filing baselines, tax declaration field specs, dividend/kupongskatt policies.

**Testkrav**  
- HUS ledger chain tests
- annual signatory tests
- corporate tax pack tests
- owner distribution/KU31/kupongskatt tests
- regulated submission retry tests

**Golden scenarios**  
- HUS partial acceptance produces customer receivable + authority receivable adjustments + recovery support.
- AB year close -> annual package -> tax declaration -> dividend decision -> payout -> KU31 works end-to-end.

**Migrations- / cutoverkrav**  
- Annual history, shareholder registers, outstanding dividend liabilities and HUS claims must import or block cutover explicitly.

**Runbooks som krävs**  
- `docs/runbooks/hus-claims-and-recovery.md`
- `docs/runbooks/annual-and-tax-declaration.md`
- `docs/runbooks/owner-distributions-and-ku31.md`

**Roadmap-delfaser och exakt implementation**  
- **12.1 [REWRITE]** — HUS truth model härdas: explicit `laborCostInclVatAmount`, buyer identity validation, rate windows, cap handling, `claim_ready` state och per-buyer allocation/evidence.
- **12.2 [NEW BUILD]** — HUS ledger and recovery chain: claim submission, acceptance, partial acceptance, payout, recovery och write-off får canonical posting intents och reconciliation.
- **12.3 [HARDEN]** — Regulated submissions engine blir gemensam transport- och receiptmotor för AGI, VAT, HUS, annual och kommande declarations, med retries, dead letters, corrections och submission evidence.
- **12.4 [REWRITE]** — Annual reporting och tax declaration pack kräver locked report snapshots, closing journals, K2/K3 profile, corporate tax computation, full signatory chain, SRU/iXBRL/official transport baselines.
- **12.5 [NEW BUILD]** — Bygg `packages/domain-owner-distributions/src/index.mjs` för aktieutdelning/owner distributions, shareholder register snapshots, free-equity checks, board/stämma approvals, dividend liability, payout chain, KU31 and kupongskatt support.

**Exit gate**  
- HUS har full claim-to-ledger-to-recovery chain.
- Annual reporting och tax declaration är verkliga regulated flows, inte bara packages.
- AB kan fatta, bokföra, betala och rapportera utdelning med full evidence chain.

## Fas 13 — Generell project core, WIP, profitability, field och vertikala packs

**Mål**  
Bygga en generell projekt- och kommersiell kärna som fungerar för alla branscher, med WIP/revenue recognition och profitability, innan field/personalliggare/ID06-vertikaler tillåts dominera.

**Varför fasen behövs**  
Produkten är inte ett byggprogram. Projects måste vara generell och knuten till finance/payroll/travel/AP/AR/HUS för att bli marknadsvinnande.

**Exakt vad som ska uppnås**  
Bygga en generell projekt- och kommersiell kärna som fungerar för alla branscher, med WIP/revenue recognition och profitability, innan field/personalliggare/ID06-vertikaler tillåts dominera.

**Kodområden från zipen som påverkas**  
- packages/domain-projects/src/index.mjs
- packages/domain-field/src/index.mjs
- packages/domain-personalliggare/src/index.mjs
- packages/domain-id06/src/index.mjs
- packages/domain-kalkyl/src/index.mjs
- packages/domain-ar/src/index.mjs
- packages/domain-ap/src/index.mjs
- packages/domain-payroll/src/index.mjs
- packages/domain-travel/src/index.mjs
- packages/domain-benefits/src/index.mjs
- packages/domain-hus/src/index.mjs
- packages/domain-reporting/src/index.mjs

**Behåll**  
- Projects as separate domain and vertical packs as add-ons, not core truth.

**Förstärk / härda**  
- Commercial chain, WIP, profitability and vertical isolation.

**Skriv om**  
- Snapshot-only WIP and construction-first assumptions.

**Ersätt**  
- Work-order-first design with generic project/commercial model.

**Ta bort / deprecate**  
- Any vertical-specific economic truth that bypasses finance core.

**Migrera**  
- Existing field/build objects onto generic project references and profitability dimensions.

**Nya objekt / objektmodell**  
- `Project(projectId, commercialModelCode, customerRef, status)`
- `RevenueRecognitionPlan(planId, projectId, methodCode, journalRules)`
- `ProjectProfitabilitySnapshot(snapshotId, projectId, revenue, cost, margin, blockerRefs)`
- `FieldPackLink(linkId, projectId, packType, verticalRefs)`

**Source of truth**  
Projects own project/commercial truth; field/personalliggare/ID06 own vertical compliance truth but never primary finance truth.

**State machines**  
- `Project: draft -> active -> completed | cancelled`
- `RevenueRecognitionPlan: draft -> active -> completed | reversed`

**Commands**  
- `createProject`
- `activateRevenueRecognitionPlan`
- `materializeProjectProfitability`
- `linkVerticalPack`

**Events**  
- `project.created`
- `revenue_recognition.activated`
- `project_profitability.materialized`

**API-kontrakt**  
- `/v1/projects/*`
- `/v1/field/*`
- `/v1/personalliggare/*`
- `/v1/id06/*`

**Webhook-kontrakt**  
- Optional CRM/project sync via integration layer.

**Permissions**  
- project_admin
- project_controller
- field_admin

**Review boundaries**  
- Revenue recognition method selection and profitability waivers require finance review.

**Blockerande valideringar**  
- No vertical pack may create ledger effect without project/finance truth.
- WIP must post via ledger bridge.

**Auditkrav / evidence / receipts**  
- WIP approvals, profitability overrides and vertical compliance actions auditloggas.

**Retry / replay / dead-letter / recovery**  
- Profitability and WIP batch runs idempotent by project/period.

**Rulepacks / versionering / effective dating**  
- Revenue recognition and industry pack rules.

**Testkrav**  
- project chain tests
- WIP posting tests
- profitability aggregation tests
- vertical isolation tests

**Golden scenarios**  
- Project with payroll, AP, travel and HUS costs yields a single profitability truth and WIP posting.

**Migrations- / cutoverkrav**  
- Projects/time/history import via migration engine must align to generic project model.

**Runbooks som krävs**  
- `docs/runbooks/project-profitability.md`
- `docs/runbooks/wip-revenue-recognition.md`

**Roadmap-delfaser och exakt implementation**  
- **13.1 [REWRITE]** — Bygg generell project/commercial chain: opportunity -> quote -> agreement -> project -> delivery/work -> invoice/cost/profitability.
- **13.2 [NEW BUILD]** — Projects får riktiga WIP/revenue-recognition posting intents och ledger bridge.
- **13.3 [NEW BUILD]** — Bygg profitability mission control över AR/AP/payroll/travel/HUS/material/overhead med blockers och risker.
- **13.4 [HARDEN]** — Field/personalliggare/ID06 blir vertikala packs ovanpå project core och finance truth; inga egna ekonomiska sanningar tillåts.
- **13.5 [OPERATIONALIZE]** — Definiera vertikal-pack governance, enablement och deprecation-regler.

**Exit gate**  
- Project core är generell, inte construction-first.
- WIP och profitability når huvudbok och operativ workbench.
- Vertikala packs är underordnade core och kan slås av/på utan att bryta financial truth.

## Fas 14 — Reporting, search, notifications, activity och operativa workbenches

**Mål**  
Göra rapporter, sök, activity, notifications och cockpits till låsta, maskade, sammanhängande read-models för finance, payroll, migration och support.

**Varför fasen behövs**  
Rapporter får idag löpa på öppna perioder och egen avrundning. Cockpits måste byggas på locked truth, inte ad hoc-projektioner.

**Exakt vad som ska uppnås**  
Göra rapporter, sök, activity, notifications och cockpits till låsta, maskade, sammanhängande read-models för finance, payroll, migration och support.

**Kodområden från zipen som påverkas**  
- packages/domain-reporting/src/index.mjs
- packages/domain-search/src/index.mjs
- packages/domain-search/src/engine.mjs
- packages/domain-notifications/src/index.mjs
- packages/domain-activity/src/index.mjs
- packages/domain-review-center/src/index.mjs
- packages/domain-tax-account/src/engine.mjs
- packages/domain-regulated-submissions/src/module.mjs
- apps/api/src/phase14-backoffice-routes.mjs

**Behåll**  
- Reporting/search/activity/notifications as separate read concerns.

**Förstärk / härda**  
- Locked-reporting semantics, masked search, cockpit projections.

**Skriv om**  
- Per-row rounded reporting and open-period snapshots treated as final truth.

**Ersätt**  
- Ad hoc admin views with purpose-built cockpits.

**Ta bort / deprecate**  
- Unmasked sensitive text in indexes or notifications.

**Migrera**  
- Existing read models to locked truth and value-kernel semantics.

**Nya objekt / objektmodell**  
- `LockedReportSnapshot(reportId, scope, basisVersion, lockedAt, checksum)`
- `SearchProjection(projectionId, objectType, maskedFields, permissionScope)`
- `WorkItem(itemId, workbenchCode, blockerCode, ownerRef, dueAt)`

**Source of truth**  
Reporting owns report snapshots, search owns masked query projections, activity/notifications own delivery history, workbenches own operational aggregation only.

**State machines**  
- `LockedReportSnapshot: building -> locked -> superseded`
- `WorkItem: open -> in_progress -> blocked | done`

**Commands**  
- `buildLockedReportSnapshot`
- `indexSearchProjection`
- `openWorkbenchItem`
- `resolveWorkbenchItem`

**Events**  
- `report_snapshot.locked`
- `search_projection.indexed`
- `workbench_item.opened`

**API-kontrakt**  
- `/v1/reporting/*`
- `/v1/search/*`
- `/v1/notifications/*`
- `/v1/activity/*`
- `/v1/workbench/*` (new)

**Webhook-kontrakt**  
- Optional outbound notifications only via integrations layer.

**Permissions**  
- auditor
- finance_admin
- payroll_admin
- support_admin(masked)

**Review boundaries**  
- Manual report republish or cockpit blocker waivers require owner review.

**Blockerande valideringar**  
- Open period reports must be marked preliminary and never reused as annual/filing truth.
- Search projection cannot store forbidden fields.

**Auditkrav / evidence / receipts**  
- Report exports, cockpit decisions and saved view changes auditloggas.

**Retry / replay / dead-letter / recovery**  
- Read-model rebuilds idempotent by projection/version.

**Rulepacks / versionering / effective dating**  
- Report layout and disclosure packs where relevant.

**Testkrav**  
- locked report reproducibility tests
- masked search tests
- workbench permission tests

**Golden scenarios**  
- VAT filing cockpit shows exactly the same decision totals as locked VAT declaration basis and tax-account mirror.

**Migrations- / cutoverkrav**  
- Migration diff views consume these workbenches.

**Runbooks som krävs**  
- `docs/runbooks/locked-reporting.md`
- `docs/runbooks/workbench-operations.md`

**Roadmap-delfaser och exakt implementation**  
- **14.1 [REWRITE]** — Reporting använder samma value kernel som ledger och respekterar periodlås, close state och preliminary vs locked mode.
- **14.2 [HARDEN]** — Search indexerar bara tillåten metadata/maskade projektioner; inga S3/S4-fält eller otillåtna dokumentutdrag.
- **14.3 [HARDEN]** — Activity och notifications blir domänmedvetna, permission-trimmade och korrelationskopplade till evidence och work items.
- **14.4 [NEW BUILD]** — Bygg tax account cockpit, unified submission cockpit, migration cockpit, payroll exception workbench och finance discrepancy views som förstaklass read models.

**Exit gate**  
- Rapporter är reproducerbara från locked truth.
- Search och notifications följer dataklassificering och permissions.
- Operativa cockpits finns för tax account, submissions, migration och payroll.

## Fas 15 — Integrationsplattform, public API, partner API, webhooks och verkliga adapters

**Mål**  
Göra integrationsplattformen till ett kontrollerat, säkert och kontraktstestat lager med riktiga adapters, capability manifests, signed webhooks och sandbox/prod-isolering.

**Varför fasen behövs**  
Repoet har många providerfiler men historiskt har simulatorer blandats med verkliga flows. Public/partner API och webhooks måste vara hårt kontrakterade för att vara säkra och supportbara.

**Exakt vad som ska uppnås**  
Göra integrationsplattformen till ett kontrollerat, säkert och kontraktstestat lager med riktiga adapters, capability manifests, signed webhooks och sandbox/prod-isolering.

**Kodområden från zipen som påverkas**  
- packages/domain-integrations/src/index.mjs
- packages/domain-integrations/src/control-plane.mjs
- packages/domain-integrations/src/partners.mjs
- packages/domain-integrations/src/public-api.mjs
- packages/domain-integrations/src/regulated-submissions.mjs
- packages/domain-integrations/src/providers/*.mjs
- apps/api/src/phase13-partner-routes.mjs
- apps/api/src/phase13-public-routes.mjs
- apps/api/src/phase13-automation-routes.mjs
- apps/api/src/phase13-job-routes.mjs
- apps/api/src/phase16-integration-routes.mjs
- apps/worker/src/worker.mjs

**Behåll**  
- Integrations package split, provider concept and control-plane direction.

**Förstärk / härda**  
- Connection manifests, API contracts, webhook security, adapter health.

**Skriv om**  
- Any implicit live/non-live ambiguity.
- Any provider-specific truth leaking into business IDs.

**Ersätt**  
- Simulator-first adapter assumptions with capability-first adapter contracts.

**Ta bort / deprecate**  
- Unbounded public/partner surfaces without contract-test pack.

**Migrera**  
- Existing providers to manifests and security policies.

**Nya objekt / objektmodell**  
- `IntegrationConnection(connectionId, providerCode, capabilityManifestRef, secretRef, mode, status)`
- `CapabilityManifest(manifestId, supportsLegalEffect, sandboxSupported, trialSafe, webhookMode)`
- `WebhookDelivery(deliveryId, endpointRef, signatureMetadata, replayWindow, status)`
- `ContractTestPack(packId, providerCode, scenarioRefs, baselineRef)`

**Source of truth**  
Integrations control plane owns connections, manifests and adapter policy. Domain packages own business truth and legal decisions.

**State machines**  
- `IntegrationConnection: draft -> validated -> active | disabled`
- `WebhookDelivery: pending -> delivered | failed | dead_lettered`

**Commands**  
- `registerIntegrationConnection`
- `publishCapabilityManifest`
- `dispatchWebhookDelivery`
- `runContractTestPack`

**Events**  
- `integration.connection.activated`
- `capability_manifest.published`
- `webhook.delivery.failed`
- `contract_test_pack.passed`

**API-kontrakt**  
- `/v1/integrations/*`
- `/v1/public/*`
- `/v1/partner/*`
- `/v1/webhooks/*`

**Webhook-kontrakt**  
- All provider callbacks and outbound event deliveries go through signed webhook contracts from this phase.

**Permissions**  
- integration_admin
- partner_admin
- security_admin

**Review boundaries**  
- Live adapter enablement requires domain owner + integration owner + security owner approval.

**Blockerande valideringar**  
- No adapter may be marked live if `supportsLegalEffect=false`.
- Public/partner APIs require versioned contract and idempotency semantics.

**Auditkrav / evidence / receipts**  
- Connection changes, webhook secret rotations, contract-test results and live-enablement auditloggas.

**Retry / replay / dead-letter / recovery**  
- Webhook deliveries and provider callbacks use canonical retry/backoff/dead-letter.

**Rulepacks / versionering / effective dating**  
- Provider baselines from phase 5 govern adapter schemas.

**Testkrav**  
- contract test packs
- webhook replay tests
- manifest validation tests
- sandbox/prod isolation tests

**Golden scenarios**  
- A signed inbound webhook cannot be replayed outside its replay window and still produces deterministic idempotent business handling.

**Migrations- / cutoverkrav**  
- Source-system adapters for migration must reuse connection/manifests but separate live provider state.

**Runbooks som krävs**  
- `docs/runbooks/integration-connection-management.md`
- `docs/runbooks/webhook-security.md`
- `docs/runbooks/provider-contract-tests.md`

**Roadmap-delfaser och exakt implementation**  
- **15.1 [HARDEN]** — Integrations control plane blir source of truth för connection profiles, secret refs, capability manifests, mode matrices och health.
- **15.2 [HARDEN]** — Public API och partner API får versionssatta kontrakt, idempotency, scoped permissions, signed callbacks och replay protection.
- **15.3 [REPLACE]** — Byt ut återstående simulerade adapters mot riktiga finance/auth/document/submission adapters där domängater tillåter; övriga markeras explicit non-live.
- **15.4 [SECURE]** — Webhook security: HMAC/detached signature, replay window, secret rotation, dead-letter, redelivery, signature metadata och masked logging.
- **15.5 [HARDEN]** — Trial-safe adapter layer: `trial_safe`, `sandbox_supported`, `supportsLegalEffect`, receipt mode, provider isolation.
- **15.6 [NEW BUILD]** — Prioriterad adapterordning för svenska migrations- och ekosystembehov: SIE4/CSV universellt, därefter Fortnox, Visma-familjen, Bokio, PE Accounting/Specter, därefter CRM/project och spend/bank/payments.

**Exit gate**  
- Integrationslagret har verklig control plane, contract tests och signerade webhooks.
- Live adapters är tydligt separerade från non-live/trial-safe adapters.
- Prioriterade svenska ekosystemadapters är byggda i rätt ordning.

## Fas 16 — One-click migration/import engine, bureau mode, cutover, parallel run och rollback

**Mål**  
Bygga den generella svenska migration-/onboardingmotor som gör det möjligt att starta ett byte med ett klick, upptäcka källsystem, mappa automatiskt, diffa, blockera, signera, köra parallel run, promota till live och rulla tillbaka med evidence.

**Varför fasen behövs**  
Detta är ett explicit marknadsvinnande krav. Nuvarande migration/cutover är för cockpit- och metadatafokuserad och inte tillräckligt generisk eller säker.

**Exakt vad som ska uppnås**  
Bygga den generella svenska migration-/onboardingmotor som gör det möjligt att starta ett byte med ett klick, upptäcka källsystem, mappa automatiskt, diffa, blockera, signera, köra parallel run, promota till live och rulla tillbaka med evidence.

**Kodområden från zipen som påverkas**  
- packages/domain-core/src/migration.mjs
- packages/domain-core/src/state-snapshots.mjs
- packages/domain-core/src/close.mjs
- packages/domain-integrations/src/index.mjs
- packages/domain-sie/src/index.mjs (new)
- packages/domain-owner-distributions/src/index.mjs (new, for shareholder imports)
- packages/domain-hr/src/index.mjs
- packages/domain-time/src/index.mjs
- packages/domain-balances/src/engine.mjs
- packages/domain-ar/src/index.mjs
- packages/domain-ap/src/index.mjs
- packages/domain-ledger/src/index.mjs
- packages/domain-payroll/src/index.mjs
- packages/domain-projects/src/index.mjs
- packages/domain-documents/src/index.mjs
- packages/domain-evidence/src/index.mjs
- apps/api/src/phase14-migration-routes.mjs
- apps/api/src/phase14-migration-intake-routes.mjs

**Behåll**  
- Migration cockpit concepts, but not metadata-only rollback.

**Förstärk / härda**  
- Discovery, mapping, diff, signoff, rollback, parallel run, bureau cohorts.

**Skriv om**  
- Current core migration rollback and cutover assumptions.

**Ersätt**  
- One-off vendor-specific migration stories with generic engine + adapter family model.

**Ta bort / deprecate**  
- Spreadsheet-led cutover truth.
- Rollback plans without actual restore/checkpoint execution.

**Migrera**  
- Existing migration artifacts, diff reports and cutover plans into canonical engine.

**Nya objekt / objektmodell**  
- `SourceSystemProfile(profileId, familyCode, vendorHint, detectedCapabilities, sourceType)`
- `SourceConnection(connectionId, authMethod, secretRef, scopes, expiresAt)`
- `ExtractManifest(manifestId, datasetTypes, sourceChecksum, periodScope)`
- `CanonicalDataset(datasetId, datasetType, rowCount, checksum, lineageRefs)`
- `MappingSet(mappingSetId, sourceProfileId, targetDomainCode, confidenceScore, overrides)`
- `VarianceReport(reportId, materialityClass, blockerCodes, differences)`
- `ImportBatch(batchId, datasetId, status, evidenceRefs)`
- `ParallelRunPlan(planId, scopes, thresholds, signoffRefs)`
- `CutoverPlan(planId, freezeAt, finalExtractManifestRef, rollbackCheckpointRef)`

**Source of truth**  
Migration engine owns discovery, mapping, diff, signoff, cutover and rollback truth. Business domains own the imported objects after commit.

**State machines**  
- `SourceSystemProfile: discovered -> connected -> extracted -> mapped -> ready_for_import`
- `ImportBatch: registered -> importing -> imported | failed`
- `CutoverPlan: draft -> freeze_started -> final_extract_done -> import_complete -> accepted -> switched | rolled_back`
- `ParallelRunPlan: drafted -> running -> passed | failed`

**Commands**  
- `discoverSourceSystem`
- `connectSourceSystem`
- `registerExtractManifest`
- `createMappingSet`
- `generateVarianceReport`
- `executeImportBatch`
- `createParallelRunPlan`
- `startCutover`
- `executeRollback`

**Events**  
- `source_system.discovered`
- `mapping_set.created`
- `variance_report.generated`
- `import_batch.executed`
- `parallel_run.completed`
- `cutover.started`
- `rollback.executed`

**API-kontrakt**  
- `/v1/migration/discovery/*`
- `/v1/migration/mappings/*`
- `/v1/migration/imports/*`
- `/v1/migration/cutover/*`
- `/v1/migration/bureau/*`

**Webhook-kontrakt**  
- Source-system API callbacks and long-running extract callbacks through integrations layer where available.

**Permissions**  
- implementation_lead
- customer_finance_approver
- payroll_approver
- bureau_admin
- security_admin

**Review boundaries**  
- Any blocker-code waiver, payroll YTD acceptance, shareholder-data import or direct-live cutover requires explicit signoff chain.

**Blockerande valideringar**  
- One-click means one click to start discovery/dry-run, never one click to skip blockers.
- Rollback requires sealed checkpoint and verified restore path.
- Parallel run mandatory for finance/payroll/HUS when thresholds or source quality require it.

**Auditkrav / evidence / receipts**  
- Every import, diff waiver, signoff, cutover and rollback produces immutable evidence.

**Retry / replay / dead-letter / recovery**  
- Discovery/import/cutover jobs are resumable and idempotent by manifest/batch/plan id.

**Rulepacks / versionering / effective dating**  
- Mapping templates and tolerance thresholds versioned separately from business rulepacks.

**Testkrav**  
- discovery tests
- canonical dataset tests
- mapping confidence tests
- variance report tests
- cutover/rollback drills
- parallel run tests
- bureau cohort tests

**Golden scenarios**  
- Fortnox/Visma/Bokio/SIE/CSV-like sources can all enter the same canonical migration path.
- A failed cutover can be rolled back to sealed checkpoint with verified recovery evidence.

**Migrations- / cutoverkrav**  
- This phase defines migration itself.

**Runbooks som krävs**  
- `docs/runbooks/source-discovery-and-consent.md`
- `docs/runbooks/cutover-and-rollback.md`
- `docs/runbooks/bureau-portfolio-migrations.md`

**Roadmap-delfaser och exakt implementation**  
- **16.1 [NEW BUILD]** — Bygg source discovery, adapter model, auth/consent och capability detection för API, SIE4, CSV, filpaket och bureau handoff.
- **16.2 [NEW BUILD]** — Definiera canonical import datasets för masterdata, chart of accounts, customers/vendors, open items, balances, HR/payroll/YTD, projects/time, documents, tax account history och shareholder data.
- **16.3 [NEW BUILD]** — Bygg auto-mapping, confidence scoring, variance reports, blocker codes, manual overrides och signoff chain.
- **16.4 [REWRITE][MIGRATE]** — Import execution, evidence bundles, immutable checkpoints, restore points och rollback orchestration blir riktiga tekniska flöden, inte bara metadata.
- **16.5 [OPERATIONALIZE]** — Parallel run och guided cutover med freeze windows, final extract, diff thresholds, live promotion och post-cutover watch.
- **16.6 [NEW BUILD]** — Bureau portfolio mode: återanvändbara mapping templates, cohort dashboards, delegated approvals och multi-client cutover pipeline.

**Exit gate**  
- Källsystem kan upptäckas, mappas, diffas och importeras via samma generiska motor.
- Rollback och parallel run är tekniskt verkliga och övade.
- Bureau/team kan driva många migrationer utan Excel-krig.

## Fas 17 — Operations, support, backoffice, incidents, replay och runbook-drivna driftgränser

**Mål**  
Produktisera drift, support, backoffice, incidenter, masked troubleshooting, replay, dead letters och runbooks så att plattformen går att operera säkert efter go-live.

**Varför fasen behövs**  
Ett system som är korrekt men inte går att supporta med maskning, approvals och replay kommer ändå att misslyckas i verklig drift.

**Exakt vad som ska uppnås**  
Produktisera drift, support, backoffice, incidenter, masked troubleshooting, replay, dead letters och runbooks så att plattformen går att operera säkert efter go-live.

**Kodområden från zipen som påverkas**  
- packages/domain-core/src/backoffice.mjs
- packages/domain-core/src/jobs.mjs
- packages/domain-core/src/resilience.mjs
- packages/domain-review-center/src/engine.mjs
- packages/domain-activity/src/engine.mjs
- packages/domain-notifications/src/engine.mjs
- packages/domain-observability/src/index.mjs
- packages/domain-evidence/src/index.mjs
- apps/api/src/phase14-backoffice-routes.mjs
- apps/api/src/phase14-resilience-routes.mjs
- apps/worker/src/worker.mjs
- docs/runbooks/*

**Behåll**  
- Backoffice/support domain direction and operator-first intent.

**Förstärk / härda**  
- Masked views, incidents, replay, runbooks, hermetic release evidence.

**Skriv om**  
- Any support process that assumes silent manual DB fixes.

**Ersätt**  
- Support-as-admin-screen with support-as-controlled-operations.

**Ta bort / deprecate**  
- Untracked support writes and environment-bound 'green' tests.

**Migrera**  
- Existing incident/support records and replay tooling into first-class objects.

**Nya objekt / objektmodell**  
- `SupportCase(caseId, scope, maskedViewRefs, status, ownerRef)`
- `Incident(incidentId, severity, startedAt, serviceImpact, status)`
- `ReplayOperation(operationId, scope, requestedBy, approvedBy, status)`
- `DrillRecord(drillId, drillType, runAt, result, evidenceRefs)`
- `ReleaseEvidenceBundle(bundleId, ciRunRef, artifactChecksums, scenarioResults)`

**Source of truth**  
Support/backoffice domains own operational case and incident truth; replay operations reference underlying domain objects but never supersede them.

**State machines**  
- `SupportCase: open -> in_progress -> waiting_input -> resolved | closed`
- `Incident: open -> contained -> mitigated -> resolved -> postmortem_complete`
- `ReplayOperation: requested -> approved -> running -> completed | failed`

**Commands**  
- `openSupportCase`
- `openIncident`
- `requestReplayOperation`
- `executeReplayOperation`
- `recordDrillResult`
- `freezeReleaseEvidenceBundle`

**Events**  
- `support_case.opened`
- `incident.opened`
- `replay_operation.completed`
- `drill.completed`
- `release_evidence.frozen`

**API-kontrakt**  
- `/v1/backoffice/*`
- `/v1/incidents/*`
- `/v1/replay/*`
- `/v1/drills/*`

**Webhook-kontrakt**  
- Operational alert and notification hooks only via integrations layer.

**Permissions**  
- support_admin
- support_lead
- incident_commander
- security_admin
- auditor(read)

**Review boundaries**  
- Write-capable support, break-glass continuation, replay on regulated scopes and release waivers require approvals.

**Blockerande valideringar**  
- No direct DB write path is allowed.
- CI/test suites used for release evidence must be hermetic and reproducible.

**Auditkrav / evidence / receipts**  
- All support/replay/export/drill/release actions are audit-critical.

**Retry / replay / dead-letter / recovery**  
- Replay and drill jobs idempotent by operation id and target scope.

**Rulepacks / versionering / effective dating**  
- Operational thresholds may be policy-configured, not hardcoded.

**Testkrav**  
- masked support tests
- incident escalation tests
- replay authorization tests
- hermetic CI checks
- release evidence integrity tests

**Golden scenarios**  
- A failed AGI submission can be replayed or corrected entirely through controlled operations, not database edits.

**Migrations- / cutoverkrav**  
- Cutover watch, rollback watch and pilot monitoring are operationalized here.

**Runbooks som krävs**  
- `docs/runbooks/support-case-and-replay.md`
- `docs/runbooks/incident-response.md`
- `docs/runbooks/release-evidence.md`

**Roadmap-delfaser och exakt implementation**  
- **17.1 [HARDEN]** — Support cases, incidents, masked views och operator queues blir förstaklass-objekt med SLA, ownership och escalation.
- **17.2 [HARDEN]** — Replay, dead-letter, reconciliation reruns och correction orchestration körs via kontrollerade operations, inte manuella databasfixar.
- **17.3 [SECURE][HARDEN]** — Backoffice-write, break-glass, access attestations och support exports följer chained approvals, watermarks och full evidence.
- **17.4 [OPERATIONALIZE]** — Runbooks, restore drills, incident drills, secret rotation drills, cutover rehearsals och payroll/VAT/HUS/annual emergency procedures måste finnas och bevisas.
- **17.5 [HARDEN]** — Testmiljön, CI och release evidence blir hermetisk nog för att undvika miljöbundna falska gröna tester.

**Exit gate**  
- Support/backoffice kan driva produkten utan direkt DB-access.
- Replay/dead-letter och incidenter är verktygsstödda och auditerade.
- Runbooks och drills är gröna inom policyfönster.

## Fas 18 — Pilot, parity gate, advantage gate, UI-contract freeze och GA

**Mål**  
Bevisa backend i riktiga kundkedjor, köra pilot, stänga alla blockerare och först därefter låsa externa kontrakt för UI och bred go-live.

**Varför fasen behövs**  
UI får inte användas som bevis för att backend är färdig. Verkliga pilotkedjor, golden scenarios, parity/advantage-scorecards och kill-switch readiness måste finnas först.

**Exakt vad som ska uppnås**  
Bevisa backend i riktiga kundkedjor, köra pilot, stänga alla blockerare och först därefter låsa externa kontrakt för UI och bred go-live.

**Kodområden från zipen som påverkas**  
- tests/unit/*.test.mjs
- tests/integration/*.test.mjs
- tests/e2e/*.test.mjs
- apps/api/src/*
- apps/worker/src/worker.mjs
- packages/*/src/*
- docs/runbooks/*
- packages/ui-core/src/index.js (consumer contract only)
- packages/ui-desktop/src/index.js (consumer contract only)
- packages/ui-mobile/src/index.js (consumer contract only)
- apps/desktop-web/src/server.mjs (consumer contract only)
- apps/field-mobile/src/server.mjs (consumer contract only)

**Behåll**  
- Pilot/enterprise/parity/advantage thinking from current docs.

**Förstärk / härda**  
- Objective go/no-go criteria, scorecards, pilot evidence and UI contract freeze.

**Skriv om**  
- Any assumption that completed code alone equals go-live readiness.

**Ersätt**  
- General optimism with hard exit gates.

**Ta bort / deprecate**  
- Open CRITICAL/HIGH findings at GA.
- UI-first release decisions.

**Migrera**  
- Existing pilot plans and scorecards into final gate model.

**Nya objekt / objektmodell**  
- `PilotCohort(cohortId, scope, sourceSystems, requiredScenarios, status)`
- `ParityScorecard(scorecardId, category, criteria, status)`
- `AdvantageScorecard(scorecardId, differentiator, evidenceRefs, status)`
- `GoLiveDecision(decisionId, cohortRefs, blockerStatus, approvedBy, approvedAt)`

**Source of truth**  
Phase gates and evidence bundles are source of truth for GA; no narrative claim can override a failed gate.

**State machines**  
- `PilotCohort: planned -> running -> passed | failed`
- `GoLiveDecision: draft -> review_pending -> approved | rejected`

**Commands**  
- `startPilotCohort`
- `recordParityScorecard`
- `recordAdvantageScorecard`
- `approveGoLiveDecision`

**Events**  
- `pilot_cohort.started`
- `parity_scorecard.recorded`
- `advantage_scorecard.recorded`
- `go_live.approved`

**API-kontrakt**  
- `/v1/go-live/*` (internal/backoffice only)

**Webhook-kontrakt**  
- Inga.

**Permissions**  
- platform_owner
- finance_owner
- payroll_owner
- security_admin
- implementation_lead

**Review boundaries**  
- GA requires finance + payroll + security + platform owner signoff.
- Any remaining waiver must be time-boxed and below HIGH.

**Blockerande valideringar**  
- No open CRITICAL/HIGH from blocker file.
- Pilot cohorts must include finance, payroll, migration and annual/declaration scenarios if those modules are marketed as live.

**Auditkrav / evidence / receipts**  
- Go-live decision, parity/advantage records and pilot results are audit-critical.

**Retry / replay / dead-letter / recovery**  
- Pilot execution itself is not retried blindly; rerun requires new cohort evidence.

**Rulepacks / versionering / effective dating**  
- Final pilot must pin same rulepacks/baselines intended for GA.

**Testkrav**  
- full golden suite
- pilot evidence review
- final security review
- capacity/recovery tests

**Golden scenarios**  
- At least one end-to-end AB scenario from onboarding/migration to year-close, annual package and dividend payout is green.

**Migrations- / cutoverkrav**  
- At least one live migration and one rollback drill must have passed.

**Runbooks som krävs**  
- `docs/runbooks/pilot-readiness.md`
- `docs/runbooks/general-availability.md`

**Roadmap-delfaser och exakt implementation**  
- **18.1 [OPERATIONALIZE]** — Kör pilotcohorts med verkliga finance/payroll/HUS/annual/migration-scenarier och explicit rollbackberedskap.
- **18.2 [HARDEN]** — Zero-blocker gate: alla CRITICAL och HIGH från blockerfilen måste vara stängda, och inga nya oklassade driftfynd får finnas.
- **18.3 [OPERATIONALIZE]** — Competitor parity gate: bokföring, moms, lön, AGI, HUS, bank, migration, annual, SIE4 och operatorstöd måste matcha marknadens miniminivå.
- **18.4 [OPERATIONALIZE]** — Competitor advantage gate: migration concierge, unified submission cockpit, tax account cockpit, safe trial-to-live, project profitability mission control och bureau mode måste vara säljbara i verkligheten.
- **18.5 [HARDEN]** — Freeze backend contracts för UI-konsumenter; UI får börja/fortsätta först efter att backendkontrakten är bevisade.
- **18.6 [OPERATIONALIZE]** — GA readiness, kill switches, rollback paths, on-call och legal signoff innan bred go-live.

**Exit gate**  
- Pilotcohorts är gröna med evidence.
- Alla blockerande findings är stängda eller explicit accepterade enligt policy (inga CRITICAL/HIGH).
- Parity och advantage scorecards är uppnådda.
- GA runbooks, kill switches och on-call är aktiverade.


## Appendix A — Obligatorisk golden scenario-katalog

1. **AB domestic finance chain**
   - bootstrap -> chart import -> opening balance -> customer invoice -> `VatDecision` -> payment -> VAT declaration -> tax account mirror -> VAT clearing -> locked report -> SIE4 export

2. **Domestic AP chain**
   - supplier invoice -> domestic `VatDecision` -> payment -> bank statement match -> ledger -> VAT declaration

3. **Payroll full chain**
   - employee with ordinary salary + benefit + travel reimbursement + sickness + vacation + garnishment -> pay run -> employee receivable if needed -> AGI -> payment -> ledger -> tax account

4. **HUS chain**
   - HUS invoice basis -> claim -> partial acceptance -> customer difference path -> recovery or payout -> ledger -> regulated receipt

5. **Annual / corporate tax / owner distribution chain**
   - hard close -> annual package -> current tax computation -> declaration pack -> signatory chain -> dividend decision -> payout -> KU31/kupongskatt

6. **Foreign currency chain**
   - foreign-currency invoice -> SEK posting -> settlement -> FX difference -> locked reporting

7. **Migration chain**
   - discovery -> extract -> mapping -> diff -> dry run -> signoff -> final extract -> import -> parallel run -> cutover -> rollback rehearsal

8. **Trial to live chain**
   - trial bootstrap -> activity in isolated mode -> promotion plan -> allowed-data promotion -> live cutover without copied secrets/receipts

9. **Project profitability chain**
   - quote/project -> time/payroll/AP/travel/HUS costs -> invoice -> WIP -> profitability mission control

10. **Support/replay chain**
   - failed regulated submission -> workbench item -> replay/correction -> new receipt -> evidence bundle


## Appendix B — Blocker-traceability till implementation

| Finding | Kort titel | Bindande delfas(er) |
| --- | --- | --- |
| F-001 | Fyra olika `roundMoney`-familjer ger olika pengar i olika domäner | 1.1 |
| F-002 | `normalizeMoney` betyder olika saker i olika domäner | 1.1 |
| F-003 | DSAM-kontoplanen har systematiskt felklassade BAS-klasser | 7.3 |
| F-004 | AR utfärdar fakturor utan att skapa spårbara `VatDecision`-objekt | 8.1, 8.3 |
| F-005 | Inhemsk AP-VAT beräknas som förslag men skapar ingen persisted VAT-sanning | 8.2, 8.3 |
| F-006 | Payroll saknar skattetabellsmotor och A-SINK; ordinary tax är fortfarande manuell procentsats | 11.1 |
| F-007 | `EXPENSE_REIMBURSEMENT` behandlas som skattepliktig bruttolön och avgiftsunderlag | 11.3 |
| F-008 | HUS-domänen saknar helt ledgerbrygga för claim, acceptance, partial acceptance och recovery | 12.2 |
| F-009 | HUS-rulepacket för 2025 har fel ROT-sats från årets början | 5.1, 12.1 |
| F-010 | HUS använder `laborCostAmount` direkt utan att definiera om beloppet är inklusive eller exklusive moms | 12.1 |
| F-011 | Ledger lagrar utländsk valuta men bokför inte om till SEK | 7.4 |
| F-012 | Endast 13 domäner ligger bakom API:ets kritiska durable-persistence-wrapper | 2.1 |
| F-013 | Persistence-proxyn muterar först och persisterar sedan; misslyckad save lämnar systemet split-brain | 2.2 |
| F-014 | Generisk cutover-rollback är bara metadata, inte faktisk dataåterställning | 16.4, 16.5 |
| F-015 | TOTP-hemligheter exporteras durably i klartext | 3.2, 6.1 |
| F-016 | Login och TOTP saknar rate limiting och lockout | 3.4, 6.6 |
| F-017 | Årsredovisningssignering godkänner "någon tillåten roll" i stället för full signatory chain | 12.4 |
| F-018 | Kontantmetodens year-end catch-up summerar bara poster och bokför inget | 7.5 |
| F-019 | SIE-export saknas helt | 7.6, 16.2 |
| F-020 | Payroll klipper negativ nettolön till noll i postings utan motfordran på anställd | 11.5 |
| F-021 | Manuella verifikationer och soft-lock override saknar verklig dual control | 4.5, 7.2 |
| F-022 | Verifikationsnummer förbrukas före postning och verifikationstext är frivillig | 7.2 |
| F-023 | Öppningsbalans och resultatöverföring saknar faktisk motor | 7.5 |
| F-024 | Avskrivningsmotor saknas trots dokumenterad design och source types | 7.6 |
| F-025 | Periodiseringsmotor saknas trots att domänen låtsas stödja den | 7.6 |
| F-026 | Momsavstämning/nollställning av 2610–2640 mot 2650 saknas | 7.6, 8.3 |
| F-027 | VAT-domänen klassar Grekland fel när indata använder `GR` | 1.5, 8.3 |
| F-028 | VAT-scenariomotorn ignorerar viktiga undantag och gör ingen VIES-validering | 8.3, 15.3 |
| F-029 | Skattekontot har felklassificerad `REFUND` och omappad `MANUAL_ADJUSTMENT` | 8.5 |
| F-030 | AGI-summeringen saknar arbetsgivarsidans avgiftsbelopp på aggregatnivå | 11.6, 12.3 |
| F-031 | Sjuklön och karens finns som lönearter men inte som automatisk svensk beräkning | 10.2, 11.4 |
| F-032 | Semesterberäkning och semesterskuld följer inte Semesterlagen | 10.3, 11.4 |
| F-033 | AP saknar logik för F-skatt/A-skatt-konsekvenser vid ersättning för arbete | 8.2 |
| F-034 | AR:s fakturakravskontroll saknar säljaruppgifter som lagen kräver | 8.1 |
| F-035 | Annual reporting kräver hard close men skapar inga bokslutsverifikationer och saknar K2/K3-logik | 7.7, 12.4 |
| F-036 | Reporting genererar snapshots över öppna perioder utan enforcement och rundar löpande | 14.1 |
| F-037 | Payroll hämtar kollektivavtalsoverlay men använder det inte för OB/Jour/Beredskap/Övertid | 10.4, 11.7 |
| F-038 | Organisationsnummer valideras inte med kontrollsiffra | 1.5, 6.3 |
| F-039 | API-gatewayn saknar body-storleksgräns och exponerar råa felmeddelanden | 3.4, 4.4 |
| F-040 | API-svar saknar centrala HTTP-säkerhetshuvuden | 3.4 |
| F-041 | Worker kan lämna jobb i claimed/okänt tillstånd vid tidigt fel | 2.4, 17.2 |
| F-042 | Payroll använder konto 1930 som default fast kontot inte finns i ledgerns DSAM | 7.3, 11.6 |
| F-043 | A‑SINK saknas helt i payroll trots att regelverket finns 2026 | 11.1 |
| F-044 | Växa-stöd är inte modellerat som 2026 års verkliga återbetalningsflöde | 11.2, 8.5 |
| F-045 | `copy`/`clone` är duplicerat och semantiskt inkonsekvent i många domäner | 1.2 |
| F-046 | `roundMoney` i AP, field och document-engine kan ge NaN på `undefined` | 1.1, 1.2 |
| F-047 | HR tillåter överlappande anställningar | 10.1 |
| F-048 | HUS validerar bara längd på personnummer, inte checksumma eller datum | 1.5, 12.1 |
| F-049 | Snapshot-import tappar nya nycklar som inte redan finns i target state | 2.3 |
| F-050 | Travel-utlägg saknar momshantering på kvittonivå | 8.3, 11.3 |
| F-051 | Travel har svag tidszonshantering för traktamente och resdagar | 11.3 |
| F-052 | Banking bokar AP-disbursements via AP, men generella bankhändelser saknar ledgerbrygga | 8.4 |
| F-053 | Tax account saknar faktisk ledger-spegel | 8.5 |
| F-054 | Projects räknar WIP men bokför det inte | 13.2 |
| F-055 | `issueInvoice` har en svag state machine och litar på `journalEntryId` som spärr | 8.1 |
| F-056 | AP:s inhemska VAT-path strider mot systemets egen compliance-modell även när beloppen blir "rimliga" | 8.2, 8.3 |
| F-057 | Testsviten är inte hermetisk och delar är direkt miljöbundna | 17.5, 18.2 |
| F-058 | Flera 2026-värden är hårdkodade i benefits och travel och kräver årlig governance | 5.1, 5.3 |
| F-059 | Accounting-method-dokumentet beskriver en central timing-sanning som inte används konsekvent av AR/AP/VAT/ledger | 7.5, 8.6 |
| F-060 | Sessionslagning sker linjärt över alla sessioner | 6.2, 6.6 |
| F-061 | Behörighetsmodellen är grov i baslagret även om route-tester mildrar det | 4.5, 17.3 |
| F-062 | `hardCloseChecklist` attribuerar ledger-lock till skaparen, inte till faktisk slutattestant | 7.7 |
| F-063 | Kontoplanen är hårdkodad i källkod i stället för externt versionerad | 1.3, 7.3 |
| F-064 | Kloningshjälpare är duplicerade över repoet och driver framtida driftfel | 1.2 |
| F-065 | Testerna missar de viktigaste regulatoriska end-to-end-kedjorna | 17.5, 18.2 |
| F-066 | Runtime-persistens använder namnheurstik för read-vs-write i stället för explicit semantik | 2.2, 4.3 |


## Appendix C — Minsta runbook-set före go-live

- governance supersession
- value-kernel publication
- account catalog update
- transaction boundary and replay
- rollback checkpoints
- security data classification
- key rotation
- security incident response
- auth broker setup
- support impersonation
- trial-to-live promotion
- opening balances and SIE
- VAT clearing
- close and reopen
- AR/AP/VAT cutover
- bank statement reconciliation
- tax account discrepancies
- document classification review
- import-case review
- HR/time cutover
- agreement overlay verification
- payroll parallel run
- AGI corrections
- employee receivables
- HUS claims and recovery
- annual and tax declaration
- owner distributions and KU31
- project profitability
- WIP/revenue recognition
- integration connection management
- webhook security
- provider contract tests
- source discovery and consent
- cutover and rollback
- bureau portfolio migrations
- support case and replay
- incident response
- release evidence
- pilot readiness
- general availability
