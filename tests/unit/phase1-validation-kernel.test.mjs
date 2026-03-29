import test from "node:test";
import assert from "node:assert/strict";

import {
  VALIDATION_KERNEL_VERSION,
  normalizeOptionalOcrReference,
  normalizeOptionalPaymentReference,
  normalizeOptionalSwedishIdentityNumber,
  normalizeOptionalSwedishOrganizationNumber,
  normalizeOptionalVatCountryCode,
  normalizeOptionalVatNumber,
  normalizeRequiredIanaTimeZone
} from "../../packages/domain-core/src/validation.mjs";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";

test("validation kernel exposes the pinned phase 1.5 version", () => {
  assert.equal(VALIDATION_KERNEL_VERSION, "2026.1");
});

test("validation kernel canonicalizes Swedish organization and identity numbers", () => {
  assert.equal(normalizeOptionalSwedishOrganizationNumber("559900-0006", "organization_number_invalid"), "5599000006");
  assert.equal(normalizeOptionalSwedishIdentityNumber("930303-1232", "identity_invalid"), "9303031232");
  assert.equal(
    normalizeOptionalSwedishIdentityNumber("197501619998", "identity_invalid", { expectedType: "samordningsnummer" }),
    "7501619998"
  );
  assert.throws(
    () => normalizeOptionalSwedishOrganizationNumber("559900-0001", "organization_number_invalid"),
    /checksum/i
  );
  assert.throws(
    () => normalizeOptionalSwedishIdentityNumber("930303-1234", "identity_invalid"),
    /checksum/i
  );
});

test("validation kernel normalizes VAT aliases, OCR references and payment references", () => {
  assert.equal(normalizeOptionalVatCountryCode("gr", "vat_country_invalid"), "EL");
  assert.equal(normalizeOptionalVatNumber("gr 123456789", "vat_number_invalid"), "EL123456789");
  assert.equal(normalizeOptionalVatNumber("123456789", "vat_number_invalid", { countryCode: "GR" }), "EL123456789");
  assert.equal(normalizeOptionalOcrReference("12346", "ocr_invalid", { controlMode: "mod10" }), "12346");
  assert.equal(normalizeOptionalPaymentReference("  abc 123  ", "payment_reference_invalid"), "ABC 123");
  assert.throws(() => normalizeOptionalOcrReference("12345", "ocr_invalid", { controlMode: "mod10" }), /checksum/i);
});

test("validation kernel enforces IANA time zones", () => {
  assert.equal(normalizeRequiredIanaTimeZone("Europe/Stockholm", "timezone_invalid"), "Europe/Stockholm");
  assert.throws(() => normalizeRequiredIanaTimeZone("Europe/Gothenburg", "timezone_invalid"), /invalid/i);
});

test("org auth onboarding rejects invalid Swedish organization numbers", () => {
  const auth = createOrgAuthPlatform({ environmentMode: "test" });
  assert.throws(
    () =>
      auth.createOnboardingRun({
        legalName: "Validation AB",
        orgNumber: "559900-0001",
        adminEmail: "owner@example.com",
        adminDisplayName: "Owner"
      }),
    (error) => error?.code === "organization_number_invalid"
  );
});

test("HR employee creation validates Swedish identity type semantics", () => {
  const hr = createHrPlatform();
  assert.throws(
    () =>
      hr.createEmployee({
        companyId: "company-phase1",
        employeeNo: "E-001",
        givenName: "Anna",
        familyName: "Andersson",
        identityType: "personnummer",
        identityValue: "930303-1234"
      }),
    (error) => error?.code === "employee_identity_value_invalid"
  );

  const employee = hr.createEmployee({
    companyId: "company-phase1",
    employeeNo: "E-002",
    givenName: "Sara",
    familyName: "Svensson",
    identityType: "samordningsnummer",
    identityValue: "197501619998"
  });
  assert.equal(employee.identityType, "samordningsnummer");
});

test("time schedule templates reject non-IANA time zones", () => {
  const time = createTimePlatform();
  assert.throws(
    () =>
      time.createScheduleTemplate({
        companyId: "company-phase1",
        scheduleTemplateCode: "SHIFT-A",
        displayName: "Shift A",
        timezone: "Europe/Gothenburg",
        days: [{ weekday: 1, startTime: "08:00", endTime: "17:00" }]
      }),
    (error) => error?.code === "schedule_template_timezone_required"
  );
});
