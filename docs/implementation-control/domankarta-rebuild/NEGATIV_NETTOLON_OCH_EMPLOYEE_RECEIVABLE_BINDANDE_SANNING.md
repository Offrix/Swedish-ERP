# NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för negativ nettolön, employee receivable, payroll-baserad återhamtning av fordran mot anställd och blockerregler för olaglig eller oklar kvittning.

Detta dokument ska styra:
- skapande av employee receivable när nettolön annars blir negativ
- skillnad mellan generisk negativ nettolön och specifika förskotts-/lanetyper
- återhamtning i framtida payroll
- bankinbetalning från anställd
- blockerad kvittning när legal grund eller medgivande saknas
- kvarstaende fordran vid avslutad anstallning

## Syfte

Detta dokument finns för att:
- systemet aldrig ska försöka göra negativ bankutbetalning
- underskott i pay run alltid ska overga till kontrollerad fordran i stallet för att forsvinna
- payroll inte ska kvitta arbetsgivarens fordran mot lön utan laglig grund
- receivable-typer ska skiljas at mellan reseforskott, kassaforskott, tillfalligt lan och övrig negativ nettolön

## Omfattning

Detta dokument omfattar:
- generisk negativ nettolön
- employee receivable carry-forward
- payroll-baserad receivable settlement
- extern bankåterbetalning från anställd
- blockering av otillaten kvittning
- avslutad anstallning med kvarstaende receivable

Detta dokument omfattar inte:
- frivilliga nettolonedrag som inte skapar underskott
- myndighetsavdrag
- write-off utanför uttrycklig approverad process
- civilrattslig inkasso- eller domstolsprocess efter att payroll slutat vara rätt verktyg

## Absoluta principer

- negativ nettolön får aldrig ge negativ payout
- om nettot blir mindre an noll ska canonical receivable skapas
- generisk negativ nettolön ska defaulta till konto `1619`
- reseforskott, kassaforskott och tillfalligt lan ska behalla sina egna receivable-konton `1611`, `1612` och `1614`
- payroll-baserad återhamtning får bara ske när legal kvittningsgrund eller dokumenterat medgivande finns
- receivable får aldrig bokas som myndighetsskuld, kostnad eller dold manuell differens
- write-off av employee receivable får aldrig ske utan egen godkänd process

