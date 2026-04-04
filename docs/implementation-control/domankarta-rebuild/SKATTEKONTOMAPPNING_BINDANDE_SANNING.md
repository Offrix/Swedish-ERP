# SKATTEKONTOMAPPNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för skattekontomappning mellan canonical authority events, `1630`-mirror, clearingkonton och nedstromsflöden som genererar eller stanger skatteskulder och skattefordringar.

## Syfte

Detta dokument ska låsa:
- exakt vilka canonical tax-account event classes som får mappas till vilka huvudbokskonton
- exakt när `1630` ska öppnas, stangas eller bara fa state-effekt
- exakt vilka owner flows som får skapa skattekontoeffekt
- exakt hur HUS-, grön-teknik-, moms-, AGI- och F-skattsposter ska speglas när de materialiseras på skattekontot
- exakt vilka avvikelser som ska blockeras i stallet för att bokas manuellt

## Omfattning

Detta dokument omfattar:
- tax-account mapping policy för `1630`
- clearing och settlement mot moms, arbetsgivaravgifter, personalskatt, preliminar F-skatt, slutlig skatt, ränta, anstånd och statliga claim-offsets
- authority-event-klassning, lineupplosning och blocked unknown handling
- mapping lineage till rapporter, huvudbok, SIE4 och audit

Detta dokument omfattar inte:
- hela skattekontoflödets import-, receipt- och reconciliation-process, vilket ägs av `SKATTEKONTOFLODET_BINDANDE_SANNING.md`
- bankstatementimport, vilket ägs av `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`
- själva bokföringskarnans voucherlivscykel, vilket ägs av `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`

## Absoluta principer

- `1630` är enda canonical balance account för legal skattekonto mirror
- varje skattekontoeffekt måste peka på en explicit authority event class eller explicit state-payout-offset-event
- skattekontot får aldrig speglas via open banking eller annan bankheuristik
- okand myndighetshandelse får aldrig bokas automatiskt
- samma authority event får aldrig materialiseras två ganger i huvudboken
- HUS- och grön-teknik-offset mot skattekontot är tillåtna bara med explicit beslutslinje och claim-lineage
- ränta, anstånd, återbetalning och utbetalningsspärr får aldrig approximera moms- eller löneflödens skuldstatus

## Bindande dokumenthierarki för skattekontomappning

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_06_ROADMAP.md`
- `DOMAIN_06_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md`
- `MOMSFLODET_BINDANDE_SANNING.md`
- `AGI_FLODET_BINDANDE_SANNING.md`
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md`
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md`
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`

## Kanoniska objekt

- `TaxAccountMappingPolicy`
- `TaxAccountOwnerBinding`
- `TaxAuthorityEventClass`
- `TaxAccountMirrorPosting`
- `TaxOffsetDecisionLink`
- `TaxAccountMappingBlocker`

## Kanoniska state machines

- `TaxAccountMappingPolicy: draft -> approved -> active | superseded | retired`
- `TaxAccountOwnerBinding: proposed -> resolved | blocked | superseded`
- `TaxAccountMirrorPosting: draft -> posted | blocked | reversed`
- `TaxAccountMappingBlocker: open -> resolved | waived`

## Kanoniska commands

- `PublishTaxAccountMappingPolicy`
- `ResolveTaxAccountOwnerBinding`
- `CreateTaxAccountMirrorPosting`
- `ReverseTaxAccountMirrorPosting`
- `BlockUnknownTaxAccountMapping`
- `LinkTaxOffsetDecision`

## Kanoniska events

- `TaxAccountMappingPolicyPublished`
- `TaxAccountOwnerBindingResolved`
- `TaxAccountMirrorPostingCreated`
- `TaxAccountMirrorPostingReversed`
- `TaxAccountMappingBlocked`
- `TaxOffsetDecisionLinked`

## Kanoniska route-familjer

