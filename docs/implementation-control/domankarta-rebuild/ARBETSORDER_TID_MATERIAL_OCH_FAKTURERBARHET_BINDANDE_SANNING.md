# ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för arbetsorder, tid, materialforbrukning, billable evidence och fakturerbarhetsbeslut före invoice handoff.

Detta dokument ska styra:
- work orders
- service visits
- captured time
- captured material consumption
- customer signoff linkage
- billable evidence
- billable readiness on work-order level

Ingen delivery screen, inget timesheet-formular, inget project profitability view och ingen invoice knapp får definiera avvikande truth för work-order billability utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela arbetsorderkedjan utan att gissa:
- vad som är faktisk utforsanning
- vad som är fakturerbar tid
- vad som är fakturerbart material
- när evidence är tillräckligt
- när work order får handas vidare till project eller invoice

## Omfattning

Detta dokument omfattar:
- `WorkOrderRoot`
- `TimeCapture`
- `MaterialConsumptionCapture`
- `BillableEvidencePack`
- `WorkOrderBillableDecision`
- `CustomerSignoffRef`
- `WorkOrderInvoiceHandoffDecision`

Detta dokument omfattar inte:
- project WIP recognition
- invoice issue
- payroll line truth
- inventory valuation

Kanonisk agarskapsregel:
- detta dokument äger work-order-level billable truth
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` äger project-level WIP och profitability
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger invoice issue
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger inventory value

## Absoluta principer

- completed work order är inte automatiskt billable
- tid får aldrig bli fakturerbar utan explicit classification
- material får aldrig bli fakturerbart utan source ref och quantity proof
- customer signoff får inte gissas eller UI-fakes
- same time or material source ref får aldrig faktureras dubbelt
- payroll cost truth får aldrig ersättas av work-order hours

## Bindande dokumenthierarki för arbetsorder, tid, material och fakturerbarhet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`
- `DOMAIN_19_ROADMAP.md`
- `DOMAIN_19_IMPLEMENTATION_LIBRARY.md`

Detta dokument får inte overstyras av:
- UI timesheet summaries
- dispatch completion badges
- fakturaradsgenerering utan billable decision

## Kanoniska objekt

- `WorkOrderRoot`
- `TimeCapture`
- `MaterialConsumptionCapture`
- `BillableEvidencePack`
- `WorkOrderBillableDecision`
- `CustomerSignoffRef`
- `WorkOrderInvoiceHandoffDecision`

## Kanoniska state machines

### `WorkOrderRoot`

- `ready`
- `dispatched`
- `in_progress`
- `completed`
- `closed`
- `cancelled`

### `WorkOrderBillableDecision`

- `draft`
- `review_pending`
- `approved`
- `blocked`
- `handed_off`

## Kanoniska commands

- `CreateWorkOrderRoot`
- `CaptureTime`
- `CaptureMaterialConsumption`
- `CreateBillableEvidencePack`
- `ApproveWorkOrderBillability`
- `CreateWorkOrderInvoiceHandoffDecision`

## Kanoniska events

- `TimeCaptured`
- `MaterialConsumptionCaptured`
- `BillableEvidencePacked`
- `WorkOrderBillabilityApproved`
- `WorkOrderHandedOffToInvoice`

## Kanoniska route-familjer

- `/v1/delivery/work-orders/*`
- `/v1/delivery/time-capture/*`
- `/v1/delivery/material-consumption/*`
- `/v1/delivery/billable-decisions/*`
- `/v1/delivery/invoice-handoffs/*`

Folkjande får inte skriva legal truth:
- mobile cached timers
- spreadsheet imports
- read model calculations

## Kanoniska permissions och review boundaries

- `delivery.read`
- `delivery.capture`
- `delivery.billable_review`
- `delivery.billing_release`

## Nummer-, serie-, referens- och identitetsregler

- `work_order_root_id`
- `time_capture_id`
- `material_consumption_capture_id`
- `billable_evidence_pack_id`
- `work_order_billable_decision_id`
- `work_order_invoice_handoff_decision_id`

## Valuta-, avrundnings- och omräkningsregler

- time captures store hours, not money
- billable money snapshot requires rate source
- material consumption value is delegated from inventory/cost truth

## Replay-, correction-, recovery- och cutover-regler

- replay must reconstruct captured time and material source refs
- correction creates new capture or reversal, never overwrite
- cutover freezes open work orders, unbilled captures and pending billable decisions

## Huvudflödet

1. work order exists
2. time and material are captured
3. evidence pack is assembled
4. billable decision is approved or blocked
5. invoice handoff is created

## Bindande scenarioaxlar

- work type
  - `field_service`
  - `installation`
  - `consulting`
  - `maintenance`

