import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSONALLIGGARE_THRESHOLD_2026_EX_VAT,
  createPersonalliggarePlatform
} from "../../packages/domain-personalliggare/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.3 personalliggare preserves offline events, corrections and control-chain exports", () => {
  const personalliggarePlatform = createPersonalliggarePlatform({
    clock: () => new Date("2026-03-24T06:00:00Z")
  });

  const site = personalliggarePlatform.createConstructionSite({
    companyId: COMPANY_ID,
    siteCode: "SITE-TEST-001",
    siteName: "Construction test site",
    siteAddress: "Bygggatan 1, Stockholm",
    builderOrgNo: "5561234567",
    estimatedTotalCostExVat: PERSONALLIGGARE_THRESHOLD_2026_EX_VAT + 13200,
    startDate: "2026-03-20",
    actorId: "unit-test"
  });
  assert.equal(site.thresholdRequiredFlag, true);

  const registration = personalliggarePlatform.createConstructionSiteRegistration({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    registrationReference: "PL-TEST-001",
    status: "registered",
    checklistItems: ["site_created", "builder_confirmed"],
    registeredOn: "2026-03-20",
    actorId: "unit-test"
  });
  assert.equal(registration.status, "registered");

  const event = personalliggarePlatform.recordAttendanceEvent({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    workerIdentityType: "personnummer",
    workerIdentityValue: "198902029999",
    fullNameSnapshot: "Sara Nilsson",
    employerOrgNo: "5561112227",
    contractorOrgNo: "5561234567",
    eventType: "check_in",
    eventTimestamp: "2026-03-24T06:10:00Z",
    sourceChannel: "mobile",
    deviceId: "demo-device",
    offlineFlag: true,
    geoContext: { lat: 59.3293, lng: 18.0686 },
    actorId: "unit-test"
  });
  assert.equal(event.offlineFlag, true);

  const correction = personalliggarePlatform.correctAttendanceEvent({
    companyId: COMPANY_ID,
    attendanceEventId: event.attendanceEventId,
    correctedTimestamp: "2026-03-24T06:12:00Z",
    correctedEventType: "check_in",
    correctionReason: "Offline clock drift",
    actorId: "unit-test"
  });
  assert.equal(correction.correctionReason, "Offline clock drift");

  const events = personalliggarePlatform.listAttendanceEvents({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId
  });
  assert.equal(events.some((candidate) => candidate.attendanceEventId === event.attendanceEventId), true);
  assert.equal(events.some((candidate) => candidate.eventType === "correction"), true);

  const exportRecord = personalliggarePlatform.exportAttendanceControlChain({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    exportType: "audit",
    exportDate: "2026-03-24",
    actorId: "unit-test"
  });
  assert.equal(exportRecord.eventCount, 2);
  assert.equal(exportRecord.correctionCount, 1);
  assert.match(exportRecord.controlChainHash, /^[a-f0-9]{64}$/);

  const auditEvents = personalliggarePlatform.listAttendanceAuditEvents({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId
  });
  assert.equal(auditEvents.some((candidate) => candidate.action === "personalliggare.attendance_corrected"), true);
  assert.equal(auditEvents.some((candidate) => candidate.action === "personalliggare.export.created"), true);
});
