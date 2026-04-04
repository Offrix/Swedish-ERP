# ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela det kommersiella flödet från offert och avtal till order, ändringsorder, leveransvillkor, billing trigger och handoff till fakturaflödet.

Detta dokument ska styra:
- offerter
- avtal
- call-off orders och direkta orders
- orderlinjer och kommersiella villkor
- ändringsorder
- cancellation och close-out före faktura
- billing trigger och invoice handoff
- kopplingen mot delivery, project, inventory och faktura

Ingen CRM-skarm, inget project-rootobjekt, ingen service-order, ingen fakturaskapare och ingen portal får definiera avvikande truth för quote-to-order-to-billing utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela kommersiella sanningskedjan utan att gissa:
- när en offert blir bindande affar
- när ett avtal, en order eller en ändringsorder är den verkliga kommersiella roten
- vilka villkor som måste sparas för att en senare faktura ska vara korrekt
- när leverans eller milstolpe faktiskt ger billing entitlement
- när cancellation, credit eller omfakturering ska triggas

## Omfattning

Detta dokument omfattar:
- `CommercialQuote`
- `CommercialAgreement`
- `CustomerOrder`
- `OrderLine`
- `ChangeOrder`
- `BillingTriggerDecision`
- `CancellationDecision`
- `CommercialHandoffReceipt`
- `OrderToInvoiceDecision`

Detta dokument omfattar inte:
- återkommande abonnemangsdebitering som eget sanningslager
- faktisk utforsanning i delivery/field
- WIP och intäktsavräkning
- kundfaktura och kundreskontra
- kundbetalning

Kanonisk agarskapsregel:
- detta dokument äger kommersiell commitment truth fram till invoice handoff
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger legal issue, invoice content, kundreskontra och seller-side moms
- `ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING.md` kommer att aga recurring schedules
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` kommer att aga progress, WIP och intäktsavräkning
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` kommer att aga utforsanning, tid och materialbevis

## Absoluta principer

- ingen faktura får skapas utan kommersiell rot
- offert är inte avtal eller order
- avtal är inte automatiskt billing entitlement
- orderlinje får aldrig sakna prisprofil, leveransprofil och skatteprofil
- ändringsorder får aldrig overwritea historisk orderversion
- cancellation får aldrig radera historisk affärssanning
- time-and-material, milestone och fixed-price får aldrig blandas utan explicit billing model
- HUS-, grön teknik- eller ändra specialprofiler får aldrig aktiveras utan explicit order- och fakturarouting
- recurring billing får aldrig smygas in i detta dokument utan explicit abonnemangstruth

## Bindande dokumenthierarki för order, offert, avtal och fakturahandoff

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- Sveriges riksdag: avtalslagen
- Sveriges riksdag: lag om elektronisk handel och ändra informationssamhallets tjänster

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `DOMAIN_18_ROADMAP.md`
- `DOMAIN_18_IMPLEMENTATION_LIBRARY.md`
- `DOMAIN_19_ROADMAP.md`
- `DOMAIN_20_ROADMAP.md`

Detta dokument får inte overstyras av:
- fria CRM-notes
- projektmetadata utan orderrot
- UI-flaggar som sager "redo att faktureras" utan billing trigger decision
- gamla fakturavariabler som blandar ihop order, avtal och abonnemang

## Kanoniska objekt

- `CommercialQuote`
  - offert med pris, scope, giltighetstid och acceptance mode

- `CommercialAgreement`
  - avtal eller ramavtal som satter villkor

- `CustomerOrder`
  - bindande orderrot för affaren eller avropet

- `OrderLine`
  - rad med kommersiellt innehåll, prisprofil, tax profile och leveransprofil

- `ChangeOrder`
  - separat objekt för ändring av order

- `BillingTriggerDecision`
  - explicit beslut om att fakturahandoff får ske

- `CancellationDecision`
  - explicit beslut om annullering eller avslut

- `CommercialHandoffReceipt`
  - immutable receipt som kopplar kommersiell rot till downstream owner

- `OrderToInvoiceDecision`
  - handoffobjekt till fakturaflödet

## Kanoniska state machines

### `CommercialQuote`

- `draft`
- `sent`
- `accepted`
- `expired`
- `withdrawn`

### `CommercialAgreement`

- `draft`
- `review_pending`
- `active`
- `expired`
- `terminated`

### `CustomerOrder`

- `draft`
- `approved`
- `active`
- `partially_fulfilled`
- `fulfilled`
- `cancelled`
- `closed`