- `POST /v1/tax-account/mapping-policies`
- `POST /v1/tax-account/owner-bindings/resolve`
- `POST /v1/tax-account/mirror-postings`
- `POST /v1/tax-account/mirror-postings/{id}/reverse`
- `POST /v1/tax-account/offset-links`
- `POST /v1/tax-account/mapping-blockers`

## Kanoniska permissions och review boundaries

- `tax_account.mapping.read`
- `tax_account.mapping.publish`
- `tax_account.mirror.post`
- `tax_account.mirror.reverse`
- `tax_account.high_risk_adjustment`
- `tax_account.audit`

Support och backoffice får inte:
- skapa ny owner binding utan authority evidence
- manuellt flytta belopp mellan `1630` och clearingkonto utan blockerad correction chain
- overstyra HUS- eller grön-teknik-offset utan decision lineage

## Nummer-, serie-, referens- och identitetsregler

- varje mapping policy ska ha `SKTMAP-POL-NNN`
- varje authority event class ska ha stabil `SKTMAP-EVT-NNN`
- varje mirror posting ska ha `SKTMAP-MIR-NNN`
- varje offset link ska ha `SKTMAP-OFF-NNN`
- varje posting måste lagra authority transaction id eller state-claim decision id

## Valuta-, avrundnings- och omräkningsregler

- skattekontot är SEK-only i legal truth
- alla mirror postings mot `1630` ska bokas i ore-exakt SEK
- inga valutakursdifferenser får uppsta i detta dokument; de måste uppsta i upstream flow enligt `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md`

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig skapa ny posting om samma authority transaction eller decision link redan materialiserats
- correction får bara ske via ny authority event, reversal posting eller explicit correction lineage
- recovery får återbygga mappings och drilldown men får inte skapa ny monetar effekt
- migration måste bevara authority ids, decision refs, `1630` balance lineage och offset receipts

## Huvudflödet

1. authority event eller state-offset-decision importeras eller mottas
2. eventet klassificeras till canonical owner flow
3. mapping policy resolves
4. explicit proof-ledger-val gör att mirror posting skapas eller blockeras
5. `1630` och motkonto uppdateras deterministiskt
6. rapport-, export- och reconciliation lineage skrivs
7. correction, reversal eller recovery använder samma lineage

## Bindande scenarioaxlar

- source: `bank_payment`, `authority_debit`, `authority_credit`, `interest`, `respite`, `offset`, `refund`, `unknown`
- owner: `vat`, `withheld_tax`, `employer_contributions`, `preliminary_tax`, `final_tax`, `hus_claim`, `green_tech_claim`, `interest`, `respite`, `unknown`
- direction: `to_tax_account`, `from_tax_account`, `non_monetary_state`
- lineage class: `original`, `replacement`, `correction`, `migration`
- settlement mode: `bank`, `offset_1630`, `state_only`

## Bindande policykartor

