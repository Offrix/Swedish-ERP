# Finance-Ready Bootstrap

Den hÃ¤r runbooken beskriver den bindande bootstrapordningen fÃ¶r att ett bolag ska bli `finance_ready`.

## Syfte

Bootstrapen mÃ¥ste skapa samma finansiella grund varje gÃ¥ng:
- legal form profile
- accounting method profile
- fiscal year profile
- active fiscal year
- reporting obligation profile
- ledger catalog
- VAT catalog
- review queue structure
- role template summary

Ingen tenant fÃ¥r markeras `finance_ready` innan samtliga finance-readiness-kontroller Ã¤r `completed`.

## FÃ¶rutsÃ¤ttningar

- `domain-tenant-control` Ã¤r aktivt i plattformen
- `domain-org-auth`, `domain-legal-form`, `domain-accounting-method`, `domain-fiscal-year`, `domain-ledger`, `domain-vat` och `domain-review-center` Ã¤r tillgÃ¤ngliga
- onboarding-checklisten Ã¤r komplett

## Ordningskrav

1. Skapa eller lÃ¤s finance blueprint frÃ¥n onboarding payload + verklig checklist-state.
2. SÃ¤kerstÃ¤ll aktiv legal form profile.
3. SÃ¤kerstÃ¤ll fiscal year profile.
4. SÃ¤kerstÃ¤ll active fiscal year.
5. SÃ¤kerstÃ¤ll accounting method profile.
6. SÃ¤kerstÃ¤ll approved reporting obligation profile.
7. Installera ledger catalog.
8. Installera VAT catalog.
9. SÃ¤kerstÃ¤ll review queue structure.
10. Materialisera finance foundation record.
11. BerÃ¤kna finance-readiness checks.
12. FÃ¶rst dÃ¤refter fÃ¥r tenanten klassas som `finance_ready`.

## Kontrollpunkter

Verifiera alltid:
- att legal form profile Ã¤r `active`
- att accounting method profile Ã¤r `active`
- att fiscal year finns och Ã¤r `active`
- att reporting obligation profile Ã¤r `approved`
- att ledger catalog innehÃ¥ller konton och voucher series
- att VAT catalog innehÃ¥ller VAT-koder
- att queue structure minst innehÃ¥ller:
  - `finance_review`
  - `payroll_review`
  - `vat_decision_review`
- att `financeReadinessChecks` inte innehÃ¥ller `blocked`

## Felhantering

- Om checklistan inte Ã¤r komplett fÃ¥r finance foundation inte markeras klar.
- Om nÃ¥gon underdomÃ¤n saknas ska bootstrapen returnera blockerande readiness-check i stÃ¤llet fÃ¶r att lÃ¥tsas vara klar.
- Om ledger eller VAT catalog redan finns ska installationen vara idempotent.

## Bevis

Verifiera med:
- unit-test fÃ¶r tenant bootstrap och finance foundation
- integrationstest fÃ¶r API-profilen
- finance-readiness checks i `CompanySetupProfile`

## Exit gate

Fasen Ã¤r bara klar nÃ¤r:
- ett nytt bolag kan gÃ¥ frÃ¥n bootstrap till `finance_ready`
- foundation Ã¤r verkligt skapad i underdomÃ¤nerna
- API-profilen visar blueprint, foundation och checks
- flÃ¶det Ã¤r testat deterministiskt
