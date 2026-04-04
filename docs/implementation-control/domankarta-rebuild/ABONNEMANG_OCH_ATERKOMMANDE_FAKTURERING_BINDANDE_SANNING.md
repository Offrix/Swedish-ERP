# ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för abonnemang, renewals, uppsagning, paus, proration och återkommande debitering fram till handoff till fakturaflödet.

Detta dokument ska styra:
- subscriptions
- recurring charge schedules
- term start och term end
- auto-renew och manual renew
- pause, suspension och termination
- proration
- seat-based changes
- usage-based handoff blocker när separat meter truth saknas

Ingen quote/order-skarm, ingen invoicing cron, ingen CRM-renewal-lista och ingen billing batch får definiera avvikande truth för recurring billing utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela subscription-truth utan att gissa:
- när ett abonnemang borjar galla
- när en charge schedule skapas
- hur renewals, pauser och avslut fungerar
- när proration ska ske
- när recurrence får handas till fakturaflödet

## Omfattning

Detta dokument omfattar:
- `SubscriptionAgreement`
- `SubscriptionTerm`
- `RecurringChargeSchedule`
- `RenewalDecision`
- `TerminationDecision`
- `PauseDecision`
- `ProrationDecision`
- `SubscriptionInvoiceHandoffDecision`

Detta dokument omfattar inte:
- fakturans form och issue
- kundreskontra och betalning
- usage meter truth som separat sanningslager
- intäktsavräkning i bokslut

