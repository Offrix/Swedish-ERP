import test from "node:test";
import assert from "node:assert/strict";
import { createPersonalliggarePlatform } from "../../packages/domain-personalliggare/src/index.mjs";
import { createId06Engine } from "../../packages/domain-id06/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 28 builds an ID06 chain from company and person verification to workplace evidence", () => {
  const personalliggare = createPersonalliggarePlatform({
    clock: () => new Date("2026-03-25T08:00:00Z")
  });
  const id06 = createId06Engine({
    clock: () => new Date("2026-03-25T08:00:00Z"),
    personalliggarePlatform: personalliggare
  });

  const site = personalliggare.createConstructionSite({
    companyId: COMPANY_ID,
    siteCode: "ID06-UNIT-SITE-001",
    siteName: "ID06 Unit Site",
    siteAddress: "Kontrollgatan 1, Stockholm",
    builderOrgNo: "5561234567",
    estimatedTotalCostExVat: 500000,
    startDate: "2026-03-24",
    workplaceIdentifier: "ID06-WP-001",
    actorId: "id06-unit"
  });
  personalliggare.createConstructionSiteRegistration({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    registrationReference: "PL-ID06-001",
    status: "active",
    checklistItems: ["site_created", "builder_confirmed"],
    equipmentStatus: "available",
    registeredOn: "2026-03-24",
    actorId: "id06-unit"
  });

  const companyVerification = id06.verifyCompany({
    companyId: COMPANY_ID,
    orgNo: "5561112222",
    companyName: "Demo Employer AB",
    actorId: "id06-unit"
  });
  assert.equal(companyVerification.status, "verified");

  const personVerification = id06.verifyPerson({
    companyId: COMPANY_ID,
    workerIdentityValue: "198902029999",
    fullNameSnapshot: "Sara Nilsson",
    actorId: "id06-unit"
  });
  assert.equal(personVerification.status, "verified");

  const cardStatus = id06.validateCard({
    companyId: COMPANY_ID,
    employerOrgNo: "5561112222",
    workerIdentityValue: "198902029999",
    cardReference: "ID06-CARD-001",
    maskedCardNumber: "****0001",
    actorId: "id06-unit"
  });
  assert.equal(cardStatus.status, "active");

  const binding = id06.createWorkplaceBinding({
    companyId: COMPANY_ID,
    workplaceId: site.workplaceId,
    employerOrgNo: "5561112222",
    workerIdentityValue: "198902029999",
    cardReference: "ID06-CARD-001",
    actorId: "id06-unit"
  });
  assert.equal(binding.status, "active");
  assert.equal(binding.workplaceIdentifier, "ID06-WP-001");

  personalliggare.recordAttendanceEvent({
    companyId: COMPANY_ID,
    constructionSiteId: site.constructionSiteId,
    workerIdentityType: "personnummer",
    workerIdentityValue: "198902029999",
    fullNameSnapshot: "Sara Nilsson",
    employerOrgNo: "5561112222",
    contractorOrgNo: "5561234567",
    roleAtWorkplace: "installer",
    clientEventId: "id06-unit-attendance-1",
    eventType: "check_in",
    eventTimestamp: "2026-03-25T08:15:00Z",
    sourceChannel: "mobile",
    offlineFlag: false,
    actorId: "id06-unit"
  });

  const evidenceBundle = id06.exportWorkplaceEvidence({
    companyId: COMPANY_ID,
    workplaceId: site.workplaceId,
    actorId: "id06-unit"
  });
  assert.equal(evidenceBundle.bindingCount, 1);
  assert.equal(evidenceBundle.workPassCount, 1);
  assert.equal(evidenceBundle.attendanceMirrorCount, 1);

  const workPasses = id06.listWorkPasses({
    companyId: COMPANY_ID,
    workplaceId: site.workplaceId
  });
  assert.equal(workPasses.length, 1);
  assert.equal(workPasses[0].status, "issued");

  const mirrors = id06.listAttendanceMirrors({
    companyId: COMPANY_ID,
    workplaceId: site.workplaceId
  });
  assert.equal(mirrors.length, 1);

  const auditEvents = id06.listAuditEvents({
    companyId: COMPANY_ID,
    workplaceId: site.workplaceId
  });
  assert.equal(auditEvents.some((item) => item.action === "id06.binding.activated"), true);
  assert.equal(auditEvents.some((item) => item.action === "id06.export.created"), true);
});
