import {
  provisionAwsKmsSecretRuntimeBundle
} from "../packages/domain-core/src/secret-runtime.mjs";

const bundle = provisionAwsKmsSecretRuntimeBundle({
  env: process.env
});

process.stdout.write(
  [
    `ERP_SECRET_RUNTIME_PROVIDER=aws_kms`,
    `ERP_AWS_KMS_REGION=${bundle.region}`,
    `ERP_AWS_KMS_MODE_ROOT_KEY_ID=${bundle.modeRootKeyId}`,
    `ERP_AWS_KMS_MODE_ROOT_WRAPPED_B64=${bundle.modeRootWrappedKeyMaterialB64}`,
    `ERP_AWS_KMS_SERVICE_KEK_KEY_ID=${bundle.serviceKekKeyId}`,
    `ERP_AWS_KMS_SERVICE_KEK_WRAPPED_B64=${bundle.serviceKekWrappedKeyMaterialB64}`,
    `ERP_AWS_KMS_BLIND_INDEX_KEY_ID=${bundle.blindIndexKeyId}`,
    `ERP_AWS_KMS_BLIND_INDEX_WRAPPED_B64=${bundle.blindIndexWrappedKeyMaterialB64}`
  ].join("\n")
);
