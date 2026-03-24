import test from "node:test";
import assert from "node:assert/strict";
import { createEgenkontrollPlatform } from "../../packages/domain-egenkontroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "project-30";
const WORK_ORDER_ID = "work-order-30";

test("Step 30 egenkontroll versions templates, blocks incomplete sign-off and resolves deviations append-only", () => {
  const egenkontroll = createEgenkontrollPlatform({
    clock: () => new Date("2026-03-24T10:00:00Z"),
    projectsPlatform: {
      getProject: ({ projectId }) => ({ projectId })
    },
    fieldPlatform: {
      getWorkOrder: ({ workOrderId }) => ({ workOrderId, projectId: PROJECT_ID })
    }
  });

  const template = egenkontroll.createChecklistTemplate({
    companyId: COMPANY_ID,
    templateCode: "EK-BYGG",
    displayName: "Bygg egenkontroll",
    sections: [
      {
        sectionCode: "prep",
        label: "Förarbete",
        points: [
          {
            pointCode: "site_signage",
            label: "Skyltning på plats",
            evidenceRequiredFlag: false
          },
          {
            pointCode: "cable_photo",
            label: "Bild på kabeldragning",
            evidenceRequiredFlag: true
          }
        ]
      }
    ],
    requiredSignoffRoleCodes: ["site_lead", "reviewer"],
    actorId: "step30-unit"
  });
  assert.equal(template.version, 1);
  assert.equal(template.status, "draft");

  const activeTemplate = egenkontroll.activateChecklistTemplate({
    companyId: COMPANY_ID,
    checklistTemplateId: template.checklistTemplateId,
    actorId: "step30-unit"
  });
  assert.equal(activeTemplate.status, "active");

  const instance = egenkontroll.createChecklistInstance({
    companyId: COMPANY_ID,
    checklistTemplateId: activeTemplate.checklistTemplateId,
    projectId: PROJECT_ID,
    workOrderId: WORK_ORDER_ID,
    assignedToUserId: "field-user-1",
    actorId: "step30-unit"
  });
  assert.equal(instance.status, "assigned");

  const started = egenkontroll.startChecklistInstance({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    actorId: "field-user-1"
  });
  assert.equal(started.status, "in_progress");

  egenkontroll.recordChecklistPointOutcome({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    pointCode: "site_signage",
    resultCode: "pass",
    actorId: "field-user-1"
  });

  assert.throws(() =>
    egenkontroll.signOffChecklist({
      companyId: COMPANY_ID,
      checklistInstanceId: instance.checklistInstanceId,
      signoffRoleCode: "site_lead",
      actorId: "site-lead-1"
    })
  );

  const firstCableOutcome = egenkontroll.recordChecklistPointOutcome({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    pointCode: "cable_photo",
    resultCode: "fail",
    note: "Foto saknas i första passet",
    documentIds: ["doc-before"],
    actorId: "field-user-1"
  });
  assert.equal(firstCableOutcome.revisionNo, 1);

  const revisedCableOutcome = egenkontroll.recordChecklistPointOutcome({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    pointCode: "cable_photo",
    resultCode: "pass",
    note: "Foto uppladdat efter kontroll",
    documentIds: ["doc-after"],
    actorId: "field-user-1"
  });
  assert.equal(revisedCableOutcome.revisionNo, 2);

  const deviation = egenkontroll.raiseChecklistDeviation({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    pointCode: "cable_photo",
    severityCode: "major",
    title: "Skyddsrör inte märkt",
    description: "Skyddsröret saknade märkning vid första kontrollen.",
    actorId: "field-user-1"
  });
  assert.equal(deviation.status, "open");

  assert.throws(() =>
    egenkontroll.signOffChecklist({
      companyId: COMPANY_ID,
      checklistInstanceId: instance.checklistInstanceId,
      signoffRoleCode: "site_lead",
      actorId: "site-lead-1"
    })
  );

  const acknowledged = egenkontroll.acknowledgeChecklistDeviation({
    companyId: COMPANY_ID,
    checklistDeviationId: deviation.checklistDeviationId,
    actorId: "reviewer-1"
  });
  assert.equal(acknowledged.status, "acknowledged");

  const resolved = egenkontroll.resolveChecklistDeviation({
    companyId: COMPANY_ID,
    checklistDeviationId: deviation.checklistDeviationId,
    resolutionNote: "Märkning monterad och verifierad.",
    actorId: "reviewer-1"
  });
  assert.equal(resolved.status, "resolved");

  const siteLeadSignoff = egenkontroll.signOffChecklist({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    signoffRoleCode: "site_lead",
    actorId: "site-lead-1"
  });
  assert.equal(siteLeadSignoff.checklistInstance.status, "signed_off");

  const reviewerSignoff = egenkontroll.signOffChecklist({
    companyId: COMPANY_ID,
    checklistInstanceId: instance.checklistInstanceId,
    signoffRoleCode: "reviewer",
    actorId: "reviewer-1"
  });
  assert.equal(reviewerSignoff.checklistInstance.status, "closed");
  assert.equal(reviewerSignoff.checklistInstance.summary.unresolvedDeviationCount, 0);
  assert.equal(reviewerSignoff.checklistInstance.summary.completedPointCount, 2);
  assert.equal(reviewerSignoff.checklistInstance.pointOutcomeHistory.length, 3);
});