- time basis
  - `billable`
  - `non_billable`
  - `blocked`

- material basis
  - `billable`
  - `included`
  - `warranty`
  - `blocked`

- signoff status
  - `required_and_present`
  - `required_missing`
  - `not_required`

## Bindande policykartor

### billable basis map

- time requires rate source and entitlement
- material requires source quantity and entitlement
- warranty blocks customer billing unless explicit policy says otherwise

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `WRK-P0001` time captured
  - state only

- `WRK-P0002` material captured
  - state only

- `WRK-P0003` billable approved
  - state:
    - `WorkOrderBillableDecision=approved`

- `WRK-P0004` handed off to invoice
  - state:
    - downstream owner `FAKTURAFLODET...`

- `WRK-P0005` blocked missing signoff
  - blocked

- `WRK-P0006` blocked duplicate source ref
  - blocked

## Bindande rapport-, export- och myndighetsmappning

- billable backlog
- unbilled work orders
- blocked billable decisions

## Bindande scenariofamilj till proof-ledger och rapportspar

- `WRK-A001` time captured -> `WRK-P0001`
- `WRK-A002` material captured -> `WRK-P0002`
- `WRK-B001` billable approved -> `WRK-P0003`
- `WRK-B002` invoice handoff -> `WRK-P0004`
- `WRK-C001` blocked signoff missing -> `WRK-P0005`
- `WRK-C002` blocked duplicate ref -> `WRK-P0006`

## Tvingande dokument- eller indataregler

- time capture needs worker, duration, source ref and classification
- material capture needs item, quantity, source ref and entitlement
- evidence pack needs work order ref and linked captures

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `TIME_BILLABLE`
- `TIME_NON_BILLABLE`
- `MATERIAL_BILLABLE`
- `MATERIAL_INCLUDED`
- `MATERIAL_WARRANTY`
- `CUSTOMER_SIGNOFF_REQUIRED`
- `DUPLICATE_SOURCE_BLOCK`

## Bindande faltspec eller inputspec per profil

### billable time

- work order id
- worker id
- duration
- rate source

### billable material

- work order id
- item id
- quantity
- entitlement source

## Scenariofamiljer som hela systemet måste tacka

- billable time and billable material
- billable time only
- included material
- warranty work blocked
- missing signoff blocked
- duplicate source blocked

## Scenarioregler per familj

- billable decision requires at least one approved evidence pack
- duplicate source refs always block
- signoff requirement must be satisfied where policy demands it

## Blockerande valideringar

- missing rate source
- missing material entitlement source
- duplicate source ref
- required signoff missing

## Rapport- och exportkonsekvenser

- billable decisions feed project and invoice queues
- blocked cases feed audit/workbench only

## Förbjudna förenklingar

- using completion state as billable state
- using payroll hours as invoice hours without billable decision
- using inventory issue as customer-billable material without evidence pack

## Fler bindande proof-ledger-regler för specialfall

- `WRK-P0007` non-billable captured work
  - state only

- `WRK-P0008` warranty material blocked
  - blocked

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `WRK-P0001-P0003`
  - work-order state only

- `WRK-P0004`
  - invoice handoff state

- `WRK-P0005-P0008`
  - blocked or special state

## Bindande verifikations-, serie- och exportregler

- no direct voucher here
- invoice handoff must reference work order ids and evidence pack ids

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- work type
- time basis
- material basis
- signoff status

## Bindande fixture-klasser för arbetsorder, tid, material och fakturerbarhet

- `WRK-FXT-001`
  - billable service call

- `WRK-FXT-002`
  - warranty work blocked

- `WRK-FXT-003`
  - missing signoff blocked

## Bindande expected outcome-format per scenario

- scenario id
- fixture class
- time outcome
- material outcome
- billable decision outcome
- handoff outcome
- blocked reason if any

## Bindande canonical verifikationsseriepolicy

- `none`
- `delegated`

## Bindande expected outcome per central scenariofamilj

- `WRK-B001`
  - fixture minimum: `WRK-FXT-001`
  - expected proof: `WRK-P0003`

- `WRK-C001`
  - fixture minimum: `WRK-FXT-003`
  - expected blocked reason: signoff missing
  - expected proof: `WRK-P0005`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `WRK-A001` -> `WRK-P0001`
- `WRK-A002` -> `WRK-P0002`
- `WRK-B001` -> `WRK-P0003`
- `WRK-B002` -> `WRK-P0004`
- `WRK-C001` -> `WRK-P0005`
- `WRK-C002` -> `WRK-P0006`

## Bindande testkrav

- time capture suite
- material capture suite
- billable decision suite
- signoff blocker suite
- duplicate source blocker suite

## Källor som styr dokumentet

- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`

