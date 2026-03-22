export interface DomainEnvelope {
  readonly companyId: string;
  readonly correlationId: string;
  readonly createdAt: string;
}

export interface BureauPortfolioMembership {
  readonly portfolioId: string;
  readonly bureauOrgId: string;
  readonly clientCompanyId: string;
  readonly responsibleConsultantId: string;
  readonly backupConsultantId: string | null;
  readonly statusProfile: string;
  readonly criticality: string;
  readonly activeFrom: string;
  readonly activeTo: string | null;
}

export interface BureauClientRequest {
  readonly requestId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly requestType: string;
  readonly deadlineAt: string;
  readonly blockerScope: string;
  readonly status: string;
}

export interface BureauApprovalPackage {
  readonly approvalPackageId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly approvalType: string;
  readonly approvalDeadlineAt: string;
  readonly status: string;
}

export interface CoreWorkItem {
  readonly workItemId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly blockerScope: string;
  readonly status: string;
}

export interface CloseChecklistStep {
  readonly stepId: string;
  readonly stepCode: string;
  readonly title: string;
  readonly mandatory: boolean;
  readonly status: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly evidenceType: string;
  readonly reconciliationAreaCode: string | null;
}

export interface CloseChecklist {
  readonly checklistId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly accountingPeriodId: string;
  readonly checklistVersion: number;
  readonly status: string;
  readonly closeState: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly signoffChain: readonly {
    readonly sequence: number;
    readonly companyUserId: string;
    readonly userId: string;
    readonly roleCode: string;
    readonly label: string;
  }[];
  readonly steps: readonly CloseChecklistStep[];
}

export interface CloseBlocker {
  readonly blockerId: string;
  readonly bureauOrgId: string;
  readonly checklistId: string;
  readonly stepId: string;
  readonly severity: string;
  readonly reasonCode: string;
  readonly status: string;
  readonly overrideState: string;
}

export interface CloseSignoffRecord {
  readonly signoffId: string;
  readonly checklistId: string;
  readonly sequence: number;
  readonly signatoryRole: string;
  readonly signatoryCompanyUserId: string;
  readonly signatoryUserId: string;
  readonly decision: string;
  readonly decisionAt: string;
}

export interface CloseReopenRequest {
  readonly reopenRequestId: string;
  readonly checklistId: string;
  readonly successorChecklistId: string;
  readonly requestedByUserId: string;
  readonly approvedByUserId: string;
  readonly approvedByRoleCode: string;
  readonly reasonCode: string;
  readonly impactSummary: string;
  readonly createdAt: string;
}
