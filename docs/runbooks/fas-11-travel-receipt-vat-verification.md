> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 11.3 travel receipt VAT verification

## Scope

Verifiera att travel receipt VAT inte längre göms i vanlig expense reimbursement utan:
- skapar riktig `VatDecision` när receipt-fakta räcker
- skickar ofullständiga VAT-fakta till review i stället för att gissa
- behåller reimbursement på gross/outlay-nivå för payroll
- klassificerar travel day och night country utifrån varje segments lokala offset i stället för första segmentets offset

## Required checks

1. Kör `node --test tests/unit/travel-phase9-2.test.mjs`.
2. Kör `node --test tests/integration/phase9-travel-api.test.mjs`.
3. Kör `node --test tests/unit/phase12-benefits-travel-hardening.test.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/lint.mjs`.
6. Kör `node scripts/typecheck.mjs`.
7. Kör `node scripts/build.mjs`.
8. Kör `node scripts/security-scan.mjs`.

## Expected outcome

- receipt med kompletta svenska purchase-fakta ger `vatHandlingStatus=decided`
- receipt med ofullständiga VAT-fakta ger `vatHandlingStatus=review_required`
- decided receipt bär `vatDecisionId`, `deductibleVatAmountSek` och declaration box `48` när avdrag finns
- claimnivån summerar `deductibleExpenseVatAmount`, `expenseVatDecidedCount` och `expenseVatReviewCount`
- payroll reimbursement fortsätter använda gross/outlay och blandas inte ihop med VAT truth
- multi-offset foreign travel väljer rätt country för både `06-24`-dagfönster och `00-06`-nattfönster

## Exit gate

- [ ] Travel receipt VAT separeras från payroll reimbursement
- [ ] Kompletta receipt-fakta ger riktig `VatDecision`
- [ ] Ofullständiga receipt-fakta går till review i stället för auto-bokning
- [ ] Travel day och night country använder segments lokala offset vid landsval och traktamentesats
- [ ] Riktade tester och full gate är gröna
