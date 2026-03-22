# Field work order, service order and material flow

## Syfte

Detta dokument definierar den bindande domanmodellen for FAS 10.2: dispatch, arbetsorder, serviceorder, fältmobil, material/lager och kundsignatur. Syftet ar att sakerstalla att field-floden ar deterministiska, spårbara, versionsstyrda och fakturerbara utan att flytta domanlogik till UI.

## Scope

### Ingar

- arbetsorder och serviceorder med tydliga statusovergangar
- dispatch assignment mellan arbetsorder och bemannad anstallning
- materialuttag fran lagerplats med projektkoppling
- kundsignatur och signaturkrav per arbetsorder
- field-mobile today-feed, offline envelope och synkstatus
- fakturering av avslutad arbetsorder via AR

### Ingar inte

- byggspecifika regler for ATA, HUS, omvand moms och personalliggare (FAS 10.3)
- fritt offline-stod for reglerade ekonomiobjekt
- lagerinkop och leverantorsmottagning (AP-doman)

### Systemgranser

- domain-field ager arbetsorder, dispatch, materialuttag, kundsignatur och offline envelope
- domain-projects ager projektets livscykel, budget, WIP och forecast
- domain-hr ager anstallning och behorig dispatch-resurs
- domain-ar ager kundfaktura, issue och leveranslogik
- API-lagret ager transport, authz och valideringsfel till klient

## Roller

- Field user: utfor check-in, materialuttag, kommentar och signaturinsamling
- Dispatcher: planerar och uppdaterar dispatch assignments
- Project manager: foljer arbetsorderstatus, materialkostnad och fakturerbarhet
- Finance operator: granskar och fakturerar avslutade arbetsorder
- Support: hanterar conflict repair enligt runbook

## Begrepp

- Work order: operativt utförande med projekt, kund och planerad tid
- Service order: arbetsorder med servicekaraktar, ofta SLA- eller avtalstyrd
- Dispatch assignment: tidsbundet uppdrag till anstallning for en arbetsorder
- Inventory location: fysisk plats for material, till exempel lager eller servicebil
- Inventory item: artikel med koppling till AR-item for fakturering
- Material withdrawal: forbrukning av inventarie till arbetsorder/projekt
- Customer signature: kundens godkannande av utfört arbete
- Mobile today feed: fältmobil sammanstallning av dagens uppdrag och synkstatus
- Sync envelope: versionsmedveten offline-mutation med idempotensnyckel

## Objektmodell

### Field work order
- falt: `work_order_id`, `work_order_no`, `company_id`, `project_id`, `customer_id`, `status`, `priority_code`, `scheduled_start_at`, `scheduled_end_at`, `actual_started_at`, `actual_ended_at`, `labor_minutes`, `labor_item_id`, `labor_rate_amount`, `signature_required`, `signature_status`, `customer_invoice_id`, `version_no`
- invariant: `project_id` maste tillhora samma bolag
- invariant: `version_no` maste okas vid varje statusandring eller central mutation

### Dispatch assignment
- falt: `dispatch_assignment_id`, `company_id`, `work_order_id`, `employment_id`, `starts_at`, `ends_at`, `status`
- invariant: `employment_id` maste finnas i HR for samma bolag

### Inventory model
- inventory location: `inventory_location_id`, `location_code`, `location_type`, `project_id_optional`
- inventory item: `inventory_item_id`, `item_code`, `unit_code`, `ar_item_id_optional`, `sales_unit_price_amount`
- inventory balance: `inventory_balance_id`, `inventory_item_id`, `inventory_location_id`, `on_hand_quantity`, `reserved_quantity`
- invariant: `reserved_quantity <= on_hand_quantity`

### Material withdrawal
- falt: `material_withdrawal_id`, `company_id`, `work_order_id`, `project_id`, `inventory_item_id`, `inventory_location_id`, `quantity`, `source_channel`
- invariant: `project_id` arvs fran arbetsorder och far inte ersattas av klient

### Customer signature
- falt: `field_customer_signature_id`, `company_id`, `work_order_id`, `signer_name`, `signed_at`, `signature_status`, `signature_payload`
- invariant: en arbetsorder med `signature_required=true` far inte ga till `completed` utan status `captured`

### Field sync envelope
- falt: `field_sync_envelope_id`, `company_id`, `client_mutation_id`, `client_device_id`, `client_user_id`, `object_type`, `mutation_type`, `base_server_version`, `payload_hash`, `payload_json`, `sync_status`, `last_error_code`
- invariant: `(company_id, client_mutation_id)` maste vara unik

## State machine

### Work order
- `draft -> ready_for_dispatch`
- `ready_for_dispatch -> dispatched`
- `dispatched -> in_progress`
- `in_progress -> completed`
- `completed -> invoiced`
- `draft|ready_for_dispatch|dispatched|in_progress -> cancelled`

### Dispatch assignment
- `planned -> accepted -> en_route -> on_site -> completed`
- `planned|accepted|en_route|on_site -> cancelled`

