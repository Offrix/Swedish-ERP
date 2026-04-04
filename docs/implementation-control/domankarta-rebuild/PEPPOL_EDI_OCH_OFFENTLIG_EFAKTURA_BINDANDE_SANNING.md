# PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för:
- utgående Peppol BIS Billing 3
- inkommande strukturerad e-faktura via Peppol
- offentlig e-faktura enligt svensk regelmiljo
- EDI-lika transportkrav, endpoint identity och message evidence för Peppol-flödet

## Syfte

Detta dokument ska göra Peppol- och offentlig e-fakturahantering till en hard, verifierbar och auditbar produktionskedja.

Detta dokument ska stoppa:
- PDF-mail som felaktigt behandlas som offentlig e-faktura
- UBL-generering som inte matchar fakturans legal truth
- inkommande e-fakturor som bypassar AP-sanning eller review
- falsk leveransstatus utan transport- eller mottagarkvitto

## Omfattning

Detta dokument omfattar:
- Peppol BIS Billing 3 invoice och credit note
- sender- och receiver-endpoints
- participant id och endpoint-id
- invoice transport till offentlig sektor och ändra mottagare via Peppol
- incoming structured invoice routing till AP
- duplicates, receipts och delivery evidence

Detta dokument omfattar inte:
- OCR-scanning av PDF eller bild
- allman API-webhook-logik utanför Peppol/EDI-kedjan
- svensk fakturajuridik i sig; den ägs av fakturabibeln

## Absoluta principer

- Offentlig e-faktura får inte reduceras till PDF eller mailad bilaga.
- Canonical seller-side truth ägs av `FAKTURAFLODET_BINDANDE_SANNING.md`; Peppol-lagret serialiserar den bara.
- Canonical buyer-side truth ägs av `LEVFAKTURAFLODET_BINDANDE_SANNING.md`; Peppol-lagret levererar bara strukturerat dokument till den sanningen.
- Inkommande Peppol-dokument får inte auto-postas direkt till ledger utan AP-truth, matchning och blockerregler.
- Varje skickat eller mottaget Peppol-dokument måste ha delivery evidence, duplicate controls och immutable original payload.
- Offentlig sektor-kravet ska behandlas som blockerande leveransregel när mottagaren omfattas av e-fakturalagen eller motsvarande krav i upphandling.

## Bindande dokumenthierarki för Peppol, EDI och offentlig e-faktura

