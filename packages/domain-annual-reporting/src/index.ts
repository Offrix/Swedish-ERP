export type AnnualReportProfileCode = "k2" | "k3";
export type AnnualReportPackageStatus = "draft" | "ready_for_signature" | "signed" | "submitted" | "locked" | "superseded";
export type AnnualReportSignatoryStatus = "invited" | "signed" | "declined" | "superseded";
export type TaxDeclarationPackageStatus = "ready" | "submitted" | "accepted" | "rejected" | "superseded";

export interface AnnualReportVersionRef {
  readonly packageId: string;
  readonly versionId: string;
  readonly checksum: string;
}

export interface AnnualReportPackageRef {
  readonly packageId: string;
  readonly companyId: string;
  readonly accountingPeriodId: string;
  readonly fiscalYear: string;
  readonly profileCode: AnnualReportProfileCode;
  readonly status: AnnualReportPackageStatus;
}

export interface AnnualReportSignatoryRef {
  readonly signatoryId: string;
  readonly packageId: string;
  readonly versionId: string;
  readonly companyUserId: string;
  readonly userId: string;
  readonly signatoryRole: string;
  readonly status: AnnualReportSignatoryStatus;
}

export interface TaxDeclarationPackageRef {
  readonly taxDeclarationPackageId: string;
  readonly annualReportPackageId: string;
  readonly annualReportVersionId: string;
  readonly companyId: string;
  readonly fiscalYear: string;
  readonly packageCode: string;
  readonly status: TaxDeclarationPackageStatus;
  readonly outputChecksum: string;
}
