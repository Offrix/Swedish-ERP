# DOMAIN_07_ROADMAP

## mål

Bygg om dokument-, OCR-, review-, evidence-, archive- och exportdomänen så att original, derivat, bevarande, audit och cross-domain användning blir regulatoriskt korrekt, spårbar och go-live-säker.

## varför domänen behövs

- denna domän avgör om bokföringsunderlag, kvitton, fakturor, kontrakt och stödbevis kan litas på
- denna domän avgör om OCR och klassning får användas utan att skapa falsk sanning
- denna domän avgör om review, evidence, retention och export håller vid revision, incident och myndighetsgranskning
- denna domän avgör om AP, ÄR, payroll, HUS, annual reporting och support ärver korrekt dokumenttruth

## bindande tvärdomänsunderlag

- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` är den enda bindande scanning-, OCR-, AI fallback-, confidence-, routing- och review-sanningen.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` är den enda bindande structured-document-sanningen för Peppol, offentlig e-faktura, endpoint binding, transport receipts, duplicate control och routing av strukturerade e-fakturor som inte får ga genom OCR-sparet.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` är den enda bindande generiska callback-, webhook-, schema-, signature- och adapterkontraktssanningen för externa integrationskedjor som inte ägs av Peppol eller OCR-sparet.
- Domän 7 får implementera, hardna och verifiera denna sanning men får inte definiera en avvikande scanningmodell.

## faser

- Fas 7.1 inbox/email-ingest hardening
- Fas 7.2 attachment/malware/quarantine hardening
- Fas 7.3 source-fingerprint/duplicate/chain-of-custödy hardening
- Fas 7.4 original-binary/hash/provenance hardening
- Fas 7.5 document-record/version-chain/redaction/export hardening
- Fas 7.6 OCR runtime/callback/capability hardening
- Fas 7.7 OCR threshold/rerun/review-task hardening
- Fas 7.8 classification/extraction/search-boundary hardening
- Fas 7.9 review-center/decision-effect hardening
- Fas 7.10 import-case/cross-domain-link hardening
- Fas 7.11 evidence-bundle/snapshot/export/manifest hardening
- Fas 7.12 retention/7-year/legal-hold/deletion hardening
- Fas 7.13 security-classification/access/redaction hardening
- Fas 7.14 runbook/legacy-doc/false-claim cleanup hardening

## dependencies

- 7.1 måste vara klar före 7.2 och 7.3
- 7.2 måste vara klar före 7.6
- 7.3 och 7.4 måste vara klara före 7.5, 7.10 och 7.11
- 7.5 måste vara klar före 7.11 och 7.13
- 7.6 måste vara klar före 7.7
- 7.7 måste vara klar före 7.8 och 7.9
- 7.8 måste vara klar före 7.10
- 7.9 måste vara klar före 7.10 och 7.13
- 7.11 måste vara klar före 7.12 och 7.14
- 7.12 måste vara klar före 7.13

## vad som får köras parallellt

- 7.1 och 7.11 efter att source of truth för dokument-ID är låst
- 7.2 och 7.12 när quarantine- och retentionklassmodellen inte längre flyttar på objektidentitet
- 7.6 och 7.8 när provider capability-modellen redan är låst
- 7.9 och 7.10 när review item identity och import-case identity redan är låsta

## vad som inte får köras parallellt

- 7.3 får inte köras parallellt med 7.4 om hash- eller content identity-modellen fortfarande ändras
- 7.5 får inte köras parallellt med 7.13 när redaction- och exportboundary-modellen inte är låst
- 7.6 får inte markera capability som live innan verklig providerkedja finns
- 7.12 får inte köras parallellt med delete/export-ändringar som ännu inte respekterar legal hold

## exit gates

- company inbox har verklig transport- eller tydligt klassad internal-intake-modell utan falsk e-postrealism
- attachments kan inte passera som `clean` utan verkligt scannerreceipt
- originalbinär och content identity kan inte fabriceras av klient
- redaction finns som separat variant och original kan inte muteras
- OCR capability är sanningsenligt klassad
- review och classification har full operativ state machine
- import-case apply skapar verklig downstream-exekvering
- evidence export och document export bär verkligt manifest
- legal hold, retention och deletion enforcement är verklig runtime
- support/export/access boundaries läcker inte mer än policy tillåter

## test gates

- varje delfas måste ha minst:
  - ett green-path-test
  - ett fail-path-test
  - ett replay/idempotens-test där relevant
  - ett export-/audit-test där relevant
- alla bokföringsnära retentionfall ska verifieras mot officiella källor
- alla provider claims ska verifieras mot verklig adapter/runtime, aldrig bara mot capability text

## inbox/OCR gates

- inbox får inte kallas live mailintag utan verklig transport receipt-kedja
- OCR får inte kallas live utan verklig provider auth, callbackverifiering och receipt capture
- callbackmodell får inte blanda användarsession och provider callback i samma säkerhetsmodell

## duplicate/confidence/review gates

- multikanals dedupe måste fungera över message-id, raw mail identity, attachment fingerprint och dokumentidentitet
- confidence thresholds måste kunna visa varför auto passerade eller varför review blockerade
- review tasks måste ha full `claim -> correct -> approve | reject | requeue`

## version-chain/redaction/archive gates

- original måste vara content-addressed och immutabelt
- alla derivat måste peka på källa med chain completeness-status
- redaction får aldrig mutera original och måste bära egen provenance
- archive får inte förstöra version chain, holds eller evidence refs

## evidence/export/manifest gates

- varje document export och evidence export måste bära manifest med artifactlista, checksums, varianttyper, chain-of-custödy-länkar och exporttidpunkt
- export måste kunna verifieras offline utan att lita på processminne
- export får inte kringgå redaction, retention eller hold

## retention/security gates

- bokföringsnära material måste få riktig retention class och får aldrig bli `unspecified`
- legal hold måste blockera delete och otillåten export
- sender-trust-signaler måste modelleras separat från affärsverifiering
- support/export måste styras av samma access- och redactionpolicy som sök och review

## markeringar

- keep:
  - immutable document versions med parent linkage
  - review-center motor med SLA-scan
  - evidence bundle freeze/checksum-koncept
  - masked search för `PAYROLL`, `BENEFITS` och `TRAVEL`
- harden:
  - sender trust receipt
  - multikanals dedupe
  - hash/version/provenance
  - queue code registry
  - decision-effect ledger
  - retention class governance
- rewrite:
  - inbox realitet och transportlager
  - duplicate/source fingerprint-governance
  - document export package
  - OCR callback authmodell
  - review task reject/requeue
  - evidence export package
  - access/export boundary
- replace:
  - callerstyrd malware/scanresultat
  - callerstyrd originalhash/originalstorlek
  - fake-live OCR provider capability
  - metadata-only import apply
  - enum-only legal hold/deletion
  - avsaknad av redactionvariant
- migrate:
  - befintliga dokument till canonical content identity records
  - befintliga retentionklasser från `unspecified` till explicit klass
  - gamla review queue codes till canonical registry
- archive:
  - `docs/runbooks/ocr-malware-scanning-operations.md`
  - `docs/runbooks/evidence-bundle-export.md`
  - `docs/policies/data-retention-gdpr-and-legal-hold-policy.md`
  - `docs/runbooks/support-backoffice-and-audit-review.md`
  - `docs/runbooks/fas-2-company-inbox-verification.md`
  - `docs/runbooks/fas-2-ocr-review-verification.md`
  - `docs/runbooks/fas-2-document-archive-verification.md`
- remove:
  - falska live claims om OCR provider readiness i gamla docs och capabilitytexter
  - döda review task states om full reject/requeue inte byggs

## delfaser

### inbox/email-ingest hardening
- mål:
  - göra inbox till sanningsenlig intake-modell utan falsk mailinfrastruktur
- arbete:
  - bygg `InboxTransportReceipt`, `InboundMailProviderProfile`, `InboundMessageEnvelope` och `InboundMessageAcquisition`
  - skilj transport acquisition från document routing
  - klassa nuvarande POST-ingest som `internal_intake_api` tills verklig providerkedja finns
  - bind raw mail storage ref till acquisition receipt
- exit gate:
  - varje meddelande har transportklass, råmailreceipt och acquisition source
  - UI och docs kan inte kalla intern API-ingest för verkligt mailintag
- konkreta verifikationer:
  - verifiera att samma råmail inte kan sakna acquisition receipt
  - verifiera att intake route redovisar `internal_intake_api` när verklig provider saknas
  - verifiera att raw mail kan spåras till channel, provider och actor/system source
- konkreta tester:
  - integrationstest för inbox acquisition receipt
  - negativt test för ingest utan acquisition receipt i skyddade lägen
  - replaytest för samma råmail med samma provider receipt
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - lista alla inbox channels med faktisk transportklass
  - visa ett dokument hela vägen från raw mail till document id

### attachment/malware/quarantine hardening
- mål:
  - göra filsäkerhet och quarantine verklig
- arbete:
  - bygg `AttachmentScanReceipt`, `AttachmentThreatAssessment`, `AttachmentContainerInspection` och `QuarantineDecision`
  - gör scanner provider, scan time, scan verdict, scanner version och evidence refs obligatoriska
  - bygg blocker paths för password-protected archive, nested archive, executable payload och archive bomb
  - förbjud default `clean`
- exit gate:
  - inga attachments kan routas utan scanner receipt
  - quarantine reason codes täcker malware, policy violation, encrypted archive, nested archive depth och archive bomb
- konkreta verifikationer:
  - verifiera att attachment utan scanreceipt blockeras
  - verifiera att encrypted zip hamnar i quarantine med rätt blocker code
  - verifiera att scanreceipt följer med till audit/export
- konkreta tester:
  - unit-test för scanreceipt required
  - integrationstest för malware -> quarantine
  - integrationstest för encrypted archive -> blocked
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - skriva ut scanner provider/version/verdict per attachment
  - visa att inget dokument kan skapas från attachment utan clean receipt

### source-fingerprint/duplicate/chain-of-custödy hardening
- mål:
  - göra source fingerprint, duplicate detection och provenance multikanalssäkra
- arbete:
  - bygg `MessageIdentity`, `AttachmentIdentity`, `DocumentIdentity`, `DuplicateDecision` och `ProvenanceReceipt`
  - inkludera sender, recipient, inbound address, raw mail hash, attachment hash, supplier refs och source document refs
  - särskilj `technical_sender_signal` från `business_verification`
  - bygg append-only duplicate decision trail
- exit gate:
  - samma dokument kan identifieras över e-post, upload, migration och partner API
  - provenance kan inte tappas när attachment routas till document
- konkreta verifikationer:
  - verifiera cross-channel duplicate match mellan inbox och migration
  - verifiera att sender- och inbound-provenance överlever attachment routing
  - verifiera att duplicate decision kan granskas i efterhand
- konkreta tester:
  - unit-test för multikanals dedupe
  - integrationstest för provenance inheritance till document
  - replaytest för duplicate detection across channels
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa duplicate lineage för ett dokument som kommit via två kanaler
  - visa att teknisk avsändarsignal inte markeras som affärsverifiering

### original-binary/hash/provenance hardening
- mål:
  - göra originalbinärens identitet verklig och framtidssäker
- arbete:
  - bygg `ContentIdentityRecord`, `StorageReceipt`, `HashPolicy`, `HashRotationRecord` och `OriginalBinaryCapture`
  - beräkna hash i plattformen från verkliga bytes
  - lagra `hashAlgorithm`, `hashVersion`, `capturedAt`, `capturedBy`, `storageReceiptRef`
  - förbjud callerstyrd `fileHash`/`fileSizeBytes` på production paths
- exit gate:
  - originalhash och storlek kan bara komma från faktisk byte capture
  - storage migration kan visa obruten content identity
- konkreta verifikationer:
  - verifiera att raw bytes krävs för originalvariant
  - verifiera att hashrotation inte byter dokumentidentitet
  - verifiera att storage receipt följer med exportmanifest
- konkreta tester:
  - unit-test för hashcomputed-not-supplied
  - migrationstest för storage receipt continuity
  - negativt test för supplied hash utan bytes
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - räkna om hash från lagrat original och jämför mot content identity record
  - visa vem och vilket system som fångade originalet

### document-record/version-chain/redaction/export hardening
- mål:
  - göra dokumentkedjan fullständig, exportbar och säker
- arbete:
  - bygg `DocumentChainStatus`, `DocumentVariantPolicy`, `RedactionVariant`, `DocumentExportPackage` och `DocumentExportManifest`
  - inför varianttyp `redaction`
  - bind export till chain completeness och access policy
  - gör variantpolicyn explicit för `original`, `ocr`, `classification`, `rendered_pdf`, `thumbnail`, `redaction`
- exit gate:
  - redaction finns som egen variant
  - export innehåller manifest, artifactlista, checksums och chain-of-custödy refs
- konkreta verifikationer:
  - verifiera att redaction inte ändrar original
  - verifiera att export manifest listar alla medföljande versioner
  - verifiera att incomplett chain blockeras där policy kräver full kedja
- konkreta tester:
  - unit-test för redaction provenance
  - integrationstest för export package manifest
  - negativt test för export utan full chain där policy kräver det
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - exportera ett dokument och verifiera manifestets checksumma mot faktiska artefakter
  - visa original- och redactionvariant sida vid sida med lineage

### OCR runtime/callback/capability hardening
- mål:
  - göra OCR capability sanningsenlig och callbackmodellen korrekt
- arbete:
  - bygg `OcrCapabilityRecord`, `OcrProviderReceipt`, `OcrCallbackProfile` och `OcrProviderAuthPolicy`
  - nedgradera nuvarande provider till `stub` eller `fake_live` tills verklig liveadapter finns
  - separera providercallback från användarautentisering
  - fånga provider request/response receipts, processor id, baseline ref och callback signature/token model
- exit gate:
  - OCR capability kan inte presenteras som live utan verklig providerkedja
  - callbackroute har entydig säkerhetsmodell
- konkreta verifikationer:
  - verifiera att production mode utan riktig provider inte kan klassas som live
  - verifiera att providercallback inte kräver användarsession när det är providerstyrd route
  - verifiera att provider receipt fångas per OCR-run
- konkreta tester:
  - unit-test för capability downgrade
  - integrationstest för providercallback authmodell
  - negativt test för live claim utan adapter credentials
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - lista OCR capability-status med sann klassning
  - visa provider receipt och callback trace för en OCR-run

### OCR threshold/rerun/review-task hardening
- mål:
  - göra OCR confidence och document-engine review-taskkedjan fullständig
- arbete:
  - bygg `OcrThresholdPolicy`, `ReviewRequirementDecision`, `ReviewTaskLifecycle` och `OcrRerunDecision`
  - inför explicit `reject` och `requeue`
  - gör review-triggern spårbar per field confidence, classification confidence och policyversion
  - bind rerun till ny provider receipt och ny derivatkedja
- exit gate:
  - review tasks har full state machine
  - det går att visa exakt varför ett dokument auto-passade eller blockerades
- konkreta verifikationer:
  - verifiera att låg confidence ger blockerad review path
  - verifiera att requeue skapar ny väntande kedja utan att förlora tidigare decisions
  - verifiera att rerun aldrig muterar tidigare OCR-version
- konkreta tester:
  - unit-test för review decision thresholds
  - integrationstest för reject/requeue
  - replaytest för OCR rerun lineage
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - skriva ut threshold decision-logg för en OCR-run
  - visa hela review-taskhistoriken för ett dokument med rerun

### classification/extraction/search-boundary hardening
- mål:
  - göra classification och extraction styrande och söksäkra
- arbete:
  - bygg `ClassificationPolicyRecord`, `ExtractionLineageRecord`, `SearchExposureProfile` och `ReviewQueueRegistry`
  - lås canonical queue codes
  - säkra att AP/ÄR/Payroll/Benefits/Travel-routning bygger på samma registry
  - bygg field lineage och correction lineage som obligatoriska vid dispatch
- exit gate:
  - classification case kan visa queue code, review boundary och extraction lineage utan drift
  - masked search och export använder samma exposure policy
- konkreta verifikationer:
  - verifiera att `FINANCE_REVIEW` finns i canonical queue registry eller blockeras
  - verifiera att extraction lineage följer med till downstream intent
  - verifiera att maskad sök inte kan återidentifiera skyddade dokument
- konkreta tester:
  - integrationstest för canonical queue registry
  - unit-test för extraction lineage persistence
  - negativt test för otillåten review queue code
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - lista alla queue codes som classification får använda
  - visa varför ett dokument fick en viss review boundary

### review-center/decision-effect hardening
- mål:
  - göra reviewcenterbeslut operativt kompletta och konsekvensstyrda
- arbete:
  - bygg `ReviewDecisionEffect`, `ReviewOutcomeReceipt`, `ReviewRequeueReason` och `ReviewEscalationReceipt`
  - bind document-engine review task till review-center decision ledger
  - gör close bara tillåtet när beslut och effektkedja är fullständigt registrerade
  - bygg operatorreceipt för approve/reject/escalate/close
- exit gate:
  - review decision leder alltid till explicit effect record
  - reject, escalate och close kan granskas utan att läsa rå state manuellt
- konkreta verifikationer:
  - verifiera att reject skapar explicit effect och inte bara lämnar objekt i mellanläge
  - verifiera att close blockeras utan full decision effect
  - verifiera att SLA breach receipt länkar till item och queue
- konkreta tester:
  - integrationstest för decision-effect ledger
  - unit-test för close blocked without effect
  - integrationstest för repeated SLA breach lineage
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa full beslutskedja för ett review item
  - exportera operatorreceipt för approve och reject

### import-case/cross-domain link hardening
- mål:
  - göra import-case apply till verklig exekveringskedja
- arbete:
  - bygg `ImportApplyExecution`, `ImportApplyReceipt`, `DownstreamCommandDispatch` och `ImportApplyFailure`
  - dispatcha canonical downstream command i stället för att bara lagra mapping
  - fånga target object snapshot och downstream correlation id
  - gör apply replay-säkert på command receipt, inte bara payload hash
- exit gate:
  - ett applicerat importcase pekar på verklig downstream command receipt och verkligt target snapshot
  - metadata-only apply finns inte kvar som green path
- konkreta verifikationer:
  - verifiera att apply faktiskt skapar målobjekt i måldomän
  - verifiera att replay med samma execution receipt är idempotent
  - verifiera att failed downstream apply lämnar tydlig failure receipt
- konkreta tester:
  - integrationstest för create target object through apply
  - replaytest för same import apply execution
  - negativt test för mapping conflict
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - följa ett importcase till konkret måldomänsobjekt
  - visa apply receipt, correlation id och target snapshot i samma kedja

### evidence-bundle/snapshot/export/manifest hardening
- mål:
  - göra evidence exports revisions- och incidentdugliga
- arbete:
  - bygg `EvidenceExportPackage`, `EvidenceExportManifest`, `EvidenceArtifactDigest` och `EvidenceVerificationReceipt`
  - skilj intern freeze/checksumma från extern exportverifiering
  - bygg manifest med included artifacts, checksums, roles, source refs, signoff refs och export actor
  - möjliggör offline verify av exportpaket
- exit gate:
  - varje exporterat evidence bundle har verifierbart manifest
  - extern part kan verifiera checksums och lineage utan intern stateåtkomst
- konkreta verifikationer:
  - verifiera att exportmanifest täcker alla artifacts i bundle
  - verifiera att checksum mismatch upptäcks offline
  - verifiera att arkiverat bundle inte kan ändras och sedan exporteras utan ny kedja
- konkreta tester:
  - unit-test för manifest digest
  - integrationstest för evidence export package
  - negativt test för mismatchad artifact checksum
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - köra offline verifiering mot ett exporterat evidencepaket
  - lista bundleartifact -> checksum -> manifestrad

### retention/7-year/legal-hold/deletion hardening
- mål:
  - göra retention och hold verklig runtime
- arbete:
  - bygg `RetentionPolicyRecord`, `RetentionSchedule`, `LegalHoldRecord`, `DeletionCase`, `ArchiveDisposition` och `RetentionBlockReason`
  - gör retention class obligatorisk för bokföringsnära och reglerade dokument
  - bygg blockerad delete/export när legal hold eller 7-årsbevarande gäller
  - gör deletion pending och deleted till riktiga state transitions med approvals och receipts
- exit gate:
  - material som omfattas av 7-årsregeln kan inte raderas i förtid
  - legal hold stoppar delete och otillåten export
- konkreta verifikationer:
  - verifiera att bokföringsnära dokument får explicit retention class
  - verifiera att delete nekas under legal hold
  - verifiera att exportpolicy respekterar hold och retention
- konkreta tester:
  - integrationstest för legal hold blocks delete
  - unit-test för retention class required
  - integrationstest för deletion case approval chain
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - skriva ut retention schedule för ett dokument och dess källtyp
  - visa legal hold lineage och blockerorsak för ett exportförsök

### security-classification/access/redaction hardening
- mål:
  - göra read/search/export/support-boundaries konsekventa
- arbete:
  - bygg `DocumentAccessPolicy`, `DocumentExposureBoundary`, `DocumentExportProfile`, `SupportDocumentView` och `RedactionReleaseApproval`
  - använd samma policykälla för sök, läsning, export och support
  - bygg steg-up/approval för känslig reveal där det krävs
  - lås support-exporter till redactionvariant eller maskad profil
- exit gate:
  - export och support kan inte kringgå search masking eller redaction policy
  - känsligt material kan bara lämnas ut via kontrollerad boundary
- konkreta verifikationer:
  - verifiera att payrolldokument inte kan exporteras rått utan rätt boundary
  - verifiera att supportexport alltid visar vilken variant som användes
  - verifiera att reveal/release blir auditerad
- konkreta tester:
  - integrationstest för export policy denial
  - integrationstest för support-view med redactionvariant
  - negativt test för otillåten reveal
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - lista accessprofil per dokumentklass
  - visa att samma policy används i sök, read och export

### runbook/legacy-doc/false-claim cleanup hardening
- mål:
  - rensa alla dokument som överdriver mognaden och ersätta dem med rebuild-sanning
- arbete:
  - arkivera:
    - `docs/runbooks/ocr-malware-scanning-operations.md`
    - `docs/runbooks/evidence-bundle-export.md`
    - `docs/policies/data-retention-gdpr-and-legal-hold-policy.md`
    - `docs/runbooks/support-backoffice-and-audit-review.md`
    - `docs/runbooks/fas-2-company-inbox-verification.md`
    - `docs/runbooks/fas-2-ocr-review-verification.md`
    - `docs/runbooks/fas-2-document-archive-verification.md`
  - skriv om:
    - `docs/runbooks/inbound-email-inbox-setup.md`
    - `docs/runbooks/import-case-review.md`
    - `docs/runbooks/review-center-operations.md`
    - `docs/runbooks/document-person-payroll-incident-and-repair.md`
  - ta bort falska live claims om OCR, malware scanning, evidence export och legal hold i kvarvarande dokument
- exit gate:
  - inga gamla docs beskriver mer mognad än runtime faktiskt bär
  - rebuild-dokumenten är enda sanning
- konkreta verifikationer:
  - verifiera att varje arkiverat dokument är märkt som legacy/osanning
  - verifiera att kvarvarande runbooks pekar på rebuild-dokumenten
  - verifiera att inga live claims om OCR/export/hold återstår utanför rebuild-mappen
- konkreta tester:
  - repo-sökning efter förbjudna live claims
  - kontrolltest av runbookheaders och supersession-notiser
  - diffkontroll mot rebuild-roadmapen
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - skriva ut full prune-/archive-lista för Domän 7
  - visa att inget gammalt Domän 7-dokument längre kan tolkas som bindande