- `SKTMAP-POL-001 authority_event_to_owner`
- `SKTMAP-POL-002 owner_to_gl_accounts`
- `SKTMAP-POL-003 state_offset_to_receivable_account`
- `SKTMAP-POL-004 blocked_unknown_mapping`
- `SKTMAP-POL-005 correction_and_reversal_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### SKTMAP-P0001 Bank payment into tax account
- debet `1630`
- kredit `1930`
- owner: `bank_payment`

### SKTMAP-P0002 VAT liability materialized on tax account
- debet `2650`
- kredit `1630`
- owner: `vat`

### SKTMAP-P0003 VAT refund materialized on tax account
- debet `1630`
- kredit `2650`
- owner: `vat`

### SKTMAP-P0004 Withheld tax materialized on tax account
- debet `2710`
- kredit `1630`
- owner: `withheld_tax`

### SKTMAP-P0005 Employer contributions materialized on tax account
- debet `2731`
- kredit `1630`
- owner: `employer_contributions`

### SKTMAP-P0006 Debited preliminary F-tax
- debet `2518`
- kredit `1630`
- owner: `preliminary_tax`

### SKTMAP-P0007 Final tax debit
- debet `2510`
- kredit `1630`
- owner: `final_tax`

### SKTMAP-P0008 Final tax refund
- debet `1630`
- kredit `2510`
- owner: `final_tax`

### SKTMAP-P0009 Interest income on tax account
- debet `1630`
- kredit `8314`
- owner: `interest_income`

### SKTMAP-P0010 Interest expense on tax account
- debet `8423`
- kredit `1630`
- owner: `interest_expense`

### SKTMAP-P0011 Gränted respite
- debet `1630`
- kredit `2852`
- owner: `respite`

### SKTMAP-P0012 Repayment or reversal of respite
- debet `2852`
- kredit `1630`
- owner: `respite`

### SKTMAP-P0013 Tax-account refund to bank
- debet `1930`
- kredit `1630`
- owner: `refund`

### SKTMAP-P0014 HUS state payout offset against tax-account debt
- debet `1630`
- kredit `1513`
- owner: `hus_claim_offset`

### SKTMAP-P0015 Green-tech payout offset against tax-account debt
- debet `1630`
- kredit `1513`
- owner: `green_tech_claim_offset`

### SKTMAP-P0016 Payout block or non-monetary authority state
- no GL posting
- state effect only
- owner: `authority_state_only`

### SKTMAP-P0017 Unknown authority event
- no GL posting
- blocked review
- owner: `unknown`

## Bindande rapport-, export- och myndighetsmappning

- skattekontodrilldown ska visa authority event class, owner flow, posting id och source receipt
- huvudbok och SIE4 ska visa faktisk `1630`-mirror samt motkonto enligt proof-ledger
- HUS och grön teknik ska visa om claim stangdes via bankutbetalning eller `1630`-offset

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SKTMAP-A001` bank payment -> `SKTMAP-P0001`
- `SKTMAP-A002` VAT debit -> `SKTMAP-P0002`
- `SKTMAP-A003` VAT refund -> `SKTMAP-P0003`
- `SKTMAP-A004` withheld tax debit -> `SKTMAP-P0004`
- `SKTMAP-A005` employer contribution debit -> `SKTMAP-P0005`
- `SKTMAP-A006` preliminary tax debit -> `SKTMAP-P0006`
- `SKTMAP-A007` final tax debit -> `SKTMAP-P0007`
- `SKTMAP-A008` final tax refund -> `SKTMAP-P0008`
- `SKTMAP-B001` interest income -> `SKTMAP-P0009`
- `SKTMAP-B002` interest expense -> `SKTMAP-P0010`
- `SKTMAP-B003` respite gränted -> `SKTMAP-P0011`
- `SKTMAP-B004` respite reversed or repaid -> `SKTMAP-P0012`
- `SKTMAP-B005` tax-account refund to bank -> `SKTMAP-P0013`
- `SKTMAP-C001` HUS offset against tax debt -> `SKTMAP-P0014`
- `SKTMAP-C002` green-tech offset against tax debt -> `SKTMAP-P0015`
- `SKTMAP-Z001` payout block state -> `SKTMAP-P0016`
- `SKTMAP-Z002` unknown authority event -> `SKTMAP-P0017`

## Tvingande dokument- eller indataregler