## Bindande dokumenthierarki för negativ nettolön och employee receivable

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md`
- lag (1970:215) om arbetsgivares kvittningsratt

## Kanoniska objekt

- `NegativeNetPayCase`
- `EmployeeReceivable`
- `ReceivableTypeDecision`
- `PayrollReceivableSettlementDecision`
- `EmployeeRepaymentReceipt`
- `ReceivableBlocker`
- `ReceivableClosureDecision`

## Kanoniska state machines

### `NegativeNetPayCase`

- `draft`
- `calculated`
- `receivable_created`
- `under_recovery`
- `closed`
- `blocked`

### `EmployeeReceivable`

- `open`
- `partially_settled`
- `settled`
- `disputed`
- `blocked`
- `writeoff_pending`

### `PayrollReceivableSettlementDecision`

- `draft`
- `review_pending`
- `approved`
- `executed`
- `blocked`

## Kanoniska commands

- `CreateNegativeNetPayCase`
- `CreateEmployeeReceivable`
- `ResolveReceivableTypeDecision`
- `ApprovePayrollReceivableSettlement`
- `RegisterEmployeeRepaymentReceipt`
- `CloseEmployeeReceivable`
- `BlockReceivableRecovery`

## Kanoniska events

- `NegativeNetPayCaseCreated`
- `EmployeeReceivableCreated`
- `ReceivableTypeDecisionResolved`
- `PayrollReceivableSettlementApproved`
- `EmployeeRepaymentReceiptRegistered`
- `EmployeeReceivableClosed`
- `ReceivableRecoveryBlocked`

## Kanoniska route-familjer

- `POST /v1/payroll/negative-net/cases`
- `POST /v1/payroll/employee-receivables`
- `POST /v1/payroll/employee-receivables/{id}/approve-settlement`
- `POST /v1/payroll/employee-receivables/{id}/register-repayment`
- `POST /v1/payroll/employee-receivables/{id}/block`

## Kanoniska permissions och review boundaries

- endast verifierad payroll- eller finance-roll får approvera payroll-settlement av receivable
- support får inte omklassificera receivabletyp utan review
- write-off eller legal-collection handoff får inte ske i samma beslut som skapande av receivable

## Nummer-, serie-, referens- och identitetsregler

- varje `NegativeNetPayCase` ska ha unikt `negativeNetCaseId`
- varje receivable ska ha unikt `employeeReceivableId`
- receivable ska peka på ursprunglig pay run och anställd
- varje settlement ska peka på exakt receivable och exakt pay run

## Valuta-, avrundnings- och omräkningsregler

- employee receivable ska alltid uttryckas i SEK
- settlement i payroll får aldrig rundas upp över kvarvarande receivable
- extern bankinbetalning ska registreras på faktisk inkommen summa

## Replay-, correction-, recovery- och cutover-regler

- replay av pay run ska reproducera samma negativa net case
- retroaktiv correction får skapa ny receivable delta men får inte skriva om tidigare settlement history
- migration måste landa öppet receivable, historiska settlements och extern bankåterbetalning separat
- cutover får inte nollstalla receivable aging eller kvarvarande saldo

## Huvudflödet

1. pay run beräknas
2. nettot blir negativt efter skatt, avdrag och ändra beslut
3. systemet skapar `NegativeNetPayCase`
4. receivabletyp faststalls
5. canonical `EmployeeReceivable` skapas
6. payout till anställd blir noll
7. framtida återhamtning sker via lawful settlement eller extern bankåterbetalning

## Bindande scenarioaxlar

- receivable type: `generic_negative_net`, `travel_advance`, `cash_advance`, `temporary_loan`
- recovery mode: `future_payroll_offset`, `bank_repayment`, `blocked`
- legal basis: `clear_setoff_right`, `employee_consent`, `missing_or_unclear`
- employment status: `active`, `terminating`, `terminated`
- severity: `single_period`, `multi_period`, `disputed`

## Bindande policykartor

- generic receivable account: `1619`
- travel advance account: `1611`
- cash advance account: `1612`
- temporary loan account: `1614`
- payroll liability anchor: `2821`
- bank repayment cash account: `1930`
- unsupported automatic set-off: `blocked`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### NNP-P0001 Create generic negative-net receivable

- debit `1619`
- credit `2821`
- payoutAmount: `0`
- receivableType: `generic_negative_net`

### NNP-P0002 Settle generic employee receivable via future payroll

- payItemCode: `LAK-F005`
- debit `2821`
- credit `1619`
- requiresSettlementApproval: `true`

### NNP-P0003 Settle travel advance via future payroll

- payItemCode: `LAK-F006`
- debit `2821`
- credit `1611`

### NNP-P0004 Settle cash advance via future payroll

- payItemCode: `LAK-F007`
- debit `2821`
- credit `1612`

### NNP-P0005 Settle temporary loan via future payroll

- payItemCode: `LAK-F008`
- debit `2821`
- credit `1614`

### NNP-P0006 Employee bank repayment

- debit `1930`
- credit `1619`
- externalRepayment: `true`

### NNP-P0007 Blocked illegal or unclear payroll set-off

- payrollEffect: `blocked`
- blockCode: `illegal_or_unclear_setoff`

## Bindande rapport-, export- och myndighetsmappning

- payslip får visa recovery line endast när settlement godkants
- negativ nettolön ska exponeras i payroll audit som receivable creation, inte som felaktig payout
- extern bankåterbetalning ska kunna exporteras till bankavstämning som employee repayment

## Bindande scenariofamilj till proof-ledger och rapportspar

- `NNP-A001 generic_negative_net_created -> NNP-P0001 -> receivable_opened`
- `NNP-A002 generic_receivable_settled_in_future_payroll -> NNP-P0002 -> receivable_reduced`
- `NNP-A003 travel_advance_recovered -> NNP-P0003 -> receivable_reduced`
- `NNP-A004 cash_advance_recovered -> NNP-P0004 -> receivable_reduced`
- `NNP-A005 temporary_loan_recovered -> NNP-P0005 -> receivable_reduced`
- `NNP-B001 employee_bank_repayment -> NNP-P0006 -> receivable_reduced`
- `NNP-Z001 unclear_or_illegal_setoff -> NNP-P0007 -> blocked`

## Tvingande dokument- eller indataregler

- `employeeId`
- `payRunId`
- `grossNetCalculationRef`
- `receivableType`
- `remainingAmount`
- `legalBasisCode`
- `settlementConsentRef`
- `repaymentReceiptRef`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `NNP-R001 generic_negative_net`
- `NNP-R002 future_payroll_offset_clear_setoff`
- `NNP-R003 future_payroll_offset_employee_consent`
- `NNP-R004 bank_repayment_employee`
- `NNP-R005 unclear_or_illegal_setoff_block`

## Bindande faltspec eller inputspec per profil

- `employeeReceivableId`
- `employeeId`
- `originPayRunId`
- `receivableType`
- `originAmount`
- `remainingAmount`
- `createdAt`
- `legalBasisCode`
- `consentOrDecisionRef`
- `status`

## Scenariofamiljer som hela systemet måste tacka

- generisk negativ nettolön
- framtida payroll-recovery
- recovery av reseforskott
- recovery av kassaforskott
- recovery av tillfalligt lan
- bankåterbetalning
- avslutad anstallning med öppen receivable
- oklar eller otillaten kvittning

## Scenarioregler per familj

- `NNP-A001`: negativ nettolön ska skapa receivable och noll payout
- `NNP-A002`: framtida recovery ska bara utforas efter verifierad legal grund eller dokumenterat medgivande
- `NNP-A003-A005`: specifik receivabletyp ska styra konto och recovery-line
- `NNP-B001`: extern bankåterbetalning ska minska receivable utan ny payroll line
- `NNP-Z001`: oklar kvittning ska blockeras och receivable ska ligga öppen

## Blockerande valideringar

- deny negative cash payout
- deny payroll set-off om legal basis eller consent saknas
- deny use of `1619` när receivabletyp är reseforskott, kassaforskott eller tillfalligt lan
- deny automatic write-off without explicit approved process
- deny recovery amount över remaining receivable

## Rapport- och exportkonsekvenser

- receivable aging ska kunna rapporteras per anställd
- payroll export ska visa skapad eller reglerad receivable separat från vanliga nettodrag
- bankimport ska kunna matcha mot `EmployeeRepaymentReceipt`

## Förbjudna förenklingar

- ingen negativ utbetalning
- ingen tyst bortbokning av underskott
- ingen automatisk kvittning utan legal grund
- ingen sammanblandning av generisk negativ nettolön med reseforskott eller lan

## Fler bindande proof-ledger-regler för specialfall

- terminated employee med öppen receivable ska flyttas till fortsatt öppen receivable, inte tvingas genom sista payroll
- disputed receivable ska blockera ytterligare auto-settlement
- receivable som uppstöd på grund av myndighetsavdrag får inte recoveras genom myndighetsflödet

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `NNP-P0001` öppnar `EmployeeReceivable`
- `NNP-P0002-NNP-P0005` minskar kvarvarande saldo
- `NNP-P0006` minskar kvarvarande saldo via bank
- `NNP-P0007` skapar blockerfall utan settlement

## Bindande verifikations-, serie- och exportregler

- skapande av receivable ska journaliseras i payroll-voucher series
- extern bankåterbetalning ska journaliseras i bank settlement series
- varje settlement ska traced till ursprungligt `employeeReceivableId`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- active vs terminated employment
- clear setoff right vs employee consent vs missing legal basis
- generic negative net vs specific advance/loan
- payroll settlement vs bank repayment

## Bindande fixture-klasser för negativ nettolön och receivable

- `NNP-FXT-001` correction creates negative net
- `NNP-FXT-002` final pay with remaining debt
- `NNP-FXT-003` travel advance exceeds net pay
- `NNP-FXT-004` employee bank repays open receivable
- `NNP-FXT-005` settlement attempt without legal basis

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedReceivableAccount`
- `expectedRemainingAmount`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- receivable creation and payroll-settlement ska ligga i payroll series
- bank repayment ska ligga i bank settlement series
- write-off får inte ske i samma serie utan separat godkänd process

