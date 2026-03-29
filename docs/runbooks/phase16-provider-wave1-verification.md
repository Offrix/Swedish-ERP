# Phase 16.4 provider wave 1 verification

## Scope

Verify that simulated finance adapters are replaced by real wave-1 provider runtime for:

- Enable Banking
- ISO 20022 bank files
- Stripe payment links
- Pagero Peppol
- Google Document AI
- Postmark email
- Twilio SMS
- Pleo spend
- official AGI/VAT/HUS/annual transports

## Required checks

1. Capability manifests
- `GET /v1/integrations/capability-manifests?surfaceCode=payment_link`
- `GET /v1/integrations/capability-manifests?surfaceCode=notification_email`
- `GET /v1/integrations/capability-manifests?surfaceCode=notification_sms`
- `GET /v1/integrations/capability-manifests?surfaceCode=spend`
- `GET /v1/integrations/capability-manifests?surfaceCode=regulated_transport`
- Verify wave-1 providers are present and expose allowed environment modes plus mode matrix.

2. Generic integration connections
- Create one `payment_link` connection for `stripe_payment_links`.
- Create one `notification_email` connection for `postmark_email`.
- Run health checks.
- Verify credential isolation and environment refs are materialized.

3. Finance runtime replacement
- Issue an AR invoice.
- Deliver over `pdf_email` and verify `providerCode=postmark_email`.
- Deliver over `peppol` and verify `providerCode=pagero_online`.
- Create a payment link and verify `providerCode=stripe_payment_links`.

4. Operations exposed as first-class provider runtime
- Prepare statement sync via Enable Banking.
- Prepare file exchange via ISO 20022 provider.
- Prepare spend sync via Pleo.
- Prepare official submission transport for AGI and annual filing.

## Targeted commands

```powershell
node --test tests/unit/phase16-provider-wave1.test.mjs
node --test tests/integration/phase16-provider-wave1-api.test.mjs
node --test tests/unit/ar-phase5-2.test.mjs
node --test tests/integration/phase5-ar-invoicing-api.test.mjs
node --test tests/e2e/phase5-ar-invoicing-flow.test.mjs
node --test tests/unit/phase16-integration-core.test.mjs
node --test tests/integration/phase16-integration-core-api.test.mjs
```

## Full gate

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Exit criteria

- All wave-1 providers listed above exist as runtime modules.
- Capability manifests expose non-partner surfaces for payment links, notifications, spend and regulated transport.
- AR no longer relies on `internal_mock` payment links.
- Invoice delivery and payment-link flows carry real provider codes and provider baseline refs.
- Full gate is green.
