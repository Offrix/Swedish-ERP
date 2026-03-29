import { cloneValue as clone } from "./clone.mjs";

export const SECURITY_CLASS_CODES = Object.freeze(["S0", "S1", "S2", "S3", "S4", "S5"]);

const SECURITY_CLASS_DEFINITION_MAP = Object.freeze({
  S0: Object.freeze({
    classCode: "S0",
    label: "public_metadata",
    description: "Public or non-sensitive metadata that may appear in standard read models.",
    plaintextAllowed: true,
    snapshotAllowed: true,
    secretStoreRequired: false,
    nonExportable: false
  }),
  S1: Object.freeze({
    classCode: "S1",
    label: "internal_operations",
    description: "Internal operational metadata such as queue ids, runtime health refs and internal control signals.",
    plaintextAllowed: true,
    snapshotAllowed: true,
    secretStoreRequired: false,
    nonExportable: false
  }),
  S2: Object.freeze({
    classCode: "S2",
    label: "business_confidential",
    description: "Business confidential metadata without regulated personal or secret-bearing content.",
    plaintextAllowed: true,
    snapshotAllowed: true,
    secretStoreRequired: false,
    nonExportable: false
  }),
  S3: Object.freeze({
    classCode: "S3",
    label: "regulated_personal_finance",
    description: "Regulated personal or financial data requiring masking and protected storage semantics.",
    plaintextAllowed: false,
    snapshotAllowed: true,
    secretStoreRequired: false,
    nonExportable: false
  }),
  S4: Object.freeze({
    classCode: "S4",
    label: "secret_factor_credential",
    description: "Secrets, factors, tokens and credentials that must only be referenced from application state.",
    plaintextAllowed: false,
    snapshotAllowed: false,
    secretStoreRequired: true,
    nonExportable: false
  }),
  S5: Object.freeze({
    classCode: "S5",
    label: "non_exportable_signing_key",
    description: "Non-exportable signing or root keys that must never appear in application storage or snapshots.",
    plaintextAllowed: false,
    snapshotAllowed: false,
    secretStoreRequired: true,
    nonExportable: true
  })
});

export const SECURITY_FIELD_CLASSIFICATIONS = Object.freeze([
  Object.freeze({
    fieldCode: "managed_secret.current_secret_ref",
    objectFamily: "managed_secret",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Current managed secret reference."
  }),
  Object.freeze({
    fieldCode: "managed_secret.previous_secret_ref",
    objectFamily: "managed_secret",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Superseded managed secret reference."
  }),
  Object.freeze({
    fieldCode: "certificate_chain.certificate_secret_ref",
    objectFamily: "certificate_chain",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Certificate bundle reference for callback or provider certificates."
  }),
  Object.freeze({
    fieldCode: "certificate_chain.private_key_secret_ref",
    objectFamily: "certificate_chain",
    classCode: "S5",
    storagePolicy: "hsm_or_non_exportable_ref",
    description: "Private signing key reference for callback or provider certificates."
  }),
  Object.freeze({
    fieldCode: "callback_secret.current_secret_ref",
    objectFamily: "callback_secret",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Active callback secret reference."
  }),
  Object.freeze({
    fieldCode: "callback_secret.previous_secret_ref",
    objectFamily: "callback_secret",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Superseded callback secret reference."
  }),
  Object.freeze({
    fieldCode: "auth_factor_secret.envelope",
    objectFamily: "auth_factor_secret",
    classCode: "S4",
    storagePolicy: "sealed_secret",
    description: "Stored MFA factor secret envelope."
  }),
  Object.freeze({
    fieldCode: "auth_challenge_secret.envelope",
    objectFamily: "auth_challenge_secret",
    classCode: "S4",
    storagePolicy: "sealed_secret",
    description: "Stored authentication challenge secret envelope."
  }),
  Object.freeze({
    fieldCode: "auth_identity_mode.credential_secret_ref",
    objectFamily: "auth_identity_mode",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Identity provider client secret reference."
  }),
  Object.freeze({
    fieldCode: "auth_identity_mode.webhook_secret_ref",
    objectFamily: "auth_identity_mode",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Identity provider webhook signing secret reference."
  }),
  Object.freeze({
    fieldCode: "integration.credentials_ref",
    objectFamily: "integration_credentials",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Integration credential reference."
  }),
  Object.freeze({
    fieldCode: "integration.secret_manager_ref",
    objectFamily: "integration_credentials",
    classCode: "S4",
    storagePolicy: "secret_ref_only",
    description: "Integration secret manager reference."
  }),
  Object.freeze({
    fieldCode: "person.swedish_identity_number",
    objectFamily: "regulated_personal_data",
    classCode: "S3",
    storagePolicy: "encrypted_or_masked",
    description: "Swedish personal identity number."
  }),
  Object.freeze({
    fieldCode: "bank.account_number",
    objectFamily: "regulated_financial_data",
    classCode: "S3",
    storagePolicy: "encrypted_or_masked",
    description: "Bank account or payout routing details."
  }),
  Object.freeze({
    fieldCode: "payroll.tax_payload",
    objectFamily: "regulated_financial_data",
    classCode: "S3",
    storagePolicy: "encrypted_or_masked",
    description: "Payroll tax and deduction payloads."
  }),
  Object.freeze({
    fieldCode: "hus.identity_payload",
    objectFamily: "regulated_financial_data",
    classCode: "S3",
    storagePolicy: "encrypted_or_masked",
    description: "HUS customer or property identity payloads."
  })
]);

const MANAGED_SECRET_TYPE_CLASS_CODES = Object.freeze({
  api_secret: "S4",
  oauth_client_secret: "S4",
  webhook_signing_secret: "S4",
  certificate_private_key: "S5"
});

export function assertSecurityClassCode(
  value,
  {
    code = "security_class_code_invalid",
    message = "Security class code must be one of S0, S1, S2, S3, S4 or S5.",
    createError = null
  } = {}
) {
  if (typeof value === "string" && SECURITY_CLASS_CODES.includes(value.trim())) {
    return value.trim();
  }
  if (typeof createError === "function") {
    throw createError(code, message);
  }
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function listSecurityClasses() {
  return SECURITY_CLASS_CODES.map((classCode) => clone(SECURITY_CLASS_DEFINITION_MAP[classCode]));
}

export function getSecurityClassDefinition(classCode) {
  return clone(SECURITY_CLASS_DEFINITION_MAP[assertSecurityClassCode(classCode)]);
}

export function listSecurityFieldClassifications() {
  return SECURITY_FIELD_CLASSIFICATIONS.map((entry) => clone(entry));
}

export function resolveManagedSecretClassCode(secretType) {
  const classCode = MANAGED_SECRET_TYPE_CLASS_CODES[secretType];
  if (!classCode) {
    throw new Error(`Unsupported managed secret type for security classification: ${secretType}`);
  }
  return classCode;
}

export function buildSecurityClassificationCatalog({
  generatedAt = new Date().toISOString(),
  inventorySummary = null
} = {}) {
  return {
    generatedAt,
    classes: listSecurityClasses(),
    fieldClassifications: listSecurityFieldClassifications(),
    inventorySummary: inventorySummary ? clone(inventorySummary) : null
  };
}
