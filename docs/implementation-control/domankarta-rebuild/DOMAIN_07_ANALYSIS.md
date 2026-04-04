# DOMAIN_07_ANALYSIS

## Scope

Domän 7 omfattar den verkliga dokumentkärnan för:

- company inbox
- e-postingest
- attachments, quarantine och malware-flöden
- source fingerprint, duplicate detection och chain-of-custödy
- originalbinär, versionskedja, derivat och export
- OCR, provider callbacks, confidence-styrning och reruns
- document classification, review tasks och review center
- import cases och cross-domain länkar
- evidence bundles, frozen snapshots och exportkedjor
- retention, 7-årsbevarande, legal hold, deletion pending och access boundaries

Verifieringen bygger på:

- prompt 7
- gamla `DOMAIN_07_ANALYSIS.md`
- gamla `DOMAIN_07_ROADMAP.md`
- gamla `DOMAIN_07_IMPLEMENTATION_LIBRARY.md`
- faktisk runtime i `packages/document-engine/*`, `packages/domain-document-classification/*`, `packages/domain-review-center/*`, `packages/domain-import-cases/*`, `packages/domain-evidence/*`, `packages/domain-integrations/*`, `apps/api/src/*`
- körda tester:
  - `tests/unit/document-engine-phase2.test.mjs`
  - `tests/unit/document-engine-phase2-inbox.test.mjs`
  - `tests/unit/document-engine-phase2-ocr.test.mjs`
  - `tests/unit/phase10-document-version-chain.test.mjs`
  - `tests/unit/phase14-document-classification.test.mjs`
  - `tests/unit/phase14-review-center.test.mjs`
  - `tests/unit/phase3-evidence-bundles.test.mjs`
  - `tests/integration/phase2-company-inbox-api.test.mjs`
  - `tests/integration/phase2-ocr-review-api.test.mjs`
  - `tests/integration/phase2-document-archive-api.test.mjs`
  - `tests/integration/phase10-document-version-chain-api.test.mjs`
  - `tests/integration/phase14-document-classification-api.test.mjs`
  - `tests/integration/phase14-review-center-api.test.mjs`
  - `tests/integration/phase15-import-cases-api.test.mjs`
