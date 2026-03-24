UPDATE ar_invoice_number_series
SET description = 'Customer invoice numbering',
    invoice_type_codes = '["standard","partial","subscription"]'::jsonb,
    voucher_series_purpose_code = 'AR_INVOICE',
    imported_sequence_preservation_enabled = TRUE,
    updated_at = NOW()
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND series_code = 'B';

UPDATE ar_invoice_number_series
SET description = 'Customer credit note numbering',
    invoice_type_codes = '["credit_note"]'::jsonb,
    voucher_series_purpose_code = 'AR_CREDIT_NOTE',
    imported_sequence_preservation_enabled = TRUE,
    updated_at = NOW()
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND series_code = 'C';