### `ChangeOrder`

- `draft`
- `review_pending`
- `approved`
- `applied`
- `rejected`

## Kanoniska commands

- `CreateCommercialQuote`
- `SendCommercialQuote`
- `AcceptCommercialQuote`
- `ActivateCommercialAgreement`
- `CreateCustomerOrder`
- `ApproveCustomerOrder`
- `CreateChangeOrder`
- `ApproveChangeOrder`
- `CreateBillingTriggerDecision`
- `CreateOrderToInvoiceDecision`
- `CancelCustomerOrder`

## Kanoniska events

- `CommercialQuoteAccepted`
- `CommercialAgreementActivated`
- `CustomerOrderApproved`
- `CustomerOrderActivated`
- `ChangeOrderApproved`
- `BillingTriggerApproved`
- `OrderHandedOffToInvoice`
- `CustomerOrderCancelled`

## Kanoniska route-familjer

- `/v1/commercial/quotes/*`
- `/v1/commercial/agreements/*`
- `/v1/commercial/orders/*`
- `/v1/commercial/change-orders/*`
- `/v1/commercial/billing-triggers/*`
- `/v1/commercial/invoice-handoffs/*`

Folkjande får inte skriva legal truth:
- CRM kanban drag-and-drop
- note fields
- quote pdf preview
- delivery completion badge
- UI button som hoppar över billing trigger decision

## Kanoniska permissions och review boundaries

- `commercial.read`
- `commercial.manage`
- `commercial.approve`
- `commercial.price_override`
- `commercial.contract_review`
- `commercial.billing_release`

Support/backoffice:
- får läsa
- får inte skapa bindande quote acceptance eller billing release

## Nummer-, serie-, referens- och identitetsregler

- varje quote ska ha `quote_id`
- varje agreement ska ha `agreement_id`
- varje order ska ha `customer_order_id`
- varje order line ska ha `order_line_id`
- varje change order ska ha `change_order_id`
- varje billing trigger ska ha `billing_trigger_decision_id`
- varje invoice handoff ska ha `order_to_invoice_decision_id`

## Valuta-, avrundnings- och omräkningsregler

- quote, agreement och order ska bevara kommersiell valuta
- billing handoff måste skapa ett immutable pricing snapshot
- rounding får inte ske olika i quote, order och invoice handoff utan explicit pricing policy
- foreign currency quote får inte ge invoice handoff utan canonical conversion snapshot när fakturaflödet kraver det

## Replay-, correction-, recovery- och cutover-regler

- order och agreement får aldrig overwriteas; ändringar måste ske via `ChangeOrder`
- replay måste kunna återskapa quote -> agreement -> order -> billing trigger -> invoice handoff
- cutover måste frysa:
  - open quotes
  - active agreements
  - open orders
  - pending change orders
  - billing triggers not yet invoiced
- recovery måste kunna identifiera orders som handats till invoice men inte issueats

## Huvudflödet

1. quote eller direkt order initieras
2. avtal eller annan kommersiell grund verifieras
3. order skapas och godkänns
4. delivery, project eller annan downstream owner får handoff
5. billing trigger uppstår enligt profil
6. `OrderToInvoiceDecision` skapas
7. fakturaflödet tar över

## Bindande scenarioaxlar

- commitment root
  - `quote_to_order`
  - `agreement_to_order`
  - `direct_order`
  - `call_off_order`

- billing model
  - `upfront`
  - `on_delivery`
  - `on_milestone`
  - `time_and_material`
  - `manual_release`

- order type
  - `goods`
  - `services`
  - `mixed`
  - `project_linked`
  - `field_linked`

- fulfillment status
  - `not_started`
  - `partial`
  - `ready_for_billing`
  - `fully_billed`
  - `cancelled`

- correction profile
  - `none`
  - `change_order`
  - `pre_invoice_cancel`
  - `post_handoff_cancel`

## Bindande policykartor

### Billing model policy

- `upfront`
  - billing trigger kan uppsta före leverans

- `on_delivery`
  - requires downstream delivery proof

- `on_milestone`
  - requires milestone proof

- `time_and_material`
  - requires downstream time/material truth

- `manual_release`
  - requires explicit billing approval

### Downstream owner map

- `goods`
  - inventory/fulfillment owner

- `services`
  - delivery or project owner

- `mixed`
  - split owner by line

### Special tax profile map

- `standard_vat`
- `reverse_charge_candidate`
- `hus_candidate`
- `green_tech_candidate`
- `export_candidate`