Kanonisk agarskapsregel:
- detta dokument äger recurring commercial truth fram till invoice handoff
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` äger one-off kommersiell rot
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger invoice issue och kundreskontra

## Absoluta principer

- recurrence får aldrig implementeras som dold cronlogik utan subscription root
- renewal får aldrig overwritea gammal term
- proration får aldrig gissas i UI
- paus och suspension är inte samma sak som termination
- usage-based recurrence får aldrig issueas utan separat usage truth
- recurring invoice handoff får aldrig ske utan due schedule row

## Bindande dokumenthierarki för abonnemang och återkommande fakturering

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- Sveriges riksdag: avtalslagen
- Sveriges riksdag: lag om elektronisk handel och ändra informationssamhallets tjänster

Detta dokument lutar på:
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `DOMAIN_18_ROADMAP.md`
- `DOMAIN_18_IMPLEMENTATION_LIBRARY.md`

Detta dokument får inte overstyras av:
- fakturaskapande batchjobb
- fri renewal-flagga i CRM
- UI-only next invoice date

## Kanoniska objekt

- `SubscriptionAgreement`
- `SubscriptionTerm`
- `RecurringChargeSchedule`
- `RenewalDecision`
- `TerminationDecision`
- `PauseDecision`
- `ProrationDecision`
- `SubscriptionInvoiceHandoffDecision`

## Kanoniska state machines

### `SubscriptionAgreement`

- `draft`
- `active`
- `paused`
- `suspended`
- `pending_termination`
- `terminated`
- `expired`

### `SubscriptionTerm`

- `draft`
- `active`
- `completed`
- `renewed`
- `terminated`

### `RecurringChargeSchedule`

- `planned`
- `due`
- `handed_off`
- `cancelled`
- `superseded`

## Kanoniska commands

- `CreateSubscriptionAgreement`
- `ActivateSubscriptionAgreement`
- `CreateRecurringChargeSchedule`
- `ApproveRenewalDecision`
- `ApproveTerminationDecision`
- `ApprovePauseDecision`
- `ApproveProrationDecision`
- `CreateSubscriptionInvoiceHandoffDecision`

## Kanoniska events

- `SubscriptionActivated`
- `RecurringChargeScheduled`
- `RenewalApproved`
- `TerminationApproved`
- `PauseApproved`
- `ProrationApproved`
- `SubscriptionChargeHandedOff`

## Kanoniska route-familjer

- `/v1/commercial/subscriptions/*`
- `/v1/commercial/subscription-terms/*`
- `/v1/commercial/recurring-schedules/*`
- `/v1/commercial/renewals/*`
- `/v1/commercial/terminations/*`
- `/v1/commercial/prorations/*`
- `/v1/commercial/subscription-invoice-handoffs/*`

Folkjande får inte skriva legal truth:
- billing cron
- dashboard next invoice date
- manual spreadsheet renewals

## Kanoniska permissions och review boundaries

- `subscription.read`
- `subscription.manage`
- `subscription.approve`
- `subscription.override`
- `subscription.billing_release`

## Nummer-, serie-, referens- och identitetsregler

- `subscription_agreement_id`
- `subscription_term_id`
- `recurring_charge_schedule_id`
- `renewal_decision_id`
- `termination_decision_id`
- `pause_decision_id`
- `proration_decision_id`
- `subscription_invoice_handoff_decision_id`

## Valuta-, avrundnings- och omräkningsregler

- recurring charge schedule ska spara kommersiell valuta
- proration ska spara canonical proration basis
- same subscription får inte byta valuta mitt i aktiv term utan explicit amendment

## Replay-, correction-, recovery- och cutover-regler

- replay måste kunna återskapa alla schedule rows
- renewal skapar ny term, inte overwrite
- pause och termination får aldrig overwritea gammal billing history
- cutover måste frysa aktiva subscriptions, due rows och future rows separat

## Huvudflödet

1. subscription agreement aktiveras
2. term skapas
3. recurring charge schedule materialiseras
4. renewal, pause, proration eller termination kan ändra framtida rows
5. due row skapar invoice handoff
6. fakturaflödet tar över

## Bindande scenarioaxlar

- billing cadence
  - `monthly`
  - `quarterly`
  - `yearly`
  - `custom`

- billing timing
  - `in_advance`
  - `in_arrears`

- price model
  - `fixed`
  - `seat_based`
  - `usage_based_blocked_without_meter_truth`
  - `minimum_plus_overage`

- change profile
  - `renewal`
  - `pause`
  - `termination`
  - `proration`
  - `seat_change`

## Bindande policykartor

### cadence policy

- every active term must materialize exact schedule rows

### proration policy

- must use explicit proration basis:
  - `calendar_day`
  - `service_day`
  - `period_fraction`

### renewal policy

- `auto_renew`
- `manual_renew`
- `no_renew`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `SUB-P0001` subscription activated
  - state:
    - `SubscriptionAgreement=active`
  - no_gl

- `SUB-P0002` recurring schedule created
  - state:
    - future rows planned
  - no_gl

- `SUB-P0003` due row handed off to invoice
  - state:
    - `RecurringChargeSchedule=handed_off`
    - downstream owner `FAKTURAFLODET...`

- `SUB-P0004` renewal approved
  - state:
    - new term created

- `SUB-P0005` pause approved
  - state:
    - future rows paused or superseded

- `SUB-P0006` termination approved
  - state:
    - future rows cancelled

- `SUB-P0007` proration approved
  - state:
    - replacement rows created

- `SUB-P0008` blocked usage-based without meter truth
  - state:
    - blocked

- `SUB-P0009` blocked due row without active term
  - state:
    - blocked

## Bindande rapport-, export- och myndighetsmappning

- active subscription report
- due recurring charges report
- paused subscriptions report
- terminated subscriptions report
- renewal pipeline report

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SUB-A001` activate subscription -> `SUB-P0001`
- `SUB-A002` create recurring rows -> `SUB-P0002`
- `SUB-B001` due row to invoice -> `SUB-P0003`
- `SUB-C001` renewal -> `SUB-P0004`
- `SUB-C002` pause -> `SUB-P0005`
- `SUB-C003` terminate -> `SUB-P0006`
- `SUB-C004` proration -> `SUB-P0007`
- `SUB-D001` usage blocked -> `SUB-P0008`
- `SUB-D002` due row blocked -> `SUB-P0009`

## Tvingande dokument- eller indataregler

- cadence
- billing timing
- start date
- end or renewal profile
- pricing basis
- tax profile candidate
- proration basis if proration allowed

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AUTO_RENEW`
- `MANUAL_RENEW`
- `NO_RENEW`
- `PAUSE_APPROVED`
- `TERMINATION_APPROVED`
- `PRORATION_APPROVED`
- `USAGE_REQUIRES_METER_TRUTH`

## Bindande faltspec eller inputspec per profil

### fixed recurring

- start date
- cadence
- timing
- fixed amount

### seat based

- seat count
- change effective date
- proration policy

### usage based

- meter source ref
- blocked if meter source missing

## Scenariofamiljer som hela systemet måste tacka

- monthly in advance
- yearly in advance
- yearly in arrears
- seat increase mid-cycle
- seat decrease next-cycle
- auto renewal
- manual renewal
- pause
- termination at term end
- immediate termination
- proration
- usage blocked without meter truth

## Scenarioregler per familj

- due recurring row får inte issueas mer an en gang
- seat change får aldrig overwritea historical charged row
- immediate termination får bara paverka future unissued rows eller skapa correction path
- auto renewal får skapa ny term men aldrig mutera gammal

## Blockerande valideringar

- missing cadence
- missing billing timing
- due row without active term
- usage-based without meter truth
- proration without proration basis
- invoice handoff duplicate

## Rapport- och exportkonsekvenser

- each due row must be auditable
- blocked rows go to audit not invoice queue
- handoff rows must preserve pricing snapshot

## Förbjudna förenklingar

- hidden invoice cron without schedule row
- next invoice date without immutable row
- recurring misuse via one-off order path
- overwriting historical renewal or termination

## Fler bindande proof-ledger-regler för specialfall

- `SUB-P0010` seat increase proration row
  - state:
    - additional row created

- `SUB-P0011` seat decrease next-cycle only
  - state:
    - current cycle unchanged
    - future row reduced

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `SUB-P0001-P0002`
  - subscription state only

- `SUB-P0003`
  - invoice handoff state

- `SUB-P0004-P0011`
  - renewal, pause, termination or proration state

## Bindande verifikations-, serie- och exportregler

- detta dokument skapar normalt ingen huvudboksverifikation
- invoice handoff måste peka på subscription ids och schedule row ids

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- cadence
- timing
- price model
- change profile
- tax profile candidate

## Bindande fixture-klasser för abonnemang och återkommande fakturering

- `SUB-FXT-001`
  - monthly fixed in advance

- `SUB-FXT-002`
  - yearly auto-renew

- `SUB-FXT-003`
  - seat-based with proration

- `SUB-FXT-004`
  - usage based blocked

## Bindande expected outcome-format per scenario

- scenario id
- fixture class
- cadence
- timing
- price model
- schedule outcome
- invoice handoff outcome
- blocked reason if any

## Bindande canonical verifikationsseriepolicy

- `none`
- `delegated`

## Bindande expected outcome per central scenariofamilj

- `SUB-B001`
  - fixture minimum: `SUB-FXT-001`
  - expected schedule state: `handed_off`
  - expected proof: `SUB-P0003`

- `SUB-C004`
  - fixture minimum: `SUB-FXT-003`
  - expected replacement rows: yes
  - expected proof: `SUB-P0007`

- `SUB-D001`
  - fixture minimum: `SUB-FXT-004`
  - expected blocked reason: meter truth missing
  - expected proof: `SUB-P0008`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SUB-A001` -> `SUB-P0001`
- `SUB-A002` -> `SUB-P0002`
- `SUB-B001` -> `SUB-P0003`
- `SUB-C001` -> `SUB-P0004`
- `SUB-C002` -> `SUB-P0005`
- `SUB-C003` -> `SUB-P0006`
- `SUB-C004` -> `SUB-P0007`
- `SUB-D001` -> `SUB-P0008`
- `SUB-D002` -> `SUB-P0009`

## Bindande testkrav

- recurring row generation suite
- renewal suite
- pause suite
- termination suite
- proration suite
- duplicate handoff suite
- usage-block suite

## Källor som styr dokumentet

- Sveriges riksdag: Lag (1915:218) om avtal och ändra rattshandlingar på förmögenhetsrattens omrade
- Sveriges riksdag: Lag (2002:562) om elektronisk handel och ändra informationssamhallets tjänster
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`