- `FAKTURAFLODET_BINDANDE_SANNING.md` äger legal seller-side invoice truth.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger buyer-side AP truth efter mottaget dokument.
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger scanned/bildbaserat dokumentintag; structured Peppol-invoices får inte förväxlas med scanning.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` agerar overordnad sanning för generiska adapter- och partnerkontrakt runt transportlagret.
- Domän 4, 6, 7 och 27 får inte definiera avvikande Peppol- eller offentlig-e-faktura-truth utan att detta dokument skrivs om samtidigt.

## Kanoniska objekt

- `PeppolParticipant`
  - bar participant identifier, scheme, endpoint capability och legal owner
- `PeppolEndpointBinding`
  - bar relationen mellan bolag och konkret avsandare eller mottagare i Peppol
- `PeppolOutboundDocument`
  - bar canonical outbound invoice eller credit note payload, document type, process profile och delivery target
- `PeppolInboundDocument`
  - bar original inbound payload, sender identity, receive timestamp och downstream routing
- `PeppolTransportReceipt`
  - bar submission receipt, transportstatus, deliverystatus och external ids
- `PeppolValidationIssue`
  - bar schemafel, schematronfel, identifieringsfel, duplicate issues och profile mismatches

## Kanoniska state machines

- `PeppolOutboundDocument`
  - `draft -> validated -> queued -> sent -> delivered | failed | rejected`
- `PeppolInboundDocument`
  - `received -> validated -> routed -> consumed | review_required | blocked`
- `PeppolTransportReceipt`
  - `pending -> accepted | rejected | delivered | failed`
- `PeppolValidationIssue`
  - `open -> triaged -> resolved | blocking`

## Kanoniska commands

- `BindPeppolEndpoint`
- `ValidatePeppolOutboundDocument`
- `QueuePeppolOutboundDocument`
- `SendPeppolOutboundDocument`
- `ReceivePeppolInboundDocument`
- `ValidatePeppolInboundDocument`
- `RoutePeppolInboundDocument`
- `RegisterPeppolTransportReceipt`
- `RejectPeppolDocument`

## Kanoniska events

- `PeppolEndpointBound`
- `PeppolOutboundDocumentValidated`
- `PeppolOutboundDocumentQueued`
- `PeppolOutboundDocumentSent`
- `PeppolOutboundDocumentDelivered`
- `PeppolInboundDocumentReceived`
- `PeppolInboundDocumentValidated`
- `PeppolInboundDocumentRouted`
- `PeppolTransportReceiptRegistered`
- `PeppolDocumentRejected`

## Kanoniska route-familjer

- `/api/einvoice/peppol/outbound/*`
- `/api/einvoice/peppol/inbound/*`
- `/api/einvoice/peppol/endpoints/*`
- `/api/einvoice/peppol/receipts/*`

## Kanoniska permissions och review boundaries

- `invoice.issue` får skapa outbound seller documents
- `ap.manage` får reviewa och konsumera inbound supplier documents
- `integration.manage` får binda endpoints och felsoka delivery
- `support` får inte manipulera payload eller markera delivered utan extern receipt
- review krävs för:
  - missing buyer reference eller offentliga referenser
  - endpoint mismatch
  - duplicate inbound documents
  - unsupported document profile
  - payload som inte reconcile mot canonical invoice/AP truth

## Nummer-, serie-, referens- och identitetsregler

- Canonical utgående dokumentidentitet kommer från seller-side fakturatruth, inte Peppol-lagret.
- `CustomizationID` och `ProfileID` måste sattas enligt vald Peppol BIS Billing 3-profil.
- Seller och buyer `EndpointID` måste ha korrekt scheme identifier.
- `BuyerReference` ska finnas när mottagarprofil eller offentlig sektor-krav fordrar det.
- Credit notes ska ha egen dokumentidentitet och får inte återanvända originell invoice id som om det vore samma dokument.
- Duplicate inbound message detection ska bygga på payload digest, sender identity, document id och transport refs.

## Valuta-, avrundnings- och omräkningsregler

- Peppol payload får inte beräkna om belopp; det serialiserar canonical invoice/AP truth.
- Valutakoder ska följa ISO 4217 enligt Peppol-regelverket.
- Momssummor och line totals måste reconcile exakt mot canonical invoice truth.
- Inbound payload med totalsummor som inte stammer mot radnivor ska blockeras eller routas till review.

## Replay-, correction-, recovery- och cutover-regler

- Outbound replay får bara ske genom explicit resend command mot samma canonical payload eller ny correction chain.
- Correction efter utfardad faktura ska fortfarande följa fakturabibelns regler för credit note eller annan legitim korrektion.
- Inbound duplicate replay får aldrig skapa dubbel AP-ingest.
- Transportfel får generera nytt send-attempt-object men inte nytt seller document om payloaden är oforandrad.
- Migration/cutover får importera historiska Peppol artifacts som evidence men får inte uppfinna falsk delivery status.

## Huvudflödet

1. canonical invoice truth eller inbound supplier document initierar Peppol-kedjan
2. participant och endpoint bindings valideras
3. UBL payload genereras eller tas emot
4. schema- och profile-validering kor
5. outbound payload koas och skickas eller inbound payload routas
6. transport receipt registreras
7. outbound dokument markeras delivered eller failed
8. inbound dokument markeras consumed, review_required eller blocked

## Bindande scenarioaxlar

- outbound vs inbound
- invoice vs credit note
- offentlig sektor vs privat mottagare
- Peppol endpoint known vs unknown
- valid UBL/profile vs invalid
- duplicate vs first receipt
- seller-side issue vs buyer-side AP routing
- delivered vs accepted-but-not-delivered vs rejected

## Bindande policykartor

- `PEP-POL-001`: offentlig e-faktura canonical format = Peppol BIS Billing 3
- `PEP-POL-002`: outbound seller payload får bara byggas från canonical fakturatruth
- `PEP-POL-003`: inbound supplier payload får bara konsumera AP truth via levfakturabibeln
- `PEP-POL-004`: duplicate inbound payload = block or idempotent consume, aldrig dubbel AP-open-item
- `PEP-POL-005`: saknad eller felaktig endpoint-id = blocker
- `PEP-POL-006`: saknad `CustomizationID` eller `ProfileID` = blocker
- `PEP-POL-007`: offentlig mottagare utan laglig e-faktura-kanal = blocker för seller delivery

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PEP-P0001`
  - endpoint binding
  - krav: seller endpoint id, buyer endpoint id, scheme ids, participant refs
- `PEP-P0002`
  - outbound invoice payload
  - krav: `CustomizationID`, `ProfileID`, document id, issue date, seller party, buyer party, tax total, legal monetary total
- `PEP-P0003`
  - outbound credit note payload
  - krav: same profile family as invoice, own document id, reference to corrected invoice
- `PEP-P0004`
  - inbound payload validation
  - blocker om schema eller schematron inte passerar
- `PEP-P0005`
  - inbound duplicate control
  - blocker eller idempotent no-op om same digest + sender + document id redan är consumed
- `PEP-P0006`
  - transport receipt evidence
  - krav: submission ref, delivery status, timestamp och target endpoint
- `PEP-P0007`
  - public-sector delivery rule
  - blocker om mottagaren kraver e-faktura men payload inte kan levereras via giltig e-faktura-kanal
- `PEP-P0008`
  - AP routing
  - utfall: inbound payload skapar AP intake/ref, inte ledger mutation direkt

## Bindande rapport-, export- och myndighetsmappning

- outbound offentlig faktura -> Peppol BIS Billing 3 / offentlig e-faktura
- outbound privat mottagare via Peppol -> samma canonical payload family
- inbound supplier Peppol invoice -> AP intake och review evidence
- receipts -> transport och audit evidence, inte myndighetsrapport i sig

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PEP-A001` outbound offentlig invoice -> `PEP-P0001`,`PEP-P0002`,`PEP-P0006`,`PEP-P0007`
- `PEP-A002` outbound offentlig credit note -> `PEP-P0001`,`PEP-P0003`,`PEP-P0006`,`PEP-P0007`
- `PEP-A003` outbound privat via Peppol -> `PEP-P0001`,`PEP-P0002`,`PEP-P0006`
- `PEP-B001` inbound supplier invoice -> `PEP-P0004`,`PEP-P0005`,`PEP-P0008`
- `PEP-B002` inbound duplicate -> `PEP-P0005`
- `PEP-B003` invalid inbound profile -> `PEP-P0004`

## Tvingande dokument- eller indataregler

- Outbound payload får bara genereras från canonical invoice eller credit note som redan passerat seller-side blockerregler.
- Inbound payload ska lagras immutabelt som original message artifact.
- Offentlig mottagare ska ha giltig participant och endpoint identity innan issue.
- Om buyer reference, order reference eller annan offentlig referens är obligatorisk enligt mottagarprofil ska issue blockeras utan dessa fält.

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PEP-R001` missing_endpoint_binding
- `PEP-R002` invalid_participant_scheme
- `PEP-R003` missing_customization_or_profile
- `PEP-R004` schema_or_schematron_failure
- `PEP-R005` duplicate_inbound_document
- `PEP-R006` public_sector_delivery_block
- `PEP-R007` payload_vs_canonical_truth_mismatch
- `PEP-R008` unsupported_document_type

## Bindande faltspec eller inputspec per profil

- `outbound_bis_billing3_invoice`
  - required: `CustomizationID`, `ProfileID`, document id, issue date, seller endpoint, buyer endpoint, seller party, buyer party, tax totals, legal monetary totals
- `outbound_bis_billing3_credit_note`
  - required: same core fields as invoice plus explicit reference to corrected invoice
- `inbound_bis_billing3_invoice`
  - required: original payload, sender participant id, receiver participant id, transport receipt refs, payload digest
- `inbound_bis_billing3_credit_note`
  - required: same as inbound invoice plus corrected invoice reference if present

## Scenariofamiljer som hela systemet måste tacka

- offentlig outbound invoice
- offentlig outbound credit note
- privat outbound invoice via Peppol
- inbound supplier invoice
- inbound supplier credit note
- inbound duplicate
- inbound invalid profile
- outbound missing endpoint
- outbound missing buyer reference för public profile
- transport accepted but not delivered
- transport rejected

## Scenarioregler per familj

- offentlig outbound invoice måste ga via giltig e-faktura-kanal; PDF fallback är blockerad
- offentlig outbound credit note måste serialisera canonical credit note, inte negativt flippad original payload
- inbound supplier invoice måste routas till AP, inte scanning eller ledger direkt
- inbound duplicate måste bli idempotent no-op eller blocking review
- transport accepted but not delivered är inte samma sak som delivered
- transport rejected måste vara explicit fail state med reason

## Blockerande valideringar

- endpoint binding saknas
- participant scheme eller endpoint scheme ogiltig
- `CustomizationID` saknas
- `ProfileID` saknas
- payload summerar inte till canonical totals
- offentlig profil kraver buyer reference som saknas
- inbound payload saknar avsandare eller mottagaridentitet
- duplicate inbound med avvikande payload för samma document id

## Rapport- och exportkonsekvenser

- outbound Peppol är ett e-faktura-artifact och transportevidence, inte ny seller-side bokföring
- inbound Peppol är structured intake-evidence till AP, inte ny buyer-side bokföring i sig
- delivery receipts ska kunna refereras i audit trail och support workbench

## Förbjudna förenklingar

- markera outbound som delivered vid bara lokal generering
- behandla inbound Peppol som om OCR hade klassat den
- ersätta credit note med negativ invoice om fakturatruth kraver kreditnota
- droppa buyer reference eller endpoint-id för att “mottagaren brukar acceptera det”
- lagra bara normaliserat JSON och kasta original payload

## Fler bindande proof-ledger-regler för specialfall

- `PEP-P0009`
  - transport accepted without delivery receipt -> outbound state får inte bli `delivered`
- `PEP-P0010`
  - inbound credit note -> AP routing ska respektera supplier credit-note truth, inte vanlig invoice truth
- `PEP-P0011`
  - mismatch between canonical invoice and serialized payload -> hard block before send
- `PEP-P0012`
  - inbound public-sector reference fields present but malformed -> review_required

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PEP-P0001-P0007` skapar inga seller-side vouchers; de serialiserar eller transporterar bestaende invoice truth
- `PEP-P0008` skapar AP intake-routing och review objects, inte AP posting direkt
- `PEP-P0009-P0012` skapar delivery/review evidence, inte ny legal effect

## Bindande verifikations-, serie- och exportregler

- Peppol-lagret får aldrig skapa egen fakturaserie.
- Seller-side document id kommer alltid från canonical invoice truth.
- Credit note ska ha egen identity enligt canonical seller-side truth.
- Export av samma canonical payload ska vara reproducerbar för samma profile, endpoint och snapshot.

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- outbound vs inbound
- invoice vs credit note
- public sector vs private receiver
- valid endpoint vs missing endpoint
- valid profile vs invalid profile
- first message vs duplicate
- delivered vs accepted vs rejected

## Bindande fixture-klasser för Peppol, EDI och offentlig e-faktura

- `PEP-FXT-001` outbound public invoice
- `PEP-FXT-002` outbound public credit note
- `PEP-FXT-003` inbound supplier invoice
- `PEP-FXT-004` inbound duplicate
- `PEP-FXT-005` missing endpoint
- `PEP-FXT-006` invalid schematron/profile
- `PEP-FXT-007` accepted-not-delivered receipt

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- direction
- document type
- expected validation verdict
- expected delivery or routing verdict
- expected evidence artifacts
- expected downstream owner

## Bindande canonical verifikationsseriepolicy

- verifikationsserier ägs inte av Peppol-lagret
- eventuella voucher-effekter uppstår endast i seller-side eller buyer-side truth, aldrig i transportlagret
- payload identity ska dock referera canonical document id exakt

## Bindande expected outcome per central scenariofamilj

- `PEP-A001`
  - verdict: delivered only after external transport receipt marks delivered
  - downstream: no new accounting effect beyond existing seller truth
- `PEP-B001`
  - verdict: routed
  - downstream: AP intake created, no direct posting
- `PEP-B002`
  - verdict: blocked or idempotent no-op
  - reason: `PEP-R005`
- `PEP-A003`
  - verdict: blocked if endpoint missing
  - reason: `PEP-R001`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `PEP-A001` -> `PEP-P0001,P0002,P0006,P0007` -> outbound offentlig invoice delivered or failed
- `PEP-A002` -> `PEP-P0001,P0003,P0006,P0007` -> outbound offentlig credit note delivered or failed
- `PEP-A003` -> `PEP-P0001,P0002,P0006` -> outbound privat via Peppol
- `PEP-B001` -> `PEP-P0004,P0005,P0008` -> inbound AP routing
- `PEP-B002` -> `PEP-P0005` -> duplicate no-op or block
- `PEP-B003` -> `PEP-P0004` -> invalid profile blocked

## Bindande testkrav

- UBL schema validation test för outbound invoice
- schematron/profile validation test för outbound and inbound payloads
- public-sector delivery blocker test without valid endpoint or required reference
- transport receipt state machine test
- inbound duplicate idempotency test
- inbound AP routing test
- outbound payload vs canonical invoice reconciliation test

## Källor som styr dokumentet

- DIGG: [E-faktura till offentlig sektor](https://www.digg.se/kunskap-och-stod/e-handel/standarder-och-tekniska-specifikationer/peppolbisbilling3)
- SFTI: [Peppol BIS Billing 3](https://sfti.se/sfti/standarder/peppolbisehandel/peppolbisbilling3.49021.html)
- OpenPeppol Docs: [Peppol BIS Billing 3](https://docs.peppol.eu/poacc/billing/3.0/)
