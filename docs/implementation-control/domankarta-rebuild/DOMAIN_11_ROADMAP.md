# DOMAIN_11_ROADMAP

## mål

Göra Domän 11 till en verklig reglerad kärna där HUS, regulated submissions, annual reporting, corporate tax declaration packs, owner distributions, KU31 och kupongskatt är:
- juridiskt korrekta
- receipt-säkra
- replaybara
- durable
- secure-by-default
- utan fake-live eller metadata-teater

## varför domänen behövs

Detta är den del av plattformen där fel sanning direkt kan skapa:
- fel myndighetsinlämning
- fel årsredovisningssignering
- fel utdelningsbeslut eller kupongskatt
- tappade receipts
- felaktig recovery/replay
- falsk go-live-kompletthet

Domänen måste därför byggas som regulated runtime, inte som exports + statusfält.

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör HUS-kundfaktura, kundandel, kredit på kundsidan och sambandet mellan invoice truth och myndighetsfordran.
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör HUS-overlay, delad faktura, elektronisk kundbetalning, claim-version, XML/importregler, beslut, state payout, tax-account-offset, delavslag, avslag och recovery.
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör grön-teknik-overlay, split invoice, installationstyper, rulepack-satser, elektronisk kundbetalning, claim-version, payout, tax-account-offset, cash-method VAT, delavslag, avslag och recovery.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör `1630`-offset för HUS eller grön teknik, authority-event-klassning, payout-vs-offset-resolution och blocked state-claim mismatches.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör legal basis, specialtexter, reason-code-lineage och blockerade claims eller invoices utan tillracklig laglig förklaring.
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör hard close, årsredovisning, fastställelseintyg, INK2, INK2R, INK2S, uppskjuten skatt, skatt på årets resultat och filing-truth mot Bolagsverket och Skatteverket.
- `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör utdelningsbeslut, eget kapital-källor, skuld till ägare, utbetalning, KU31, kupongskatt, kupongskatteinbetalning, avstämningsbolag och owner-distribution-truth.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör filing evidence, sign-off packages, support reveal, break-glass och regulated approvals.

## faser

- Fas 11.1 HUS truth / secrecy / canonical persistence
- Fas 11.2 HUS XML / official channel / receipt model
- Fas 11.3 HUS decision import / payout / recovery / tax-account offset
- Fas 11.4 regulated submission repository / envelope / attempt / receipt durability
- Fas 11.5 regulated transport capability / send / poll / finalize hardening
- Fas 11.6 manual receipt / correction / replay / dead-letter hardening
- Fas 11.7 annual package / hard-close / version / evidence hardening
- Fas 11.8 annual signatory chain / legal completeness / annual sign security
- Fas 11.9 corporate tax declaration / SRU / iXBRL / taxonomy hardening
- Fas 11.10 owner-distribution repository / snapshot / free-equity hardening
- Fas 11.11 dividend payout / KU31 / kupongskatt / residency hardening
- Fas 11.12 provider / signing archive / external receipt hardening
- Fas 11.13 regulated route security / strong_mfa / dual-control hardening
- Fas 11.14 migration / import / cutover / replay hardening
- Fas 11.15 runbook / seed / fake-live / legacy purge

## dependencies

- Domän 1 för canonical value kernel och source-of-truth-regler.
- Domän 2 för auth, trust level, MFA, secrets och step-up.
- Domän 4 för evidence bundles och immutable artifact-familjer.
- Domän 5 för rulepack- och provider-baseline-registry.
- Domän 6 för VAT, tax-account, payment rails och authority-liability-bryggor.
- Domän 10 för payroll/AGI-brygga till regulated submissions.
- Domän 16 för support, replay, incident, backoffice och operator controls.

## vad som får köras parallellt

- 11.1 kan köras parallellt med 11.10 när canonical persistence-modeller definieras.
- 11.4 kan köras parallellt med 11.7 om receipt/evidence-kontrakt redan är låsta.
- 11.8 kan köras parallellt med 11.13 eftersom båda handlar om legal/security gates.
- 11.12 kan köras parallellt med 11.15 efter att capabilityklassning har låsts.

## vad som inte får köras parallellt

- 11.2 får inte markeras grön före 11.1.
- 11.5 får inte markeras grön före 11.4.
- 11.9 får inte markeras grön före 11.7 och 11.8.
- 11.11 får inte markeras grön före 11.10.
- 11.12 får inte markeras grön före 11.13 om extern sign/send skulle kunna kringgå step-up eller approvals.

## exit gates

- ingen HUS-path använder rå personnummer i vanlig domain state eller SQL-truth
- ingen HUS/XML/officiell kanal kan påstås live utan schema-validerad artifact family och receipt model
- regulated submissions är first-class repository-backed
- annual sign är juridiskt komplett per verkliga personer, inte bara rollklass
- corporate tax pack har tydlig official capabilityklassning och filing path
- owner distributions, KU31 och kupongskatt är durable, evidence-bound och deadline-styrda
- inga regulated high-risk routes kan köras utan strong_mfa, fresh step-up och rätt approvalkedja
- alla demo/seeds/runbooks som skapar falsk live-känsla är arkiverade, omskrivna eller borttagna

## test gates

- unit för varje canonical object, state machine, correction chain och replayregel
- integration för repository round-trip, API authz, receipts, evidence och external capability states
- e2e för HUS, annual sign/filing-prep, owner distribution payout chain och manual-official filing flows
- regulatoriska golden tests mot officiella regler för HUS, ÅRL-signering, SRU-filstruktur, KU31 och kupongskatt

## markeringar

- `keep`: HUS amount-kärna, annual versioning, owner-distribution decision logic, core regulated-submission state machine
- `harden`: HUS validation, recovery, due-date governance, current-tax scope, treaty review, operator queues
- `rewrite`: HUS persistence, annual signatory model, regulated repository, route security, owner-distribution durability
- `replace`: fake-live HUS transport, metadata-only providers, lokal signing archive, draft-only KU31/kupongskatt filing paths
- `migrate`: SQL dead surfaces till verklig runtime eller bort från live-truth
- `archive`: demo seeds, gamla runbooks som påstår live-stöd
- `remove`: `direct_api`-liveclaim för HUS utan bevis, `legacy_json`, falska statuspåståenden

## delfaser

### Delfas 11.1 HUS truth / secrecy / canonical persistence
- status: `rewrite`
- mål:
  - göra HUS domain model till enda truth path i både runtime och persistence
  - ta bort rå personidentitet ur vanlig domänstate
  - låsa buyer-, line-, payment- och readiness-truth
- arbete:
  - bygg `HusCaseRecord`, `HusBuyerRecord`, `HusServiceLineRecord`, `HusPaymentAllocationRecord`, `HusReadinessSnapshot`
  - ersätt `personal_identity_no` med secret ref, fingerprint och maskat värde
  - skriv om HUS SQL-schema så att labor/VAT/travel/equipment/admin/other motsvarar runtime-kärnan
- exit gate:
  - ingen HUS readback från repository tappar canonical belopp eller identity separation
- konkreta verifikationer:
  - skapa case med två köpare, delbetalning och årsskifte; diff mellan in-memory snapshot och repository-readback ska vara noll
  - försök skriva rått personnummer i persistence-path och verifiera hard fail
- konkreta tester:
  - unit: buyer identity masking/fingerprint
  - integration: repository round-trip för HUS-case
  - e2e: HUS readiness kvarstår identiskt efter restart
- konkreta kontroller vi måste kunna utföra:
  - lista durable state och bevisa att ingen full identitet finns
  - jämför `laborCostInclVatAmount`, `laborCostExVatAmount`, `vatAmount`, `travelAmount`, `equipmentAmount`, `adminAmount`, `otherAmount` före/efter save

### Delfas 11.2 HUS XML / official channel / receipt model
- status: `replace`
- mål:
  - bygga verklig official artifact family för HUS
  - separera live, manual official, trial och disabled capability
- arbete:
  - bygg `HusOfficialArtifact`, `HusXmlVersion`, `HusSubmissionChannel`, `HusSubmissionReceipt`
  - implementera XML-generation, XSD-validering, payment-year och claim-type blocking rules
  - ta bort `direct_api` som live claim tills officiell API-path verkligen är verifierad
- exit gate:
  - varje HUS-send har schema-version, payload hash, source checksum och channel class
- konkreta verifikationer:
  - generera XML för två köpare och verifiera schema
  - försök blanda ROT och RUT i samma fil och verifiera hard fail
  - försök blanda betalningsår och verifiera hard fail
- konkreta tester:
  - unit: XML serialization invariants
  - integration: XSD validation suite
  - e2e: manual_official HUS submission package med receipt import
- konkreta kontroller vi måste kunna utföra:
  - visa capabilityklass per kanal
  - visa att `sent` aldrig kan sättas före receipt eller explicit manual official confirmation

### Delfas 11.3 HUS decision import / payout / recovery / tax-account offset
- status: `harden`
- mål:
  - göra HUS claim->decision->payout->recovery->offset till first-class ledger- och tax-account-kedja
- arbete:
  - bygg `HusAuthorityDecisionImportBatch`, `HusAuthorityDecisionReceipt`, `HusPayoutSettlement`, `HusOffsetDecision`, `HusRecoveryCase`
  - koppla HUS till tax-account mirror med explicit authority source refs
- exit gate:
  - varje HUS claim kan följas från faktura till beslut, payout, offset eller recovery utan dold manuell tolkning
- konkreta verifikationer:
  - importera delvis godkänt beslut och verifiera att difference/recovery öppnas korrekt
  - simulera kvittning mot skattekontoskuld och verifiera att ledger + tax-account speglar samma slutläge
- konkreta tester:
  - integration: authority decision import
  - integration: HUS payout via tax-account path
  - e2e: partial acceptance -> customer receivable/recovery chain
- konkreta kontroller vi måste kunna utföra:
  - summera authority receivable saldo och få samma siffra i HUS, ledger och tax-account mirror

### Delfas 11.4 regulated submission repository / envelope / attempt / receipt durability
- status: `rewrite`
- mål:
  - ersätta snapshot-only runtime med first-class repository för regulated submissions
- arbete:
  - bygg repositories för `SubmissionEnvelope`, `SubmissionAttempt`, `SubmissionReceipt`, `SubmissionCorrectionLink`, `SubmissionEvidencePack`, `SubmissionActionQueueItem`
  - wire:a `packages/domain-regulated-submissions/src/module.mjs` mot tabellbackad runtime
- exit gate:
  - restart mitt i dispatch eller receiptimport tappar ingen state
- konkreta verifikationer:
  - dispatcha submission, krascha process mellan attempt och receiptimport, starta om och verifiera komplett lineage
- konkreta tester:
  - unit: idempotency key reuse
  - integration: persisted correction chain
  - e2e: restart-safe submission lifecycle
- konkreta kontroller vi måste kunna utföra:
  - visa envelope med samtliga attempts, receipts, evidence refs och correction links efter restart

### Delfas 11.5 regulated transport capability / send / poll / finalize hardening
- status: `replace`
- mål:
  - göra providerkoden till verklig transportmotor eller sanningsenligt manual official path
- arbete:
  - bygg adapterkontrakt `prepare`, `dispatch`, `pollReceipt`, `importManualReceipt`, `mapReceipt`, `finalize`
  - capabilityklassa varje family: AGI, VAT, HUS, annual, corporate tax
  - ta bort att `prepareTransport(...)` ensam kan främstå som live send
- exit gate:
  - ingen provider family kan markeras live utan riktig dispatch/receipt-path
- konkreta verifikationer:
  - dispatch med simulerad teknisk transport och verifiera att status inte blir `accepted` utan receipt mapping
  - kör manual official path och verifiera append-only receipt import
- konkreta tester:
  - adapter contract tests per family
  - integration: send -> technical receipt -> business receipt -> finalize
- konkreta kontroller vi måste kunna utföra:
  - lista capabilityklass, provider baseline, credential class och receipt family för varje submission family

### Delfas 11.6 manual receipt / correction / replay / dead-letter hardening
- status: `harden`
- mål:
  - göra recoverykedjan operatörssäker och regulatoriskt spårbar
- arbete:
  - bygg `SubmissionDeadLetterCase`, `SubmissionReplayPolicy`, `SubmissionManualReceiptImport`, `SubmissionRecoveryDecision` och `SubmissionCorrectionCase`
  - separera replay allowed från correction required
- exit gate:
  - dead letters, correction och replay kan inte blandas ihop
- konkreta verifikationer:
  - skapa material reject och verifiera att replay blockeras men correction öppnas
  - skapa transport timeout utan receipt och verifiera att replay-case öppnas
- konkreta tester:
  - unit: dead-letter policy
  - integration: manual receipt append-only
  - e2e: correction supersedes original envelope
- konkreta kontroller vi måste kunna utföra:
  - visa i UI/API varför ett fall är replaybart eller inte replaybart

### Delfas 11.7 annual package / hard-close / version / evidence hardening
- status: `harden`
- mål:
  - göra annual version chain durable, explainable och evidence-bound
- arbete:
  - bygg repository för annual packages, versions, evidence packs och submission events
  - knyt annual package till hard-closed ledger/reporting snapshots och immutable source fingerprint
- exit gate:
  - signerad eller superseded annual version kan inte skrivas över
- konkreta verifikationer:
  - skapa version 1, skapa version 2 med nytt snapshot, verifiera supersede chain och orörd version 1
- konkreta tester:
  - unit: supersede chain
  - integration: evidence pack lineage
  - e2e: annual package recreate after source change
- konkreta kontroller vi måste kunna utföra:
  - diffa version 1 och 2 och visa att gamla checksummor är oförändrade

### Delfas 11.8 annual signatory chain / legal completeness / annual sign security
- status: `rewrite`
- mål:
  - göra annual sign juridiskt komplett och security-härdad
- arbete:
  - bygg `AnnualSignatoryRosterSnapshot`, `AnnualSignatoryPerson`, `AnnualSignoffRequirement`, `AnnualSignSession`
  - bind signatory requirements till verklig styrelse/VD-komposition per beslutsdatum
  - kräv granular permission och fresh strong MFA för sign
- exit gate:
  - annual version kan inte bli `signed` utan personkomplett och juridiskt korrekt signatorykedja
- konkreta verifikationer:
  - AB med tre styrelseledamöter + VD ska kräva fyra signerande personer
  - försök signera med enbart en board_member och verifiera hard fail
- konkreta tester:
  - unit: legal-form signatory matrix
  - integration: annual sign-route authz
  - e2e: annual sign with full roster
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilka personer som fortfarande saknas för giltig signoff

### Delfas 11.9 corporate tax declaration / SRU / iXBRL / taxonomy hardening
- status: `rewrite`
- mål:
  - göra corporate tax pack till first-class regulated objekt med riktig capabilityklassning
- arbete:
  - bygg `CorporateTaxDeclarationPackage`, `SruArtifactFamily`, `IxbrlArtifactFamily`, `TaxonomyVersion`, `TaxDeclarationSubmissionCase`
  - bär INFO.SRU och BLÄNKETTER.SRU som riktiga artifacts, inte bara text-export
  - bind tax pack till annual version checksum, legal form och provider baseline
- exit gate:
  - inget tax pack kan bli filing-ready utan full artifact family och official capabilityklassning
- konkreta verifikationer:
  - bygg tax pack för AB och verifiera att INFO.SRU och BLÄNKETTER.SRU kan materialiseras separat
  - ändra taxonomy version och verifiera att nytt artifact family skapas
- konkreta tester:
  - unit: SRU field mapping
  - integration: taxonomy-bound artifact generation
  - e2e: tax pack -> submission case preparation
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilken annual version, taxonomy version och filing capability ett tax pack bygger på

### Delfas 11.10 owner-distribution repository / snapshot / free-equity hardening
- status: `rewrite`
- mål:
  - göra owner distributions durable och revisionssäkra
- arbete:
  - bygg repository för share classes, holding snapshots, free-equity snapshots, decisions, payment instructions, KU31 drafts och kupongskatt records
  - bind free-equity proof till signerad annual version eller explicit interimsbalans
- exit gate:
  - owner-distribution-kedjan överlever restart och export/import utan semantisk förlust
- konkreta verifikationer:
  - skapa free-equity snapshot, stämmobeslut och payout instruction; restart ska ge identisk readback
- konkreta tester:
  - unit: snapshot immutability
  - integration: decision/payout repository
  - e2e: owner-distribution full chain
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilken free-equity snapshot och vilket annual version-id en utdelning bygger på

### Delfas 11.11 dividend payout / KU31 / kupongskatt / residency hardening
- status: `replace`
- mål:
  - fullfölja dividend payout och skattekedjan till riktig filing och receipt
- arbete:
  - bygg `ResidencyEvidenceCase`, `BeneficialOwnerEvidenceCase`, `TreatyReductionReview`, `Ku31FilingCase`, `KupongskattFilingCase`
  - bind due dates, filing mode, receipt import och correction till payoutkedjan
- exit gate:
  - reduced kupongskatt, KU31 och kupongskatt filing kan inte slutföras utan komplett evidence och filing receipt
- konkreta verifikationer:
  - utländsk mottagare med treaty reduction kräver hemvistintyg + separat approval
  - svensk fysisk mottagare kräver KU31-path men inte kupongskatt withholding
- konkreta tester:
  - unit: withholding profile matrix
  - integration: KU31 filing-case creation
  - e2e: payout -> ku31/kupongskatt due-date monitor
- konkreta kontroller vi måste kunna utföra:
  - visa varför en mottagare fått 30 procent, lägre procentsats eller ingen kupongskatt

### Delfas 11.12 provider / signing archive / external receipt hardening
- status: `replace`
- mål:
  - ersätta metadata-only providers och lokal signing archive med riktig capabilityklassning och verkliga external refs
- arbete:
  - bygg `ProviderCapabilityManifest`, `ProviderCredentialClass`, `ExternalReferenceFamily`, `SigningArchiveReceipt`
  - ersätt `signicat-signing-archive` Map-lösning
- exit gate:
  - ingen provider ser live ut utan verklig credential class, receipt family och failure model
- konkreta verifikationer:
  - lista alla providers och verifiera exakt capabilityklass per family
- konkreta tester:
  - integration: capability manifest validation
  - integration: archive receipt format
- konkreta kontroller vi måste kunna utföra:
  - bevisa att annual sign archive ref kommer från verklig extern eller HSM/KMS-bunden intern lösning

### Delfas 11.13 regulated route security / strong_mfa / dual-control hardening
- status: `rewrite`
- mål:
  - göra route-contractens security claim till verklig runtime enforcement
- arbete:
  - bygg central enforcement av required trust level, session age och fresh step-up
  - inför granular permissions för HUS send/override, annual sign, submission sign/send, dividend payout, KU31 build/finalize och kupongskatt reduction
- exit gate:
  - ingen high-risk regulated route kan köras med bara `company.manage` eller `company.read`
- konkreta verifikationer:
  - försök annual sign utan fresh strong MFA och verifiera hard fail
  - försök payout med fel permission men rätt surface policy och verifiera hard fail
- konkreta tester:
  - integration: deny matrix per route
  - e2e: fresh step-up expiry
- konkreta kontroller vi måste kunna utföra:
  - visa i audit/evidence exakt vilken step-up session och approval receipt som låg bakom varje high-risk action

### Delfas 11.14 migration / import / cutover / replay hardening
- status: `migrate`
- mål:
  - kunna migrera regulated historik eller blockera den explicit utan falsk completeness
- arbete:
  - bygg `HusHistoryImportBatch`, `AnnualImportBatch`, `OwnerDistributionImportBatch`, `RegulatedHistoryVarianceReport`
  - definiera cutover-regler för receipts, pending filings, open HUS differences, unpaid kupongskatt och unsigned annual versions
- exit gate:
  - migration kan inte markeras klar utan uttrycklig status för varje regulated delmängd
- konkreta verifikationer:
  - importera historiskt HUS-case och verifiera claim/recovery-läge
  - importera gammal utdelningsskuld och verifiera payout-/kupongskattreadiness
- konkreta tester:
  - integration: regulated history import
  - e2e: cutover block på saknade receipts eller öppna filing cases
- konkreta kontroller vi måste kunna utföra:
  - skriva ut en cutover-rapport som visar exakt vad som migrerats, blockeras eller kräver manuell legal review

### Delfas 11.15 runbook / seed / fake-live / legacy purge
- status: `archive`
- mål:
  - rensa ut allt som skapar falsk regulated live-känsla
- arbete:
  - klassificera och skriva om runbooks för HUS, annual, submission, owner distributions, KU31 och kupongskatt
  - flytta demo-seeds till test-only eller ta bort dem från protected/live
  - skriva explicit capabilitytabeller i runbooks
- exit gate:
  - ingen runbook eller seed får påstå live-förmåga som runtime inte har
- konkreta verifikationer:
  - grep/inspektera live bootstrap och verifiera att demo annual/HUS/submission seeds inte laddas
  - jämför runbook capability claims mot faktisk provider manifest
- konkreta tester:
  - integration: protected/live boot deny för demo regulated seeds
  - docs-lint/test som blockerar förbjudna capabilityord i arkiverade runbooks
- konkreta kontroller vi måste kunna utföra:
  - lista varje runbook som `keep`, `rewrite`, `archive` eller `remove` och visa motiv