## Bindande expected outcome per central scenariofamilj

### `NNP-A001`

- fixture minimum: `NNP-FXT-001`
- expected proof-ledger: `NNP-P0001`
- expected receivable account: `1619`
- expected status: `allowed`

### `NNP-A003`

- fixture minimum: `NNP-FXT-003`
- expected proof-ledger: `NNP-P0003`
- expected receivable account: `1611`
- expected status: `allowed`

### `NNP-Z001`

- fixture minimum: `NNP-FXT-005`
- expected proof-ledger: `NNP-P0007`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `NNP-A001 -> NNP-P0001 -> allowed`
- `NNP-A002 -> NNP-P0002 -> allowed_if_legal_basis`
- `NNP-A003 -> NNP-P0003 -> allowed`
- `NNP-A004 -> NNP-P0004 -> allowed`
- `NNP-A005 -> NNP-P0005 -> allowed`
- `NNP-B001 -> NNP-P0006 -> allowed`
- `NNP-Z001 -> NNP-P0007 -> blocked`

## Bindande testkrav

- unit tests för generic negative net creating `1619`
- unit tests för travel/cash/loan receivable account routing
- unit tests blocking payroll set-off without legal basis or consent
- unit tests för bank repayment reducing receivable
- integration tests för pay run -> receivable -> future payroll recovery
- integration tests för terminated employee with open receivable

## Källor som styr dokumentet

- [Riksdagen: Lag (1970:215) om arbetsgivares kvittningsratt](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1970215-om-arbetsgivares-kvittningsratt_sfs-1970-215/)
- [LÖNEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md)
- [LÖNEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md)