Detta dokument får bara spara kandidatprofil. Slutlig legal issue avgors i fakturabibeln.

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `COM-P0001` quote sent
  - state:
    - `CommercialQuote=sent`
  - no_gl

- `COM-P0002` quote accepted and order created
  - state:
    - `CommercialQuote=accepted`
    - `CustomerOrder=approved`
  - no_gl

- `COM-P0003` agreement activated and order created
  - state:
    - `CommercialAgreement=active`
    - `CustomerOrder=approved`
  - no_gl

- `COM-P0004` direct order approved
  - state:
    - `CustomerOrder=approved`
  - no_gl

- `COM-P0005` change order approved
  - state:
    - `ChangeOrder=approved`
  - no_gl

- `COM-P0006` billing trigger approved
  - state:
    - `BillingTriggerDecision=approved`
  - no_gl

- `COM-P0007` order handed off to invoice
  - state:
    - `OrderToInvoiceDecision=created`
    - downstream owner `FAKTURAFLODET...`
  - voucher owner: invoice flow

- `COM-P0008` pre-invoice cancel
  - state:
    - `CancellationDecision=approved`
    - `CustomerOrder=cancelled`
  - no_gl

- `COM-P0009` blocked recurring misuse
  - state:
    - blocked
    - requires subscription truth

- `COM-P0010` blocked missing billing trigger
  - state:
    - blocked

- `COM-P0011` blocked missing downstream proof
  - state:
    - blocked

- `COM-P0012` post-handoff cancel requires invoice correction path
  - state:
    - no direct cancel
    - invoice correction required

## Bindande rapport-, export- och myndighetsmappning

- quote conversion report ska kunna visa quote -> order lineage
- agreement coverage report ska kunna visa avtal -> order lineage
- open billing trigger report ska kunna visa orders som är kommersiellt redo men ej fakturerade
- post-handoff cancellation ska kunna visa behov av credit/korrektion

## Bindande scenariofamilj till proof-ledger och rapportspar

- `COM-A001` quote sent -> `COM-P0001`
- `COM-A002` quote accepted to order -> `COM-P0002`
- `COM-A003` agreement to order -> `COM-P0003`
- `COM-A004` direct order -> `COM-P0004`
- `COM-B001` approved change order -> `COM-P0005`
- `COM-C001` billing trigger approved -> `COM-P0006`
- `COM-C002` invoice handoff -> `COM-P0007`
- `COM-D001` pre-invoice cancel -> `COM-P0008`
- `COM-D002` recurring misuse blocked -> `COM-P0009`
- `COM-D003` missing billing trigger -> `COM-P0010`
- `COM-D004` missing downstream proof -> `COM-P0011`
- `COM-D005` post-handoff cancel -> `COM-P0012`

## Tvingande dokument- eller indataregler

- order line måste ha:
  - commercial description
  - quantity or billing basis
  - price profile
  - tax profile candidate
  - billing model
  - downstream owner

- quote måste ha:
  - validity period
  - acceptance mode
  - commercial terms snapshot

- agreement måste ha:
  - effective date
  - commercial terms
  - billing constraints

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `QUOTE_ACCEPTED`
- `AGREEMENT_ACTIVE`
- `DIRECT_ORDER`
- `CALL_OFF_ORDER`
- `BILLING_TRIGGER_DELIVERY`
- `BILLING_TRIGGER_MILESTONE`
- `BILLING_TRIGGER_TNM`
- `BILLING_TRIGGER_MANUAL`
- `PRE_INVOICE_CANCEL`
- `POST_HANDOFF_CANCEL`
- `RECURRING_REQUIRES_SUBSCRIPTION_TRUTH`

## Bindande faltspec eller inputspec per profil

### quote_to_order

- quote id
- customer id
- validity to
- accepted timestamp
- accepted by

### agreement_to_order

- agreement id
- effective date
- order reference
- commercial terms snapshot

### direct_order

- order id
- order date
- pricing snapshot
- billing model

## Scenariofamiljer som hela systemet måste tacka

- quote accepted to order
- direct order
- framework agreement with call-off
- change order before billing
- milestone billing trigger
- delivery billing trigger
- time-and-material billing trigger
- manual billing release
- pre-invoice cancel
- post-handoff cancel
- blocked recurring misuse
- blocked missing downstream proof

## Scenarioregler per familj