- authority event måste minst ge event date, amount, sign, balance after, source text eller type code och extern identity
- HUS- eller grön-teknik-offset måste ha claim decision ref och matching claim receivable
- respite måste ha decision id, covered tax class och valid period

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SKTMAP-R001 bank_payment_to_tax_account`
- `SKTMAP-R002 authority_vat_debit`
- `SKTMAP-R003 authority_withheld_tax_debit`
- `SKTMAP-R004 authority_employer_contribution_debit`
- `SKTMAP-R005 authority_preliminary_tax_debit`
- `SKTMAP-R006 authority_final_tax_settlement`
- `SKTMAP-R007 authority_interest_income`
- `SKTMAP-R008 authority_interest_expense`
- `SKTMAP-R009 authority_respite`
- `SKTMAP-R010 state_claim_offset`
- `SKTMAP-R011 unknown_authority_event`

## Bindande faltspec eller inputspec per profil

- mapping policy: `policy_id`, `event_class`, `owner_flow`, `debit_account`, `credit_account`, `state_only`
- owner binding: `authority_event_id`, `owner_flow`, `owner_receipt_ref`, `resolution_reason`
- offset link: `decision_ref`, `claim_flow`, `claim_receivable_account`, `offset_amount`

## Scenariofamiljer som hela systemet måste tacka

- VAT debit and refund
- payroll tax and employer contribution debit
- preliminary and final tax settlement
- interest income and expense
- respite
- bank refunds and deposits
- HUS and green-tech tax-account offsets
- unknown authority events

## Scenarioregler per familj

- VAT owner får bara använda `2650` mot `1630`
- payroll tax och arbetsgivaravgifter får bara använda `2710` respektive `2731`
- HUS och grön teknik får bara stanga `1513` via `1630` när explicit offset receipt finns
- okand authority event får aldrig auto-bokas

## Blockerande valideringar

- posting blocked om owner flow inte kan resolvas
- posting blocked om `1630` inte är ena sidan av skattekontomappningen
- posting blocked om HUS/grön-offset saknar state decision ref
- posting blocked om authority transaction identity redan materialiserats

## Rapport- och exportkonsekvenser

- `1630` drilldown måste kunna filtreras per owner flow
- SIE4-export måste visa faktisk motkontoeffekt, inte bara nettosaldo
- skattekontorapport måste kunna skilja bankbetalning, myndighetsdebitering och claim-offset

## Förbjudna förenklingar

- bank sync som substitut för authority events
- fri manuell journal direkt på `1630` utan mapping policy och double review
- sammanslagning av HUS och grön teknik till generisk state claim
- generiskt `tax expense`-konto i stallet för specificerad skuld- eller clearinglogik

## Fler bindande proof-ledger-regler för specialfall

- `SKTMAP-P0018` corrected VAT replacement keeps same owner class and creates reversal or supplemental mirror via lineage
- `SKTMAP-P0019` migrated historical authority event keeps original date and imported source ref
- `SKTMAP-P0020` payout block removal is state-only and may not create balancing voucher

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `SKTMAP-P0001-P0013` uppdaterar `TaxAccountMirrorBalance`
- `SKTMAP-P0014-P0015` stanger state claim open item i HUS/grön-teknikflow
- `SKTMAP-P0016` uppdaterar bara authority state
- `SKTMAP-P0017` skapar `TaxAccountMappingBlocker`

## Bindande verifikations-, serie- och exportregler

- skattekontoowned vouchers ska använda serie `E`
- HUS och grön-offset som materialiseras via skattekonto ska fortfarande exporteras med serie `E` men bevara claim flow lineage
- state-only events ska inte skapa verifikation men ska exporteras som audit/state receipt när relevant

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- owner x direction
- owner x decision type
- original x correction x migration
- bank payout x tax-offset x state-only

## Bindande fixture-klasser för skattekontomappning

- `SKTMAP-FXT-001` VAT and payroll debits
- `SKTMAP-FXT-002` preliminary and final tax
- `SKTMAP-FXT-003` interest and respite
- `SKTMAP-FXT-004` HUS and green-tax offsets
- `SKTMAP-FXT-005` unknown or blocked events

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `authority_event_class`
- `owner_flow`
- `expected_gl_lines[]`
- `expected_series`
- `expected_state_effect`
- `expected_export_effect`
- `expected_blocker_or_success`

## Bindande canonical verifikationsseriepolicy

- serie `E` är obligatorisk för alla monetara skattekonto-mirror postings
- serie `D` får inte användas för ordinary authority-driven tax-account materialization
- catch-all serie för tax account är förbjuden

## Bindande expected outcome per central scenariofamilj

### `SKTMAP-A002`

- fixture: `SKTMAP-FXT-001`
- expected:
  - `2650/1630`
  - owner `vat`
  - serie `E`
  - VAT liability closed against tax-account mirror

### `SKTMAP-A005`

- fixture: `SKTMAP-FXT-001`
- expected:
  - `2731/1630`
  - owner `employer_contributions`
  - serie `E`
  - payroll liability reduced by authority debit

### `SKTMAP-C001`

- fixture: `SKTMAP-FXT-004`
- expected:
  - `1630/1513`
  - owner `hus_claim_offset`
  - serie `E`
  - HUS claim receivable closed without bank cash

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SKTMAP-A001` -> `SKTMAP-P0001` -> `1630/1930` -> tax account funded
- `SKTMAP-A002` -> `SKTMAP-P0002` -> `2650/1630` -> VAT debt cleared to tax account
- `SKTMAP-A003` -> `SKTMAP-P0003` -> `1630/2650` -> VAT refund mirrored
- `SKTMAP-A004` -> `SKTMAP-P0004` -> `2710/1630` -> withheld tax cleared
- `SKTMAP-A005` -> `SKTMAP-P0005` -> `2731/1630` -> employer contributions cleared
- `SKTMAP-A006` -> `SKTMAP-P0006` -> `2518/1630` -> preliminary tax mirrored
- `SKTMAP-A007` -> `SKTMAP-P0007` -> `2510/1630` -> final tax debt mirrored
- `SKTMAP-A008` -> `SKTMAP-P0008` -> `1630/2510` -> final tax refund mirrored
- `SKTMAP-B001` -> `SKTMAP-P0009` -> `1630/8314` -> interest income mirrored
- `SKTMAP-B002` -> `SKTMAP-P0010` -> `8423/1630` -> interest expense mirrored
- `SKTMAP-B003` -> `SKTMAP-P0011` -> `1630/2852` -> respite liability opened
- `SKTMAP-B004` -> `SKTMAP-P0012` -> `2852/1630` -> respite closed
- `SKTMAP-B005` -> `SKTMAP-P0013` -> `1930/1630` -> refund to bank
- `SKTMAP-C001` -> `SKTMAP-P0014` -> `1630/1513` -> HUS offset
- `SKTMAP-C002` -> `SKTMAP-P0015` -> `1630/1513` -> green-tech offset
- `SKTMAP-Z001` -> `SKTMAP-P0016` -> state only -> payout block stored
- `SKTMAP-Z002` -> `SKTMAP-P0017` -> blocked -> review required

## Bindande testkrav

- unit tests för every owner flow to account mapping
- unit tests för duplicate authority-event blocking
- integration tests för VAT, AGI, HUS and green-tech offsets into `1630`
- migration tests proving preserved authority ids and no duplicate materialization
- report/export tests proving `1630` drilldown parity with owner-flow receipts

## Källor som styr dokumentet

- [Skatteverket: Skattekonto](https://www.skatteverket.se/privat/skatter/skattekontobetalaochfatillbaka/skattekonto.4.18e1b10334ebe8bc8000565.html)
- [Skatteverket: Bokföra slutlig skatt, F-skatt, moms och arbetsgivaravgifter](https://www.skatteverket.se/foretag/drivaforetag/bokforing/bokforabokslutdeklarationocharsredovisning/bokforafskattarsskattmomsocharbetsgivaravgifter.4.361dc8c15312eff6fd235d1.html)
- [BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [Skatteverket: ROT och RUT](https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut.4.2ef18e6a125660db8b080002674.html)
- [Skatteverket: Grön teknik](https://www.skatteverket.se/foretag/skatterochavdrag/gronteknik.4.676f4884175c97df4192a42.html)
