INSERT INTO pension_plans (
  pension_plan_id,
  company_id,
  plan_code,
  provider_code,
  collective_agreement_code,
  display_name,
  report_model_code,
  default_pay_item_code,
  payload_json
) VALUES
  ('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000000001','ITP1','collectum','itp1','ITP 1','monthly_gross_salary','PENSION_PREMIUM',jsonb_build_object('seedSource','phase9_3_seed')),
  ('00000000-0000-4000-8000-000000009302','00000000-0000-4000-8000-000000000001','ITP2','collectum','itp2','ITP 2','annual_pensionable_salary','PENSION_PREMIUM',jsonb_build_object('seedSource','phase9_3_seed')),
  ('00000000-0000-4000-8000-000000009303','00000000-0000-4000-8000-000000000001','FORA','fora','fora','Fora','monthly_wage_report','FORA_PREMIUM',jsonb_build_object('seedSource','phase9_3_seed')),
  ('00000000-0000-4000-8000-000000009304','00000000-0000-4000-8000-000000000001','EXTRA_PENSION','custom','supplementary','Extra pension','supplementary_premium','EXTRA_PENSION_PREMIUM',jsonb_build_object('seedSource','phase9_3_seed'))
ON CONFLICT (company_id, plan_code) DO NOTHING;

INSERT INTO employee_pension_enrollments (
  pension_enrollment_id,
  company_id,
  employee_id,
  employment_id,
  pension_plan_id,
  plan_code,
  provider_code,
  collective_agreement_code,
  contribution_mode,
  contribution_rate_percent,
  fixed_contribution_amount,
  contribution_basis_code,
  starts_on,
  status,
  dimension_json
) VALUES (
  '00000000-0000-4000-8000-000000009311',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000711',
  '00000000-0000-4000-8000-000000000721',
  '00000000-0000-4000-8000-000000009301',
  'ITP1',
  'collectum',
  'itp1',
  'rate_percent',
  4.50,
  NULL,
  'monthly_gross_salary',
  '2025-01-01',
  'active',
  jsonb_build_object('seedSource','phase9_3_seed')
) ON CONFLICT DO NOTHING;

INSERT INTO salary_exchange_agreements (
  salary_exchange_agreement_id,
  company_id,
  employee_id,
  employment_id,
  provider_code,
  starts_on,
  status,
  exchange_mode,
  exchange_value,
  employer_markup_percent,
  threshold_amount,
  basis_treatment_code,
  preview_json
) VALUES (
  '00000000-0000-4000-8000-000000009321',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000711',
  '00000000-0000-4000-8000-000000000721',
  'collectum',
  '2026-01-01',
  'active',
  'fixed_amount',
  3000.00,
  5.80,
  56087.00,
  'maintain_pre_exchange',
  jsonb_build_object(
    'warnings', jsonb_build_array('salary_exchange_social_insurance_review_required'),
    'payItemCodes', jsonb_build_array('SALARY_EXCHANGE_GROSS_DEDUCTION','PENSION_PREMIUM','EXTRA_PENSION_PREMIUM','PENSION_SPECIAL_PAYROLL_TAX')
  )
) ON CONFLICT DO NOTHING;
