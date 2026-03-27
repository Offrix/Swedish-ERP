UPDATE pay_item_definitions
SET
  tax_treatment_code = CASE
    WHEN pay_item_code LIKE 'TAX_FREE_%' THEN 'non_taxable'
    WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM', 'PENSION_PREMIUM', 'FORA_PREMIUM', 'EXTRA_PENSION_PREMIUM', 'PENSION_SPECIAL_PAYROLL_TAX')
      THEN 'non_taxable'
    ELSE 'taxable'
  END,
  employer_contribution_treatment_code = CASE
    WHEN pay_item_code LIKE 'TAX_FREE_%' THEN 'excluded'
    WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM', 'PENSION_PREMIUM', 'FORA_PREMIUM', 'EXTRA_PENSION_PREMIUM', 'PENSION_SPECIAL_PAYROLL_TAX')
      THEN 'excluded'
    ELSE 'included'
  END,
  agi_mapping_code = CASE
    WHEN pay_item_code = 'BENEFIT' THEN 'taxable_benefit'
    WHEN pay_item_code = 'EXPENSE_REIMBURSEMENT' THEN 'not_reported'
    WHEN pay_item_code IN ('PENSION_PREMIUM', 'FORA_PREMIUM', 'EXTRA_PENSION_PREMIUM') THEN 'pension_premium'
    WHEN pay_item_code = 'PENSION_SPECIAL_PAYROLL_TAX' THEN 'not_reported'
    WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAX_FREE_MILEAGE') THEN 'tax_free_allowance'
    WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN 'not_reported'
    ELSE 'cash_compensation'
  END,
  ledger_account_code = CASE
    WHEN pay_item_code = 'MONTHLY_SALARY' THEN '7010'
    WHEN pay_item_code = 'HOURLY_SALARY' THEN '7020'
    WHEN pay_item_code IN ('OVERTIME', 'ADDITIONAL_TIME') THEN '7030'
    WHEN pay_item_code = 'OB' THEN '7040'
    WHEN pay_item_code IN ('JOUR', 'STANDBY') THEN '7050'
    WHEN pay_item_code IN ('BONUS', 'COMMISSION') THEN '7060'
    WHEN pay_item_code IN ('VACATION_PAY', 'VACATION_SUPPLEMENT', 'VACATION_DEDUCTION') THEN '7070'
    WHEN pay_item_code = 'SICK_PAY' THEN '7080'
    WHEN pay_item_code IN ('QUALIFYING_DEDUCTION', 'CARE_OF_CHILD', 'PARENTAL_LEAVE', 'LEAVE_WITHOUT_PAY', 'FINAL_PAY', 'CORRECTION', 'SALARY_EXCHANGE_GROSS_DEDUCTION')
      THEN '7090'
    WHEN pay_item_code = 'BENEFIT' THEN '7290'
    WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAXABLE_TRAVEL_ALLOWANCE') THEN '7310'
    WHEN pay_item_code IN ('TAX_FREE_MILEAGE', 'TAXABLE_MILEAGE') THEN '7320'
    WHEN pay_item_code = 'EXPENSE_REIMBURSEMENT' THEN '7330'
    WHEN pay_item_code = 'PENSION_PREMIUM' THEN '7130'
    WHEN pay_item_code = 'FORA_PREMIUM' THEN '7150'
    WHEN pay_item_code = 'EXTRA_PENSION_PREMIUM' THEN '7140'
    WHEN pay_item_code = 'PENSION_SPECIAL_PAYROLL_TAX' THEN '7120'
    WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN '2750'
    ELSE ledger_account_code
  END
WHERE created_by_actor_id IN ('seed', 'demo');

UPDATE pay_run_lines
SET ledger_account_code = CASE
  WHEN pay_item_code = 'MONTHLY_SALARY' THEN '7010'
  WHEN pay_item_code = 'HOURLY_SALARY' THEN '7020'
  WHEN pay_item_code IN ('OVERTIME', 'ADDITIONAL_TIME') THEN '7030'
  WHEN pay_item_code = 'OB' THEN '7040'
  WHEN pay_item_code IN ('JOUR', 'STANDBY') THEN '7050'
  WHEN pay_item_code IN ('BONUS', 'COMMISSION') THEN '7060'
  WHEN pay_item_code IN ('VACATION_PAY', 'VACATION_SUPPLEMENT', 'VACATION_DEDUCTION') THEN '7070'
  WHEN pay_item_code = 'SICK_PAY' THEN '7080'
  WHEN pay_item_code IN ('QUALIFYING_DEDUCTION', 'CARE_OF_CHILD', 'PARENTAL_LEAVE', 'LEAVE_WITHOUT_PAY', 'FINAL_PAY', 'CORRECTION', 'SALARY_EXCHANGE_GROSS_DEDUCTION')
    THEN '7090'
  WHEN pay_item_code = 'BENEFIT' THEN '7290'
  WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAXABLE_TRAVEL_ALLOWANCE') THEN '7310'
  WHEN pay_item_code IN ('TAX_FREE_MILEAGE', 'TAXABLE_MILEAGE') THEN '7320'
  WHEN pay_item_code = 'EXPENSE_REIMBURSEMENT' THEN '7330'
  WHEN pay_item_code = 'PENSION_PREMIUM' THEN '7130'
  WHEN pay_item_code = 'FORA_PREMIUM' THEN '7150'
  WHEN pay_item_code = 'EXTRA_PENSION_PREMIUM' THEN '7140'
  WHEN pay_item_code = 'PENSION_SPECIAL_PAYROLL_TAX' THEN '7120'
  WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN '2750'
  ELSE ledger_account_code
END
WHERE ledger_account_code = 'phase8_3_pending';

UPDATE pay_run_payslips
SET render_payload_json = CASE
  WHEN render_payload_json @> '{"warnings":[{"code":"payroll_tax_pending_phase8_2"}]}'::jsonb
    THEN jsonb_set(
      jsonb_set(render_payload_json, '{totals,preliminaryTaxStatus}', '"pending"'::jsonb, true),
      '{warnings,0,code}',
      '"payroll_tax_profile_missing"'::jsonb,
      true
    )
  ELSE jsonb_set(render_payload_json, '{totals,preliminaryTaxStatus}', '"pending"'::jsonb, true)
END
WHERE render_payload_json @> '{"totals":{"preliminaryTaxStatus":"phase8_2_pending"}}'::jsonb;

INSERT INTO schema_migrations (migration_id)
VALUES ('20260325033000_phase8_payroll_placeholder_cleanup')
ON CONFLICT (migration_id) DO NOTHING;
