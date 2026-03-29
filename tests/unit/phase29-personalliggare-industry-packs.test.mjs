import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSONALLIGGARE_THRESHOLD_2026_EX_VAT,
  createPersonalliggarePlatform
} from "../../packages/domain-personalliggare/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 29 personalliggare broadens into industry packs, identity snapshots and trusted kiosk flows", () => {
  const personalliggare = createPersonalliggarePlatform({
    clock: () => new Date("2026-03-24T06:00:00Z")
  });

  const packs = personalliggare.listIndustryPacks();
  assert.equal(packs.some((pack) => pack.industryPackCode === "bygg"), true);

  const site = personalliggare.createConstructionSite({
    companyId: COMPANY_ID,
    siteCode: "SITE-29-UNIT-001",
    siteName: "Construction test site",
    siteAddress: "Bygggatan 1, Stockholm",
    builderOrgNo: "5561234567",
    estimatedTotalCostExVat: PERSONALLIGGARE_THRESHOLD_2026_EX_VAT + 1000,
    startDate: "2026-03-20",
    workplaceIdentifier: "PL-BYGG-001",
    actorId: "step29-unit"
  });
  assert.equal(site.thresholdEvaluationStatus, "registration_required");

  personalliggare.createConstructionSiteRegistration({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    registrationReference: "PL-29-UNIT-001",
    status: "active",
    checklistItems: ["site_created", "builder_confirmed", "equipment_ready"],
    equipmentStatus: "available",
    registeredOn: "2026-03-20",
    actorId: "step29-unit"
  });

  const kiosk = personalliggare.createKioskDevice({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    deviceCode: "KIOSK-29-01",
    displayName: "Main kiosk",
    actorId: "step29-unit"
  });
  assert.equal(kiosk.trustStatus, "pending");

  const trustedKiosk = personalliggare.trustKioskDevice({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    kioskDeviceId: kiosk.kioskDeviceId,
    actorId: "step29-unit"
  });
  assert.equal(trustedKiosk.trustStatus, "trusted");

  const event = personalliggare.recordAttendanceEvent({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    workerIdentityType: "personnummer",
    workerIdentityValue: "198902029999",
    fullNameSnapshot: "Sara Nilsson",
    employerOrgNo: "5561112227",
    contractorOrgNo: "5561234567",
    roleAtWorkplace: "installer",
    clientEventId: "evt-29-1",
    eventType: "check_in",
    eventTimestamp: "2026-03-24T06:10:00Z",
    sourceChannel: "kiosk",
    deviceId: kiosk.kioskDeviceId,
    offlineFlag: true,
    actorId: "step29-unit"
  });
  assert.equal(event.status, "captured");
  assert.equal(event.roleAtWorkplace, "installer");

  const duplicate = personalliggare.recordAttendanceEvent({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    workerIdentityType: "personnummer",
    workerIdentityValue: "198902029999",
    fullNameSnapshot: "Sara Nilsson",
    employerOrgNo: "5561112227",
    contractorOrgNo: "5561234567",
    roleAtWorkplace: "installer",
    clientEventId: "evt-29-1",
    eventType: "check_in",
    eventTimestamp: "2026-03-24T06:10:00Z",
    sourceChannel: "kiosk",
    deviceId: kiosk.kioskDeviceId,
    offlineFlag: true,
    actorId: "step29-unit"
  });
  assert.equal(duplicate.attendanceEventId, event.attendanceEventId);

  assert.equal(personalliggare.listAttendanceIdentitySnapshots({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId
  }).length, 1);
  assert.equal(personalliggare.listContractorSnapshots({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId
  }).length, 1);

  const correction = personalliggare.correctAttendanceEvent({
    companyId: COMPANY_ID,
    attendanceEventId: event.attendanceEventId,
    correctedTimestamp: "2026-03-24T06:12:00Z",
    correctedEventType: "check_in",
    correctedContractorOrgNo: "5567654321",
    correctedRoleAtWorkplace: "installer",
    correctionReason: "Contractor snapshot corrected",
    actorId: "step29-unit"
  });
  assert.equal(correction.correctedContractorOrgNo, "5567654321");
  assert.equal(correction.correctedRoleAtWorkplace, "installer");
  assert.equal(personalliggare.listContractorSnapshots({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId
  }).length, 2);

  const revokedKiosk = personalliggare.revokeKioskDevice({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    kioskDeviceId: kiosk.kioskDeviceId,
    actorId: "step29-unit"
  });
  assert.equal(revokedKiosk.trustStatus, "revoked");

  assert.throws(() =>
    personalliggare.recordAttendanceEvent({
      companyId: COMPANY_ID,
      constructionSiteId: site.constructionSiteId,
      workerIdentityType: "personnummer",
      workerIdentityValue: "198902029999",
      fullNameSnapshot: "Sara Nilsson",
      employerOrgNo: "5561112227",
      contractorOrgNo: "5561234567",
      roleAtWorkplace: "installer",
      clientEventId: "evt-29-2",
      eventType: "check_out",
      eventTimestamp: "2026-03-24T15:00:00Z",
      sourceChannel: "kiosk",
      deviceId: kiosk.kioskDeviceId,
      actorId: "step29-unit"
    })
  );
});
