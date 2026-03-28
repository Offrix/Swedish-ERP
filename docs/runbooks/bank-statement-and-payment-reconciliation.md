# Bank Statement And Payment Reconciliation

Detta runbook gäller fas 9.4 och beskriver den bindande operatörskedjan för:
- `PaymentBatch`
- `StatementImport`
- `SettlementLiabilityLink`
- `PaymentProposal` / `PaymentOrder`
- statement matchning mot `payment_order` och `tax_account_event`

## Mål

Säkerställa att bankrörelser aldrig bokas eller betraktas som avstämda utan spårbar rail, importkedja och liability-link.

## Förutsättningar

- bolaget har aktivt bankkonto i `banking`
- relevant rail är vald:
  - `open_banking`
  - `iso20022_file`
  - `bankgiro_file`
- AP-open item eller tax-account-händelse finns som faktisk liability-källa

## 1. Kontrollera payment batch före export

Verifiera på `PaymentBatch`:
- `paymentRailCode`
- `paymentFileFormatCode`
- `providerCode`
- `providerBaselineCode`
- `status = draft`
- `orderCount`
- `totalAmount`

Blockera export om:
- batch saknar rail eller baseline
- någon order saknar liability mapping
- proposal inte är approved

## 2. Kontrollera exportartefakt

Efter export måste följande finnas:
- `exportFileName`
- `exportPayload`
- `exportPayloadHash`
- `status = exported`

Rail-specifikt:
- `open_banking`: JSON-payload med orders och beneficiary account
- `iso20022_file`: XML-envelope med `format="pain.001"`
- `bankgiro_file`: CSV-envelope

## 3. Kontrollera submission till bankrail

Efter submit/accept:
- `PaymentBatch.status` ska gå `submitted -> accepted_by_bank`
- alla ingående `PaymentOrder` ska gå `reserved -> sent -> accepted`
- `providerReference` ska sparas om extern rail lämnar referens

## 4. Kontrollera statement import

Varje statementimport måste skapa ett first-class `StatementImport` med:
- `statementImportNo`
- `sourceChannelCode`
- `statementFileFormatCode`
- `providerCode`
- `providerBaselineCode` där rail inte är manuell
- `providerReference`
- `importedCount`
- `duplicateCount`
- `matchedPaymentOrderCount`
- `matchedTaxAccountCount`
- `reconciliationRequiredCount`

VIKTIGT:
- statement import får identifiera matchad `payment_order` eller tax-account-riktning
- statement import får INTE bokföra eller skapa tax-account bridge direkt
- sådan effekt kräver öppet `BankReconciliationCase` med explicit approve-resolution

Tillåtna `sourceChannelCode` i nuläget:
- `open_banking_sync`
- `camt053_file`
- `manual_statement`

## 5. Kontrollera settlement liability links

Varje railhändelse som påverkar skuld eller fordran ska ha `SettlementLiabilityLink`.

För AP-betalning:
- `liabilityObjectType = ap_open_item`
- `paymentOrderId` måste finnas
- `status` går `pending -> matched -> settled | rejected | returned`
- `bankStatementEventId` sätts när statement matchar
- `matched` betyder att bankraden är identifierad men ännu inte explicit godkänd för posting

För skattekonto via statement bridge:
- `liabilityObjectType = tax_account_event`
- `bankStatementEventId` måste finnas
- `status = settled` först när tax-account-event faktiskt skapats

## 6. Reconciliation required

Om statementrad inte kan matchas:
- `BankStatementEvent.processingStatus = reconciliation_required`
- `BankReconciliationCase.status = open`
- ingen ledgerpåverkan får skapas från statementraden

Om statementrad MATCHAR men leder till posting-gate:
- `BankStatementEvent.matchStatus` får vara `matched_payment_order` eller `matched_tax_account`
- `BankStatementEvent.processingStatus` ska fortfarande vara `reconciliation_required`
- `BankReconciliationCase.pendingActionCode` ska bära exakt approve-action
- ingen AP-settlement eller tax-account bridge får köras innan case löses med approve-resolution

Detta gäller särskilt:
- fel `paymentOrderId`
- ofullständig tax-account bridge
- okänd motpart utan explicit liability-källa

## 7. Operatörschecklista

1. Läs `PaymentBatch`
2. Kontrollera rail, baseline och orderantal
3. Verifiera exportartefakt
4. Verifiera `StatementImport`
5. Verifiera `SettlementLiabilityLink`
6. Verifiera att inga statementrader med `reconciliation_required` saknar case
7. Verifiera att `matched` payment-order-link inte gått till `settled` före explicit approval
8. Verifiera att settled payment order faktiskt har liability-link i `settled`

## 8. Felindikatorer

Stoppa fortsatt drift om något av följande inträffar:
- statement import utan `StatementImport`
- payment order bokad utan `SettlementLiabilityLink`
- payment order eller tax-account bridge som körts direkt under import utan approve-case
- rail/baseline tappas mellan proposal och batch
- tax-account-bridge skapar statement match utan liability-link
- batch når `accepted_by_bank` utan exportartefakt

## 9. Obligatoriska tester

Följande sviter ska vara gröna:
- `tests/unit/phase27-banking-runtime.test.mjs`
- `tests/integration/phase27-banking-runtime-api.test.mjs`
- `tests/unit/phase9-banking-payment-rails.test.mjs`
- `tests/integration/phase9-banking-payment-rails-api.test.mjs`
- `tests/e2e/phase9-banking-payment-rails-flow.test.mjs`
