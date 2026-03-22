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
