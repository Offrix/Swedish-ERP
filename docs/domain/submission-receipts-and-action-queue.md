# Submission receipts and action queue

## Syfte

Detta dokument definierar den generiska modellen för submissions, kvittenser, action queue, felklassning och återförsök som kan återanvändas av AGI, moms, HUS, Peppol och årsflöden. Målet är att varje försök att skicka extern rapport eller fil ska få spårbar statuskedja, idempotens, tydlig skillnad mellan transportfel och domänfel och en operatörsvy för manuell hantering.

## Scope

### Ingår

- submission-objekt, submission states, receipts och provider-normaliserad statuskedja
- action queue för manuella åtgärder, återförsök, komplettering och återspelning
- felklassning, idempotensnycklar, retry-policy och operator view
- generisk modell som kan användas av AGI, moms, HUS, Peppol och årsflöden
- historik och korrelationsspår mellan källa, payloadversion, kvittens och användaråtgärd

### Ingår inte

- innehållet i fil- eller payloadschema för en specifik myndighet eller partner
- köinfrastruktur i detalj; den beskrivs i async-jobs-dokumentet
- juridisk signering eller styrkande av innehåll utöver att submission kan bära signaturstatus

### Systemgränser

- submission-domänen äger submission envelope, receipt chain och action queue item
- respektive källdomän äger payloadgenerering, numerik och affärsbeslut
- integrationsadaptern äger transport mot extern mottagare men ska normalisera kvittenser till generisk receipt-modell
- operatorbackoffice äger manuell behandling men får inte ändra historiskt payloadinnehåll

## Roller

- **Submission operator** övervakar utgående submissions och hanterar action queue.
- **Tax operator** ansvarar för AGI- och momsrelaterade submissions.
- **HUS operator** ansvarar för HUS/ROT/RUT-flöden.
- **Peppol operator** ansvarar för Peppol-sändningar och kvittenser.
- **Signatory** kan behöva godkänna eller signera innan submission får skickas.
- **Support/admin** får endast göra tekniska retries eller klassificering av fel inom tillåtet scope.

## Begrepp

- **Submission envelope** — Det versionerade objekt som omsluter payload, metadata, idempotens och mottagarinformation.
- **Receipt** — Normaliserad representation av ett mottaget svar eller kvittenssteg från extern part.
- **Action queue item** — Ett operativt ärende som kräver mänsklig handling efter avvikelse eller vänteläge.
- **Transportfel** — Fel före affärsvalidering hos mottagaren, till exempel timeout eller autentiseringsfel.
- **Domänfel** — Fel i innehåll eller affärsregel efter att mottagaren faktiskt behandlat meddelandet.
- **Retry class** — Klassning som avgör om återförsök är automatiskt, manuellt eller förbjudet.
- **Finality** — Markering att inga fler kvittenser eller återförsök förväntas för aktuell attempt.

## Objektmodell

### Submission
- fält: `submission_id`, `submission_type`, `company_id`, `period_id`, `source_object_type`, `source_object_id`, `payload_version`, `attempt_no`, `status`, `provider_key`, `recipient_id`, `idempotency_key`, `signed_state`, `submitted_at`, `finalized_at`
- invariant: samma `idempotency_key` får inte skapa flera aktiva attempts med olika payload

### Receipt
- fält: `receipt_id`, `submission_id`, `sequence_no`, `receipt_type`, `provider_status`, `normalized_status`, `received_at`, `raw_reference`, `message_text`, `is_final`
- invariant: receipt-sekvensen ska vara append-only och ordnad

### Action queue item
- fält: `queue_item_id`, `submission_id`, `action_type`, `priority`, `owner_queue`, `owner_user_id`, `status`, `retry_after`, `required_input`, `resolution_code`
- invariant: öppna action queue-items får inte dubletter för samma submission och samma olösta grundorsak

## State machine

### Submission
- `draft -> ready -> signed -> submitted -> received -> accepted -> finalized`
- `submitted -> transport_failed`
- `received -> domain_rejected`
- `transport_failed -> retry_pending -> submitted`
- `domain_rejected -> action_required -> ready`
- `accepted -> corrected -> superseded` om senare rättelse eller omleverans ersätter tidigare submission

### Receipt chain
- `none -> technical_ack -> business_ack -> final_ack`
- negativ kedja kan vara `technical_nack` eller `business_nack`
- flera receipts kan komma i följd och ska aldrig skriva över tidigare receipt

### Action queue item
- `open -> claimed -> waiting_input -> resolved -> closed`
- `open -> auto_resolved` när ny kvittens eller nytt försök eliminerar problemet

## Användarflöden

### Skicka submission
1. Källdomänen bygger payload och låser versionssnapshot.
2. Submission envelope skapas med idempotensnyckel.
3. Eventuell signering eller step-up-kontroll genomförs.
4. Adapter skickar payload och registrerar första receipt eller transportfel.

### Hantera kvittenser
1. Inkommande provider-svar normaliseras till receipt-objekt.
2. Submissionstatus uppdateras endast genom appendad receiptkedja eller explicit operatoraction.
3. Om slutlig positiv receipt inkommer markeras submission `finalized`.
4. Om slutligt negativt svar inkommer skapas action queue item.