### Signature
- `pending -> captured`
- `pending -> voided`

### Sync envelope
- `pending -> synced`
- `pending -> conflicted`
- `pending -> failed_terminal`

## Anvandarfloden

### Dispatch till execution
1. Arbetsorder skapas med projekt, kund och planerat intervall.
2. Dispatcher kopplar en anstallning via dispatch assignment.
3. Faltanvandare ser uppdraget i mobile today-feed.
4. Uppdraget flyttas stegvis till `on_site` och `in_progress`.

### Materialuttag
1. Faltanvandare valjer arbetsorder och inventarie.
2. Uttag valideras mot lagerbalans.
3. Balans reduceras och uttag loggas med projektkoppling.
4. Uttaget blir del av arbetsorderns faktureringsunderlag.

### Kundsignatur och avslut
1. Signatur krav kontrolleras mot arbetsorder.
2. Kundsignatur registreras med signerare och tidsstampel.
3. Arbetsorder kan avslutas till `completed` nar krav uppfylls.
4. Fakturering skapar AR-invoice och arbetsorder blir `invoiced`.

### Offline synk
1. Klient skapar sync envelope for tillaten mutation.
2. Server validerar idempotensnyckel och basversion.
3. Versionkonflikt ger `conflicted`, annars `synced`.
4. Support anvander conflict runbook vid terminala fel.

## Affarsregler

- Arbetsorder far inte faktureras innan status `completed`.
- Materialuttag maste ha positiv kvantitet och tillrackligt saldo.
- Fakturarader byggs av labor-rad och fakturerbara materialuttag.
- Arbetsorder utan labor-rad och utan fakturerbara materialuttag far inte faktureras.
- `base_server_version` i offline envelope maste matcha aktuell serverversion for versionskansliga mutationer.
- Dubblett av `client_mutation_id` maste behandlas idempotent och far inte skapa extra side effects.

## Behorigheter

- `field_user`: lasa tilldelade arbetsorder, skapa tillatna falthandelser
- `dispatcher`: skapa/uppdatera dispatch assignments
- `project_manager`: lasa samtliga arbetsorder inom projektets scope
- `finance_operator`: utfora fakturering av avslutade arbetsorder
- support-atkomst till conflict repair styrs av separat policy

## Fel- och konfliktfall

- `field_work_order_not_found`: arbetsorder saknas eller ligger utom bolagsscope
- `field_inventory_insufficient_stock`: materialuttag overstiger on hand
- `field_work_order_signature_required`: avslut nekas utan kundsignatur
- `field_work_order_invoice_lines_missing`: ingen fakturerbar rad finns
- `version_conflict`: basversion i offline envelope matchar inte serverversion
- `unsupported_offline_action`: objekt eller mutation far inte goras offline

## Notifieringar

- dispatch tilldelad: notifiering till faltresurs
- status `in_progress` och `completed`: notifiering till dispatcher/projektansvarig
- `conflicted` envelope: notifiering till support/operator queue
- arbetsorder `completed` utan faktura efter policyfonstrer: notifiering till finance operator

## Audit trail

- varje statusovergang i arbetsorder och dispatch loggas med actor, correlation id och tidsstampel
- materialuttag loggas med project_id, inventory_item_id, location och quantity
- kundsignatur loggas med signer_name, signed_at och hash av payload
- offline envelope loggar apply-resultat (`synced`, `conflicted`, `failed_terminal`)
- auditposter far inte overskrivas, endast kompletteras

## API/events/jobs

- API ska exponera list/create/get for arbetsorder, dispatch, materialuttag, signatur och sync envelope
- API ska kunna returnera mobile today-feed med synkstatus
- events ska finnas for `field.work_order.*`, `field.material_withdrawal.created`, `field.signature.captured`, `field.sync.*`
- bakgrundsjobb kan anvandas for reminder/sla, men maste vara idempotenta

## UI-krav

- field-mobile ar tumvanlig och forenkad; desktop-web ar fullstandig yta
- UI visar alltid syncstatus och pending/conflict pa relevanta objekt
- UI far inte innehalla domanregler for fakturering, lagersaldo eller statusregler
- konfliktlosning i UI ska bygga pa serverns merge-strategi och konfliktpayload

## Testfall

- skapa arbetsorder med dispatch till giltig anstallning
- materialuttag minskar saldo och kopplas till projekt
- avslut nekas utan signatur nar signatur ar obligatorisk
- arbetsorder kan faktureras efter `completed` och far `customer_invoice_id`
- offline mutation med fel basversion ger `conflicted`
- samma `client_mutation_id` ger idempotent replay utan dubbla objekt

## Exit gate

Dokumentet ar klart nar hela 10.2-flodet ar definierat med determinstiska regler, tydliga statusovergangar, auditbarhet och testbar verifiering for offline-sync, projektkopplat materialuttag och arbetsorderfakturering.

