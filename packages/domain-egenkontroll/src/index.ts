export type EgenkontrollTemplateStatus = "draft" | "active" | "retired";
export type EgenkontrollInstanceStatus = "draft" | "assigned" | "in_progress" | "review_required" | "signed_off" | "closed";
export type EgenkontrollPointResultCode = "pass" | "fail" | "not_applicable" | "deviation";
export type EgenkontrollDeviationStatus = "open" | "acknowledged" | "resolved";
export type EgenkontrollDeviationSeverity = "minor" | "major" | "critical";
export type EgenkontrollSignoffRoleCode = "site_lead" | "reviewer" | "project_manager";

export interface ChecklistTemplatePointRef {
  readonly pointCode: string;
  readonly label: string;
  readonly instructionText: string | null;
  readonly evidenceRequiredFlag: boolean;
}

export interface ChecklistTemplateSectionRef {
  readonly sectionCode: string;
  readonly label: string;
  readonly points: readonly ChecklistTemplatePointRef[];
}

export interface ChecklistTemplateRef {
  readonly checklistTemplateId: string;
  readonly companyId: string;
  readonly templateCode: string;
  readonly displayName: string;
  readonly industryPackCode: string;
  readonly riskClassCode: string;
  readonly version: number;
  readonly status: EgenkontrollTemplateStatus;
  readonly sections: readonly ChecklistTemplateSectionRef[];
  readonly requiredSignoffRoleCodes: readonly EgenkontrollSignoffRoleCode[];
  readonly pointCodes: readonly string[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ChecklistPointOutcomeRef {
  readonly checklistPointOutcomeId: string;
  readonly checklistInstanceId: string;
  readonly companyId: string;
  readonly pointCode: string;
  readonly pointLabel: string;
  readonly resultCode: EgenkontrollPointResultCode;
  readonly note: string | null;
  readonly documentIds: readonly string[];
  readonly revisionNo: number;
  readonly supersedesChecklistPointOutcomeId: string | null;
  readonly supersededAt: string | null;
  readonly payloadHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ChecklistDeviationRef {
  readonly checklistDeviationId: string;
  readonly checklistInstanceId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly workOrderId: string | null;
  readonly pointCode: string;
  readonly severityCode: EgenkontrollDeviationSeverity;
  readonly title: string;
  readonly description: string;
  readonly documentIds: readonly string[];
  readonly status: EgenkontrollDeviationStatus;
  readonly ownerUserId: string | null;
  readonly acknowledgedAt: string | null;
  readonly acknowledgedByActorId: string | null;
  readonly resolvedAt: string | null;
  readonly resolvedByActorId: string | null;
  readonly resolutionNote: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ChecklistSignoffRef {
  readonly checklistSignoffId: string;
  readonly checklistInstanceId: string;
  readonly companyId: string;
  readonly signoffRoleCode: EgenkontrollSignoffRoleCode;
  readonly note: string | null;
  readonly signedByActorId: string;
  readonly signedAt: string;
}

export interface ChecklistInstanceRef {
  readonly checklistInstanceId: string;
  readonly companyId: string;
  readonly checklistTemplateId: string;
  readonly templateCode: string;
  readonly templateVersion: number;
  readonly projectId: string;
  readonly workOrderId: string | null;
  readonly status: EgenkontrollInstanceStatus;
  readonly assignedToUserId: string | null;
  readonly dueDate: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly closedAt: string | null;
  readonly requiredPointCodes: readonly string[];
  readonly requiredSignoffRoleCodes: readonly EgenkontrollSignoffRoleCode[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly template?: ChecklistTemplateRef | null;
  readonly latestPointOutcomes?: readonly ChecklistPointOutcomeRef[];
  readonly deviations?: readonly ChecklistDeviationRef[];
  readonly signoffs?: readonly ChecklistSignoffRef[];
  readonly pointOutcomeHistory?: readonly ChecklistPointOutcomeRef[];
  readonly summary?: {
    readonly totalPointCount: number;
    readonly completedPointCount: number;
    readonly unresolvedDeviationCount: number;
    readonly requiredSignoffRoleCodes: readonly EgenkontrollSignoffRoleCode[];
    readonly collectedSignoffRoleCodes: readonly EgenkontrollSignoffRoleCode[];
    readonly pendingSignoffRoleCodes: readonly EgenkontrollSignoffRoleCode[];
  };
}