- officiella källor:
  - Riksdagen, Bokföringslag (1999:1078), 7 kap. om arkivering
  - Bokföringsnämnden, arkiveringsfrågor och svar: [https://www.bfn.se/fragor-och-svar/arkivering/](__PROTECTED_0__)
  - NIST TN 1945 om SPF, DKIM och DMARC: [https://www.nist.gov/publications/email-authentication-mechanisms-dmarc-spf-and-dkim](__PROTECTED_1__)
  - Google Cloud Document AI providerdokumentation för filtyper och gränser

Samlad klassning:

- Domän 7 är `partial reality`
- repo:t innehåller verkliga dokument-, OCR-, review- och evidencekedjor
- repo:t är inte go-live-säkert eftersom inbox är API-ingest i stället för verklig transportkedja, malware scanning är callerstyrd, chain-of-custödy kan förfalskas, redaction saknas, retention/legal hold saknar verklig runtime och OCR-leverantören är fake-live

## Verified Reality

- dokumentrecord, originalversion och derivatkedja finns som verklig runtime i `packages/document-engine/src/index.mjs:103-175` och `178-347`
- derivat måste peka på befintlig version i samma dokumentkedja i `packages/document-engine/src/index.mjs:209-221`
- originalversion låser retention class och document source fingerprint efter första original i `packages/document-engine/src/index.mjs:250-260`
- dokumentversioner bär explicit `checksumAlgorithm: "sha256"` och `checksumSha256` i `packages/document-engine/src/index.mjs:262-298`
- inboxkanaler, e-postmeddelanden och attachments är first-class runtimeobjekt i `packages/document-engine/src/index.mjs:477-710`
- inbox-API deduplicerar `messageId` per `companyId + channelId` och sätter `accepted | quarantined | rejected` i `packages/document-engine/src/index.mjs:591-612` och `686-709`
- OCR-runs skapar ny OCR-version och ny classification-version utan overwrite i `packages/document-engine/src/index.mjs:1093-1185`
- review tasks finns och kräver review center-claim när review item är länkat i `packages/document-engine/src/index.mjs:911-1087`
- review center är en verklig operativ motor med queue/item/decision/escalation/SLA-scan i `packages/domain-review-center/src/engine.mjs:22-80`, `575-768`
- document classification skapar verkliga classification cases, extraction projections, masked search-profiler och review-center-items i `packages/domain-document-classification/src/engine.mjs:70-181`, `974-999`
- evidence bundles är verkliga objekt med `open -> frozen -> archived`, artifacts och intern checksumma i `packages/domain-evidence/src/index.mjs:42-200`
- import cases har verklig review/correction/apply-kedja, även om apply är för svag, i `packages/domain-import-cases/src/engine.mjs:642-719`
- följande tester kördes gröna i denna körning:
  - `tests/integration/phase2-company-inbox-api.test.mjs`
  - `tests/integration/phase2-ocr-review-api.test.mjs`
  - `tests/integration/phase2-document-archive-api.test.mjs`
  - `tests/unit/phase3-evidence-bundles.test.mjs`

## Partial Reality

- company inbox är en applikationsroute för registrering och POST-ingest, inte en verklig MX/IMAP/SES/Graph/transportkedja
- malware scanning och quarantine ser riktiga ut men scanresultat kommer från indata och defaultar till `clean`
- duplicate detection fungerar bara delvis: e-post dedupliceras per kanal och message id, dokument dedupliceras bara på content hash eller source reference
- source fingerprint finns, men attachment-routade dokument tappar sender-side provenance
- OCR-reruns och callbacks finns, men leverantören är fake-live och produktionsläge kastar bara `ocr_provider_live_not_configured`
- review center är verkligt, men document-engine review tasks bär en ofullständig state machine där `rejected` och `requeued` inte har full runtimeeffekt
- evidence bundles fryses korrekt internt, men exportmanifest, komplett package-struktur och offline verifieringskedja saknas
- retention, legal hold, deletion pending och deleted finns som statusvärden och policytext, inte som verklig enforcementkedja
- import-case apply är replay-säkert som metadata, men inte som verklig downstream-apply

## Legacy

| path | exakt problem | status |
|---|---|---|
| `docs/runbooks/ocr-malware-scanning-operations.md` | beskriver leverantörsdriven malware/OCR-pipeline, köer och release-flöden som inte finns i verklig runtime | archive |
| `docs/runbooks/evidence-bundle-export.md` | beskriver export som om bundle-export redan vore komplett och revisionsklar | archive |
| `docs/policies/data-retention-gdpr-and-legal-hold-policy.md` | policytexten beskriver retention/legal hold som styrande trots att runtimekedjan saknas | archive |
| `docs/runbooks/support-backoffice-and-audit-review.md` | historiskt stödspår som riskerar att överdriva export- och supportmognad | archive |
| `docs/runbooks/fas-2-company-inbox-verification.md` | äldre verifieringsdokument som bara speglar faslogik, inte nuvarande rebuild-sanning | archive |
| `docs/runbooks/fas-2-ocr-review-verification.md` | äldre fasdokument som överdriver OCR-mognad | archive |
| `docs/runbooks/fas-2-document-archive-verification.md` | äldre fasdokument som överdriver archive/export-mognad | archive |

## Dead Code

| severity | kategori | exakt problem | exakt filepath | radreferens | rekommenderad riktning | status |
|---|---|---|---|---|---|---|
| low | state drift | `REVIEW_TASK_STATES` innehåller `rejected` och `requeued`, men document-engine exponerar bara `claim`, `correct` och `approve`; ingen publicerad runtimefunktion producerar `rejected` och ingen explicit requeue-funktion finns | `packages/document-engine/src/index.mjs` | `36`, `911-1087` | ta bort döda states eller bygg riktig reject/requeue-kedja | rewrite |

## Misleading / False Completeness

### D7-F001

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | false completeness / inbox transport |
| exakt problem | company inbox är i praktiken en intern API-ingest där kanaler registreras och meddelanden postas direkt till `/v1/inbox/messages`; ingen verklig e-posttransport, leverantörsadapter eller message acquisition-kedja finns i runtime |
| varför det är farligt | systemet kan se ut att ha verklig mailbox-infrastruktur fast det bara accepterar redan mottagna payloads från en privilegierad klient |
| exakt filepath | `packages/document-engine/src/index.mjs`; `apps/api/src/server.mjs` |
| radreferens om möjligt | `packages/document-engine/src/index.mjs:477-710`; `apps/api/src/server.mjs:2738-2794` |
| rekommenderad riktning | bygg verklig inbound transportmodell med provider/source receipts, raw mail provenance och transportseparerad ingestkedja; klassa nuvarande path som intern intake-API tills dess |
| status | rewrite |

### D7-F002

| fält | innehåll |
|---|---|
| severity | high |
| kategori | false completeness / docs |
| exakt problem | flera gamla runbooks beskriver OCR-, malware-, retention- och evidence-export som om de redan vore verkligt driftbara |
| varför det är farligt | teamet kan fatta go-live-beslut på falska dokument i stället för på runtime-evidens |
| exakt filepath | `docs/runbooks/ocr-malware-scanning-operations.md`; `docs/runbooks/evidence-bundle-export.md`; `docs/policies/data-retention-gdpr-and-legal-hold-policy.md` |
| radreferens om möjligt | `ocr-malware-scanning-operations.md:8-20,24-57`; `evidence-bundle-export.md:21-27,95-100`; `data-retention-gdpr-and-legal-hold-policy.md:15-27,35-40` |
| rekommenderad riktning | arkivera gamla dokument och skriv nya rebuild-runbooks som uttryckligen speglar faktisk runtime och blockerare |
| status | archive |

## Inbox / Email Ingest Findings

### D7-F003

| fält | innehåll |
|---|---|
| severity | high |
| kategori | sender trust |
| exakt problem | inboxkedjan lagrar `senderAddress` och `recipientAddress`, men ingen SPF-, DKIM- eller DMARC-signal fångas i meddelande- eller dokumenttruth |
| varför det är farligt | teknisk avsändarsignal kan inte skiljas från faktisk affärsverifiering och det finns inget bevisbart transportlager för e-postens autenticitet |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `561-648`, `1371-1391`, `2333-2345` |
| rekommenderad riktning | bygg separat `EmailTransportReceipt` med SPF/DKIM/DMARC-resultat och håll det skilt från affärsverifiering enligt NIST TN 1945 |
| status | harden |

### D7-F004

| fält | innehåll |
|---|---|
| severity | high |
| kategori | duplicate detection |
| exakt problem | e-postdedupe använder bara `companyId + inboxChannelId + messageId` |
| varför det är farligt | samma faktiska mail kan komma via annan kanal, annan relay eller återspelad ingest och ändå accepteras som nytt |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `591-612`, `1675-1681` |
| rekommenderad riktning | bygg multikanals dedupe med `message-id`, normalized sender, recipient, raw-mail hash, attachment fingerprints och provider receipt ids |
| status | rewrite |

## Attachment / Malware / Quarantine Findings

### D7-F005

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | malware / quarantine |
| exakt problem | `resolveAttachmentScanResult(...)` defaultar till `clean` när scanresultat saknas och quarantine avgörs sedan bara av MIME, storlek och det callerlevererade scanresultatet |
| varför det är farligt | malware-scanning kan se produktionsmässig ut trots att inget verkligt scansteg sker |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `1319-1334`, `1847-1868` |
| rekommenderad riktning | gör scanreceipt obligatorisk, bygg separat `AttachmentScanReceipt`, blockera ingest utan verifierat scannerutfall och spåra scanner provider/version |
| status | replace |

### D7-F006

| fält | innehåll |
|---|---|
| severity | high |
| kategori | file/container safety |
| exakt problem | inga verifierade runtimegrenar hanterar password-protected archives, nested attachments, containerfiler eller zip-bombs |
| varför det är farligt | farliga eller ogenomträngliga bilagor kan passera som vanliga attachments och sedan landa i document truth eller OCR-kedjan |
| exakt filepath | `packages/document-engine/src/index.mjs`; `docs/runbooks/ocr-malware-scanning-operations.md` |
| radreferens om möjligt | `1314-1415`, `1858-1868`; runbooken påstår hantering i `32-37` utan stöd i kod |
| rekommenderad riktning | bygg container- och archiveinspection som first-class pre-ingest-steg med blocker codes för encrypted archive, nested archive depth och archive bomb risk |
| status | rewrite |

## Source Fingerprint / Duplicate / Chain-Of-Custödy Findings

### D7-F007

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | chain-of-custödy |
| exakt problem | `ensureContentIdentity(...)` accepterar antingen content eller redan given `fileHash`, och `resolveContent(...)` använder callerlevererad hash och filstorlek utan att kräva faktiska bytes |
| varför det är farligt | en klient kan fabricera content identity, hash och storlek utan att systemet någonsin har sett originalbinären |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `1321-1327`, `1393-1403`, `1871-1900` |
| rekommenderad riktning | kräva verklig byte-stream för originalbinär, beräkna hash i plattformen, lagra content-addressable identity och förbjuda callerstyrd hash på produktionsingest |
| status | replace |

### D7-F008

| fält | innehåll |
|---|---|
| severity | high |
| kategori | provenance loss |
| exakt problem | source fingerprint använder `senderAddress` och `inboundAddress`, men attachment-routade dokument skapas utan dessa metadatafält och tappar därmed sender-side provenance |
| varför det är farligt | samma binär kan få olika provenance beroende på ingestväg och efterföljande export kan sakna bevisbar e-postkälla |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `1371-1387`, `2333-2345` |
| rekommenderad riktning | inkludera sender- och transportmetadata i canonical attachment-to-document snapshot och lås dem i originalversionens provenance record |
| status | harden |

### D7-F009

| fält | innehåll |
|---|---|
| severity | high |
| kategori | duplicate detection |
| exakt problem | dokumentdedupe bygger bara på `contentHash` eller `sourceReference` |
| varför det är farligt | samma leverantörsfaktura kan dupliceras genom små binärskillnader, annan source reference eller cross-channel import utan att flaggas |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `300-305`, `1650-1672` |
| rekommenderad riktning | bygg canonical duplicate identity med source fingerprint, supplier identity, document number/date/amount, raw mail refs och cross-channel decision trail |
| status | rewrite |

## Original Binary / Hash / Provenance Findings

### D7-F010

| fält | innehåll |
|---|---|
| severity | high |
| kategori | hash governance |
| exakt problem | dokumentversioner bär `checksumAlgorithm: "sha256"` men ingen hash-version, ingen signerad storage receipt och ingen content-addressable provenance över storage migration |
| varför det är farligt | hashrotation, storageflytt eller bevisning mot extern part blir svagare än promptkravet om framtidssäker chain-of-custödy |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `262-298` |
| rekommenderad riktning | bygg `ContentIdentityRecord` med `hashAlgorithm`, `hashVersion`, `storageReceiptRef`, `capturedBy`, `capturedAt` och optional notarization/signature path |
| status | harden |

## Document Record / Version Chain Findings

### D7-F011

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | version chain |
| exakt problem | dokumentkedjan kräver parent för derivat men bär ingen explicit blockering mot att en export- eller viewyta läser en inkomplett kedja som om den vore fullständig |
| varför det är farligt | downstream-yta kan presentera dokumentkedja som revisionssäker fast redaction/export/legal hold-fält saknas |
| exakt filepath | `packages/document-engine/src/index.mjs`; `apps/api/src/server.mjs` |
| radreferens om möjligt | `209-221`, `414-465`, `2719-2733` |
| rekommenderad riktning | bygg chain completeness status och blockera export/read där required variants, receipts eller holds saknas |
| status | harden |

## Variant / Redaction / Link / Export Findings

### D7-F012

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | redaction |
| exakt problem | prompten kräver redaction som separat variant, men `DOCUMENT_VARIANT_TYPES` saknar `redaction` och ingen redactionruntime finns |
| varför det är farligt | support-, export- och evidenskedjor saknar säker väg för maskad utlämning utan att röra original |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `23-29` |
| rekommenderad riktning | bygg `redaction` som first-class variant med provenance, own hash, mask policy, source version ref och export boundary |
| status | replace |

### D7-F013

| fält | innehåll |
|---|---|
| severity | high |
| kategori | export completeness |
| exakt problem | `exportDocumentChain(...)` returnerar dokument, versioner, länkar och audit trail men inget exportmanifest, ingen artifactförteckning och ingen offline verifieringsstruktur |
| varför det är farligt | exporten kan se komplett ut i API men är inte tillräcklig för revision, incident eller myndighetsgranskning |
| exakt filepath | `packages/document-engine/src/index.mjs`; `apps/api/src/server.mjs` |
| radreferens om möjligt | `414-465`; `2719-2733` |
| rekommenderad riktning | bygg `DocumentExportPackage` med manifest, included artifact list, checksums, varianttyp, provenance chain, exporttidpunkt och classification/redaction policy |
| status | rewrite |

## OCR Runtime / Callback / Confidence Findings

### D7-F014

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | OCR provider realism |
| exakt problem | Google Document AI-provider markerar `production_supported: true` och `supportsLegalEffect: providerMode === "production"`, men produktionsläge kastar alltid `ocr_provider_live_not_configured` och sandbox bygger deterministiskt resultat från `sourceText` |
| varför det är farligt | OCR kan se live-redo ut i capability manifest trots att verklig providerkedja saknas |
| exakt filepath | `packages/domain-integrations/src/providers/google-document-ai.mjs` |
| radreferens om möjligt | `58-91`, `133-161`, `173-223` |
| rekommenderad riktning | nedgradera capability till `stub` eller `fake-live` tills verklig provider auth, processor wiring, callback verifiering och receipt capture finns |
| status | replace |

### D7-F015

| fält | innehåll |
|---|---|
| severity | high |
| kategori | callback auth drift |
| exakt problem | route contract kräver `strong_mfa` och `company.manage` för OCR provider callback, edgeprofil markerar callbackrouten som no-session/no-idempotency, och serverhandlern försöker samtidigt authz:a användarsession och callback token |
| varför det är farligt | callbackmodellen är semantiskt fel; varken riktig provider-callback eller ren användarroute |
| exakt filepath | `apps/api/src/route-contracts.mjs`; `apps/api/src/server.mjs` |
| radreferens om möjligt | `route-contracts.mjs:322`; `server.mjs:2865-2885`, `20130-20172` |
| rekommenderad riktning | separera providercallback till signerad providerroute utan användarsession eller gör den till ren operatorroute; blanda inte båda modellerna |
| status | rewrite |

### D7-F016

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | confidence governance |
| exakt problem | OCR-thresholds finns per kanal, men providerrealismen är så svag att green path främst bevisar intern deterministisk policy, inte verklig OCR-kvalitet |
| varför det är farligt | confidence gates kan ge falsk trygghet om auto/manual-gränser i verklig produktion |
| exakt filepath | `packages/document-engine/src/index.mjs`; `packages/domain-integrations/src/providers/google-document-ai.mjs` |
| radreferens om möjligt | `728-760`, `1093-1185`; `151-161`, `240-260` |
| rekommenderad riktning | håll thresholds men märk providerkedjan som icke-live tills verkliga extraction receipts och kvalitetsmätning finns |
| status | harden |

## Document Classification Findings

### D7-F017

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | review queue drift |
| exakt problem | classification engine routar AP/ÄR till `FINANCE_REVIEW`, medan review-center engine bara seedar `DOCUMENT_REVIEW`, `VAT_REVIEW`, `PAYROLL_REVIEW`, `TAX_ACCOUNT_REVIEW` och `HUS_REVIEW` |
| varför det är farligt | queuekodsd drift kan göra att klassificering ser korrekt routad ut i en del miljöer men inte i bootstrap/demo eller i operatörsvyer som förväntar seedade köer |
| exakt filepath | `packages/domain-document-classification/src/engine.mjs`; `packages/domain-review-center/src/engine.mjs`; `packages/domain-tenant-control/src/index.mjs` |
| radreferens om möjligt | `packages/domain-document-classification/src/engine.mjs:1735-1765`; `packages/domain-review-center/src/engine.mjs:1010-1018`; `packages/domain-tenant-control/src/index.mjs:697` |
| rekommenderad riktning | lås canonical queue code registry och förbjud blandning mellan `FINANCE_REVIEW` och `finance_review`/seed-only queue set |
| status | harden |

## Review Task / Review Center Findings

### D7-F018

| fält | innehåll |
|---|---|
| severity | high |
| kategori | review task state machine |
| exakt problem | document-engine review tasks utlovar `rejected` och `requeued`, men runtime exponerar inte explicit reject/requeue-funktion och approval är enda finaliserade document-engine-path |
| varför det är farligt | task-kedjan ser fullständig ut i enum och i promptspår fast operatören saknar full kontroll för felaktig OCR/classification |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `36`, `911-1087` |
| rekommenderad riktning | bygg full `claim -> correct -> approve | reject | requeue`-modell eller ta bort påståendet om full state machine |
| status | rewrite |

## Review Decision Effect Findings

### D7-F019

| fält | innehåll |
|---|---|
| severity | medium |
| kategori | decision effects |
| exakt problem | review center har verklig `approve|reject|escalate`, men document-engine approve-pathen sätter bara `document.documentType` och `status = reviewed`; den bygger inte full downstream handoff, redaction- eller exportblockering |
| varför det är farligt | reviewbeslut kan se affärsbärande ut trots att flera senare kontrollsteg fortfarande saknas |
| exakt filepath | `packages/document-engine/src/index.mjs`; `packages/domain-review-center/src/engine.mjs` |
| radreferens om möjligt | `1038-1087`; `575-688` |
| rekommenderad riktning | bygg explicit decision-effect ledger för reviewutfall: downstream intent, blocked export state, redaction requirement och correction lineage |
| status | harden |

## Import Case / Cross-Domain Link Findings

### D7-F020

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | import apply |
| exakt problem | `applyImportCase(...)` markerar bara mappingfält som `appliedTargetDomainCode`, `appliedTargetObjectId` och payload hash; den anropar inte verklig downstream commandkedja |
| varför det är farligt | import case kan se applicerat och grönt ut utan att något faktiskt objekt skapats i AP eller annan måldomän |
| exakt filepath | `packages/domain-import-cases/src/engine.mjs`; `tests/integration/phase15-import-cases-api.test.mjs` |
| radreferens om möjligt | `642-719`; testet verifierar bara mapping i `296-327` |
| rekommenderad riktning | bygg bindande `ImportApplyExecution` som faktiskt dispatchar canonical downstream command och fångar receipt/target snapshot |
| status | replace |

## Evidence Bundle / Snapshot / Export / Manifest Findings

### D7-F021

| fält | innehåll |
|---|---|
| severity | high |
| kategori | evidence export |
| exakt problem | evidence bundles har intern checksumma och freeze/archive, men export är bara materialiserad state; inget externt manifest eller verifierbart exportpaket finns |
| varför det är farligt | bundle-export kan se auditklar ut trots att extern revisor eller incidentledare inte kan verifiera innehåll och lineage offline |
| exakt filepath | `packages/domain-evidence/src/index.mjs` |
| radreferens om möjligt | `145-200`, `238-343`, `381-397` |
| rekommenderad riktning | bygg `EvidenceExportPackage` med manifest, artifact list, checksums, included refs, export actor, export timestamp och detached verification data |
| status | rewrite |

## Retention / 7-Year Preservation / Legal Hold / Deletion Findings

### D7-F022

| fält | innehåll |
|---|---|
| severity | critical |
| kategori | retention / legal hold |
| exakt problem | `under_legal_hold`, `deletion_pending` och `deleted` finns bara som statusvärden; ingen runtimefunktion sätter, blockerar eller verkställer dessa tillstånd |
| varför det är farligt | bokföringsnära och reglerat material kan exporteras, döljas eller raderas utan verklig hold-/retention-enforcement |
| exakt filepath | `packages/document-engine/src/index.mjs`; `docs/policies/data-retention-gdpr-and-legal-hold-policy.md` |
| radreferens om möjligt | `9-20`; policykrav i `35-46` saknar runtime-stöd |
| rekommenderad riktning | bygg `RetentionPolicy`, `LegalHoldRecord`, `DeletionCase`, `ArchiveDisposition` och blockera delete/export paths när hold eller 7-årsbevarande gäller |
| status | replace |

### D7-F023

| fält | innehåll |
|---|---|
| severity | high |
| kategori | statutory preservation |
| exakt problem | retention class resolver defaultar till `unspecified` om varken record eller metadata anger klass |
| varför det är farligt | bokföringsnära dokument kan skapas utan korrekt bevarandeklass trots 7-årskrav enligt Bokföringslagen och BFN |
| exakt filepath | `packages/document-engine/src/index.mjs` |
| radreferens om möjligt | `2322-2330` |
| rekommenderad riktning | gör retentionklass obligatorisk via canonical policy engine och förbjud `unspecified` för alla ekonomiskt eller reglerat relevanta dokumentfamiljer |
| status | rewrite |

## Security Classification / Access / Redaction Findings

### D7-F024

| fält | innehåll |
|---|---|
| severity | high |
| kategori | access boundary |
| exakt problem | masked search finns för `PAYROLL`, `BENEFITS` och `TRAVEL`, men dokumentexport och document chain export saknar motsvarande redaction-/support-boundary-kedja |
| varför det är farligt | sökindex kan vara maskat medan exportvägen fortfarande läcker original eller överdetaljerad kedja |
| exakt filepath | `packages/domain-document-classification/src/engine.mjs`; `packages/document-engine/src/index.mjs`; `apps/api/src/server.mjs` |
| radreferens om möjligt | `packages/domain-document-classification/src/engine.mjs:38-40, 540-660`; `packages/document-engine/src/index.mjs:414-465`; `apps/api/src/server.mjs:2719-2733` |
| rekommenderad riktning | bygg separat `DocumentAccessPolicy`, `DocumentExportProfile` och redactionvariant som styr read/export/support/audit på samma källa |
| status | rewrite |

## OCR / Review / Evidence Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
|---|---|---|---|---|
| company inbox | verkligt mailintag | intern API-ingest med kanalregister och POST av råmailpayload | `packages/document-engine/src/index.mjs:477-710`; `tests/integration/phase2-company-inbox-api.test.mjs` | Ja |
| attachment quarantine | verklig malware/quarantinekedja | MIME-/storlekskontroll + callerstyrt scanresultat | `packages/document-engine/src/index.mjs:1314-1415`, `1847-1868` | Ja |
| original binary immutability | immutabel originalbinär | versionkedja finns, men hash och size kan callerföras in utan bytes | `packages/document-engine/src/index.mjs:178-298`, `1871-1900` | Ja |
| redaction | separat variantkedja | saknas helt i runtime | `packages/document-engine/src/index.mjs:23-29` | Ja |
| OCR provider | produktionsstöd | fake-live; production kastar alltid `ocr_provider_live_not_configured` | `packages/domain-integrations/src/providers/google-document-ai.mjs:58-91`, `133-161` | Ja |
| OCR callback | säker provider callback | auth-hybrid mellan provider token och användarsession | `apps/api/src/route-contracts.mjs:322`; `apps/api/src/server.mjs:2865-2885`, `20130-20172` | Ja |
| review center | first-class review runtime | verklig queue/item/decision/SLA motor | `packages/domain-review-center/src/engine.mjs:22-80`, `575-768`; `tests/integration/phase14-review-center-api.test.mjs` | Nej |
| import apply | verklig downstream apply | metadata-only mapping | `packages/domain-import-cases/src/engine.mjs:642-719`; `tests/integration/phase15-import-cases-api.test.mjs:296-327` | Ja |
| evidence bundles | frysbara och exportbara | intern freeze/checksumma finns, extern exportmanifest saknas | `packages/domain-evidence/src/index.mjs:145-200`, `381-397`; `tests/unit/phase3-evidence-bundles.test.mjs` | Ja |
| legal hold / deletion | retentionstyrd runtime | enum- och policy-only | `packages/document-engine/src/index.mjs:9-20`; `docs/policies/data-retention-gdpr-and-legal-hold-policy.md:15-46` | Ja |

## Concrete Documents Verification Matrix

| capability | claimed rule or control | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
|---|---|---|---|---|---|---|
| bokföringsnära dokumentbevarande | material som utgör räkenskapsinformation måste bevaras minst 7 år | runtime saknar verklig hold/delete enforcement; policytext finns | `packages/document-engine/src/index.mjs:9-20`; policy `15-46` | Riksdagen BFL 7 kap.; BFN arkivering `53-63`, `88-108` | partial reality | Ja |
| förstöring efter scanning | pappersoriginal får bara förstöras om överföringen inte medför risk för förändring/förlust | runtime accepterar callerlevererad hash/size utan bevis på faktisk överföring | `packages/document-engine/src/index.mjs:1871-1900` | BFN arkivering `60-67`, `88-96` | misleading | Ja |
| teknisk avsändarvalidering | SPF/DKIM/DMARC får inte likställas med affärsverifiering | ingen sådan signal fångas alls i runtime | `packages/document-engine/src/index.mjs:561-648` | NIST TN 1945 | partial reality | Ja |
| OCR file safety | providergränser och filtyper måste följas | Google provider har file/page checks men ingen livekedja | `packages/domain-integrations/src/providers/google-document-ai.mjs:94-131` | Google Cloud Document AI docs | partial reality | Ja |
| chain-of-custödy | original, derivat och export måste vara bevisbara | versionskedja finns men exportmanifest och storage receipt saknas | `packages/document-engine/src/index.mjs:178-298`, `414-465` | BFN arkivering; god audit practice | partial reality | Ja |
| evidence export | frozen bundle ska kunna verifieras utanför processminnet | bundle export är bara materialiserad state | `packages/domain-evidence/src/index.mjs:145-200`, `381-397` | ingen extern standard låst i runtime | partial reality | Ja |
| review operativitet | claim/correct/approve/reject/requeue ska vara verkligt | review center är verkligt; document-engine review tasks är ofullständiga | `packages/domain-review-center/src/engine.mjs:575-688`; `packages/document-engine/src/index.mjs:911-1087` | intern kontrollkedja, ingen extern regelkälla | partial reality | Ja |
| import apply | godkänt importcase ska skapa målobjekt via kontrollerad commandkedja | apply lagrar bara mappingdata | `packages/domain-import-cases/src/engine.mjs:642-719`; `tests/integration/phase15-import-cases-api.test.mjs:296-327` | ingen extern regelkälla behövs | misleading | Ja |

## Critical Findings

- D7-F001 inbox är inte verklig transportkedja
- D7-F005 malware/quarantine är callerstyrd
- D7-F007 chain-of-custödy kan förfalskas via callerstyrd hash/size
- D7-F012 redactionvariant saknas helt
- D7-F014 OCR-provider är fake-live
- D7-F020 import-case apply skapar inte verkligt downstreamobjekt
- D7-F022 legal hold/deletion är inte verklig runtime

## High Findings

- D7-F003 sender trust saknar transportsignaler
- D7-F004 e-postdedupe är för svag
- D7-F006 saknar archive/zip-bomb-hantering
- D7-F008 provenance tappas i attachment-routning
- D7-F009 dokumentdedupe är för svag
- D7-F010 hash governance saknar versionerad content identity
- D7-F013 document export saknar manifest
- D7-F015 OCR callback auth drift
- D7-F018 document-engine review tasks är ofullständiga
- D7-F021 evidence export saknar verifierbart paket
- D7-F023 retention class kan bli `unspecified`
- D7-F024 export/access boundary saknar redactionstyrning

## Medium Findings

- D7-F011 chain completeness saknar explicit status
- D7-F016 confidence gates bevisar inte verklig OCR-kvalitet
- D7-F017 queue code drift runt `FINANCE_REVIEW`
- D7-F019 review decision effects är för tunna

## Low Findings

- dead state-drift i `REVIEW_TASK_STATES`

## Cross-Domain Blockers

- AP och ÄR kan inte lita på import-case apply som verklig object-creation path
- payroll-, benefits- och travel-maskning i sök räcker inte när exportvägar saknar redactionvariant
- support/backoffice kan inte få säker dokumentexport innan redaction, hold och exportmanifest finns
- annual reporting, HUS och regulated submissions kan inte luta på nuvarande evidence export som extern revisionskedja

## Go-Live Blockers

- ingen verklig inbound transportkedja för company inbox
- ingen verklig scanner receipt-/malware-kedja
- chain-of-custödy kan fabriceras via callerlevererad hash/size
- redactionvariant saknas
- OCR production capability är fake-live
- OCR callbackmodellen är authmässigt fel
- import-case apply är metadata-only
- legal hold, deletion pending och 7-årsretention saknar enforcement
- document/evidence export saknar manifest och verifierbart paket

## Repo Reality Vs Intended Documents Model

- Repo:t har en verklig dokumentmotor, men den är fortfarande mer upload/archive/OCR-runtime än full records-management-kärna.
- Repo:t har verkliga review- och evidenceobjekt, men export, hold, redaction och import-apply bär inte den tyngd som prompten kräver.
- Repo:t har verkliga versioner och derivat, men inte full chain-of-custödy eftersom originalidentitet kan fabriceras och exportpaket saknar verifierbar manifestkedja.
- Repo:t har verklig document classification och review-center-integration, men inte full queue-governance, reject/requeue och downstream effect ledger.
- Samlad dom: dokumentdomänen är användbar som intern runtimebas men inte som go-live-säker svensk dokument-, audit- och bevarandekärna.