- quote acceptance får inte i sig issuea invoice
- direct order måste fortfarande ha pricing snapshot och downstream owner
- change order efter invoice handoff får inte justera historisk order utan correction path
- time-and-material billing trigger får inte skapas utan downstream truth
- recurring commercial setup får inte handas till invoice via detta dokument
- post-handoff cancel får inte markera order som ogjord; credit/correction path måste användas

## Blockerande valideringar

- missing billing model
- missing downstream owner
- missing price profile
- quote expired before acceptance
- recurring flag without subscription truth
- invoice handoff without billing trigger
- on_delivery without delivery proof
- on_milestone without milestone proof
- time_and_material without downstream fact basis

## Rapport- och exportkonsekvenser

- open quotes ska kunna separeras från bindande orders
- active agreements ska kunna visas utan att tas för fakturerbara
- invoice handoff queue ska kunna exporteras med immutable pricing snapshot
- blocked commercial cases ska till audit trail men aldrig till invoice issue queue

## Förbjudna förenklingar

- att lata CRM stage avgöra legal order status
- att lata project status ensam avgöra invoice handoff
- att skapa faktura direkt från orderrad utan billing trigger decision
- att lata cancellation overwritea orderhistorik
- att lata recurring affarer ga via vanlig one-off orderlogik

## Fler bindande proof-ledger-regler för specialfall

- `COM-P0013` call-off order under framework agreement
  - state:
    - agreement active
    - call-off order approved

- `COM-P0014` mixed order split owner
  - state:
    - line-level downstream owners set

- `COM-P0015` manual pricing override approved
  - state:
    - review evidence required

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `COM-P0001-P0006`
  - commercial state only

- `COM-P0007`
  - invoice handoff state

- `COM-P0008-P0015`
  - correction, block or override state

## Bindande verifikations-, serie- och exportregler

- detta dokument skapar normalt ingen huvudboksverifikation
- när invoice handoff sker ska fakturaflödet kunna peka tillbaka på:
  - `customer_order_id`
  - `order_line_id`
  - `billing_trigger_decision_id`
  - `order_to_invoice_decision_id`
- blocked cases får inte exporteras som fakturautkast med legal status

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- commitment root
- billing model
- order type
- fulfillment status
- correction profile
- tax profile candidate

## Bindande fixture-klasser för order, offert, avtal och fakturahandoff

- `COM-FXT-001`
  - quote accepted to order, one-time billing

- `COM-FXT-002`
  - framework agreement with call-off order

- `COM-FXT-003`
  - service order with on-delivery billing

- `COM-FXT-004`
  - fixed-price milestone order

- `COM-FXT-005`
  - blocked recurring misuse

## Bindande expected outcome-format per scenario

- scenario id
- fixture class
- commitment root
- billing model
- downstream owner
- billing trigger verdict
- invoice handoff verdict
- blocked reason if any

## Bindande canonical verifikationsseriepolicy

- `none`
  - commercial state only

- `delegated`
  - invoice flow owns voucher series after handoff

## Bindande expected outcome per central scenariofamilj

- `COM-A002`
  - fixture minimum: `COM-FXT-001`
  - expected order status: `approved`
  - expected proof: `COM-P0002`

- `COM-C002`
  - fixture minimum: `COM-FXT-003`
  - expected billing trigger: approved
  - expected invoice handoff: yes
  - expected proof: `COM-P0007`

- `COM-D002`
  - fixture minimum: `COM-FXT-005`
  - expected blocked reason: recurring requires separate truth
  - expected proof: `COM-P0009`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `COM-A001` -> `COM-P0001`
- `COM-A002` -> `COM-P0002`
- `COM-A003` -> `COM-P0003`
- `COM-A004` -> `COM-P0004`
- `COM-B001` -> `COM-P0005`
- `COM-C001` -> `COM-P0006`
- `COM-C002` -> `COM-P0007`
- `COM-D001` -> `COM-P0008`
- `COM-D002` -> `COM-P0009`
- `COM-D003` -> `COM-P0010`
- `COM-D004` -> `COM-P0011`
- `COM-D005` -> `COM-P0012`

## Bindande testkrav

- quote-to-order lineage suite
- agreement-to-order suite
- billing trigger suite
- invoice handoff suite
- pre-invoice cancel suite
- post-handoff cancel suite
- recurring misuse block suite

## Källor som styr dokumentet

- Sveriges riksdag: Lag (1915:218) om avtal och ändra rattshandlingar på förmögenhetsrattens omrade
- Sveriges riksdag: Lag (2002:562) om elektronisk handel och ändra informationssamhallets tjänster
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`