### Manuell åtgärd och återförsök
1. Operatör öppnar action queue.
2. Operatören klassar felet som transport, domän eller policyblocker.
3. Om åtgärden är komplettering eller rättelse skapas ny payloadversion och ny attempt.
4. Om åtgärden är tekniskt retry används samma payloadversion men ny attempt med länk till tidigare försök.

## Affärsregler

### Idempotens
- idempotensnyckel ska bygga på submission type, mottagare, källa, payload hash och relevant period eller dokumentidentitet
- samma key med identisk payload ska återanvända eller referera till befintlig submission, inte skapa oberoende parallellkedja
- ny payloadversion kräver ny idempotensnyckel eller explicit `supersedes_submission_id`

### Transportfel vs domänfel
- transportfel omfattar timeout, DNS, TLS, nätfel, rate limit, autentiseringsfel och mottagarens tekniska `5xx`
- domänfel omfattar schemafel, ogiltig referens, saknade obligatoriska fält, affärsregelbrott och avvisad signatur
- transportfel får normalt automatisk retry enligt retry class
- domänfel får aldrig automatisk retry med oförändrat payloadinnehåll

### Action queue
- action queue ska bära tydlig rekommenderad åtgärd: `retry`, `collect_more_data`, `correct_payload`, `contact_provider`, `close_as_duplicate`
- operatören får inte ändra gamla receipts eller gammalt payload
- kön ska gruppera efter prioritet, submission type, bolag och finality-risk
- item stängs först när submission är löst, ersatt eller uttryckligen avbruten

### Statuskedja
- `received` betyder att minst en extern teknisk kvittens kommit
- `accepted` betyder att mottagaren affärsmässigt accepterat eller tagit över ärendet
- `finalized` betyder att inga fler receipts eller operatörsåtgärder förväntas
- `corrected` och `superseded` används för rättelser där tidigare submission måste kunna följas historiskt

## Behörigheter

- `submission_operator` får claim:a köärenden, initiera teknisk retry och se receipts
- `tax_operator`, `hus_operator` och `peppol_operator` får dessutom initiera domänspecifik korrigering inom sitt område
- signatory-roll krävs för att gå från `ready` till `signed` när policy kräver signering
- support får inte godkänna affärsmässig korrigering i stället för utsedd operatör

## Fel- och konfliktfall

- duplicate receipt ska ignoreras idempotent men loggas
- receipt med okänd providerreferens ska hamna i `orphan_receipt_review`
- nytt försök med identisk payload när tidigare attempt fortfarande väntar på final receipt ska blockeras eller bindas till samma kedja beroende på adapterregel
- receipt som motsäger tidigare final receipt ska ge incident och kräva manuell granskning
- action queue item utan behörig owner ska gå till fallback-kö

## Notifieringar

- operatör får notifiering när submission går till `action_required`, `transport_failed` över tröskel eller `domain_rejected`
- ansvarig signatory får notifiering när signering krävs för väntande submission
- manager får notifiering vid backlog, hög prioritet eller försenad action queue
- slutanvändare kan få läsnotis om att inlämning lyckats eller misslyckats, men operativa details exponeras bara där policy tillåter

## Audit trail

- varje submissionattempt ska logga payloadversion, payload hash, idempotensnyckel, ansvarig användare eller automation, provider och correlation id
- receipts ska sparas i ordning med råreferens, normaliserad status och tid
- action queue ska logga claim, handover, resolution och retrybeslut
- auditspåret ska kunna visa exakt vilken payload och vilka receipts som ledde till ett slutligt beslut

## API/events/jobs

- kommandon: `prepare_submission`, `sign_submission`, `submit_payload`, `register_receipt`, `retry_submission`, `supersede_submission`, `resolve_submission_queue_item`
- events: `submission_ready`, `submission_submitted`, `submission_receipt_recorded`, `submission_transport_failed`, `submission_domain_rejected`, `submission_finalized`
- jobb: `submission_dispatch_worker`, `submission_receipt_ingest_worker`, `submission_retry_scheduler`, `submission_queue_sla_monitor`

## UI-krav

- operatörsvyn ska visa statuskedja, receipts, attempts, payloadversioner, recommended action och backlog
- användaren ska kunna se skillnad mellan tekniskt skickat, affärsmässigt accepterat och slutligt färdigt
- receipts ska visas kronologiskt och med normaliserad status
- UI får inte erbjuda retry när felklassen förbjuder tekniskt återförsök

## Testfall

1. tekniskt timeoutfel ger `transport_failed` och retry-plan
2. affärsvalideringsfel ger `domain_rejected` och action queue
3. dubbelt receipt registreras idempotent
4. ny korrigerad payloadversion supersedes tidigare submission
5. operator retry av identiskt payload skapar ny attempt men bevarar samma historikkedja
6. orphan receipt går till granskningskö

## Exit gate

- [ ] submission, receipt och action queue fungerar generiskt över flera submissiontyper
- [ ] transportfel och domänfel klassificeras olika och leder till rätt åtgärd
- [ ] receipts och attempts är append-only och idempotenta
- [ ] operatörsvyn kan driva manuell korrigering utan att förstöra historik
- [ ] final status kan härledas exakt från payloadversion och receiptkedja
