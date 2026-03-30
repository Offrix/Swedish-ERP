# AWS KMS Secret Runtime Bootstrap

## Purpose

This runbook is the binding bootstrap procedure for phase `3.2` AWS KMS-backed secret runtime.
It defines how protected and production-like modes obtain wrapped root material without persisting plaintext root keys in repo files, snapshots or generic durable state.

## Scope

- `ERP_SECRET_RUNTIME_PROVIDER=aws_kms`
- AWS KMS customer-managed keys for:
  - `mode-root-key`
  - `service-kek`
  - `blind-index-key`
- wrapped root-material provisioning
- secret runtime smoke verification
- protected-mode startup validation

## Preconditions

- an AWS account and region are approved
- customer-managed KMS keys exist for:
  - `alias/swedish-erp/mode-root-key`
  - `alias/swedish-erp/service-kek`
  - `alias/swedish-erp/blind-index-key`
- the app has valid AWS credentials through environment variables, IAM role or equivalent runtime identity
- the runtime owner has authority to provision wrapped root material for the target environment

## Required Environment Variables

- `AWS_REGION` or `AWS_DEFAULT_REGION`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` when local programmatic credentials are used
- `ERP_SECRET_RUNTIME_PROVIDER=aws_kms`
- `ERP_AWS_KMS_REGION`
- `ERP_AWS_KMS_MODE_ROOT_KEY_ID`
- `ERP_AWS_KMS_SERVICE_KEK_KEY_ID`
- `ERP_AWS_KMS_BLIND_INDEX_KEY_ID`

Do not place plaintext root material in `.env`, test fixtures, snapshots or runbooks.

## Bootstrap Procedure

1. Export AWS auth and region into the shell used for provisioning.
2. Set KMS aliases:
   - `ERP_AWS_KMS_MODE_ROOT_KEY_ID=alias/swedish-erp/mode-root-key`
   - `ERP_AWS_KMS_SERVICE_KEK_KEY_ID=alias/swedish-erp/service-kek`
   - `ERP_AWS_KMS_BLIND_INDEX_KEY_ID=alias/swedish-erp/blind-index-key`
3. Run:

```powershell
node scripts/provision-aws-kms-secret-runtime.mjs
```

4. Capture the emitted lines and place them into the runtime secret store or deployment environment:
   - `ERP_SECRET_RUNTIME_PROVIDER=aws_kms`
   - `ERP_AWS_KMS_REGION=...`
   - `ERP_AWS_KMS_MODE_ROOT_KEY_ID=...`
   - `ERP_AWS_KMS_MODE_ROOT_WRAPPED_B64=...`
   - `ERP_AWS_KMS_SERVICE_KEK_KEY_ID=...`
   - `ERP_AWS_KMS_SERVICE_KEK_WRAPPED_B64=...`
   - `ERP_AWS_KMS_BLIND_INDEX_KEY_ID=...`
   - `ERP_AWS_KMS_BLIND_INDEX_WRAPPED_B64=...`
5. Remove transient shell artifacts that captured bootstrap output.
6. Start the API or worker in protected mode and verify the runtime diagnostics.

## Required Smoke Verification

1. Boot the API with:
   - `ERP_RUNTIME_MODE=production`
   - `ERP_CRITICAL_DOMAIN_STATE_STORE=postgres`
   - AWS KMS secret-runtime environment values present
2. Verify:
   - `platform.getDomain("orgAuth").listSecretStorePostures()[0].providerKind === "aws_kms"`
   - `platform.getDomain("integrations").listSecretStorePostures()[0].providerKind === "aws_kms"`
   - `secret_runtime_not_bank_grade` is absent from runtime findings
3. Confirm no plaintext root material appears in:
   - logs
   - `.env` files checked into repo
   - durable exports
   - snapshot bundles

## Rotation Interaction

- New wrapped root material may be provisioned during planned rotation.
- Re-wrapping is governed by [key-rotation.md](C:\Users\snobb\Desktop\Swedish%20ERP\docs\runbooks\key-rotation.md).
- Security events are governed by [security-incident-response.md](C:\Users\snobb\Desktop\Swedish%20ERP\docs\runbooks\security-incident-response.md).

## Failure Handling

If provisioning fails:

1. stop and record the AWS error code
2. confirm region and key aliases
3. confirm app credentials can use `kms:Encrypt` and `kms:Decrypt`
4. do not fall back to plaintext or repo-stored master keys in protected mode
5. keep the environment blocked until AWS KMS provisioning succeeds

## Required Tests

- `node --test tests/unit/phase3-secret-store-runtime.test.mjs`
- `node --test tests/unit/phase1-startup-diagnostics.test.mjs`
- live smoke verification against the approved AWS KMS account before protected rollout

## Exit Gate

Phase `3.2` AWS KMS bootstrap is green only when:

- wrapped root material exists for all three required key families
- protected runtime boots with `providerKind: aws_kms`
- `secret_runtime_not_bank_grade` is absent in protected runtime
- no plaintext root material is stored in repo, snapshots or generic durable exports
