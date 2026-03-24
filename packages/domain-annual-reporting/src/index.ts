export type AnnualReportProfileCode = "k1" | "k2" | "k3";
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
  readonly fiscalYearId: string | null;
  readonly profileCode: AnnualReportProfileCode;
  readonly legalFormProfileId: string;
  readonly legalFormCode: string;
  readonly reportingObligationProfileId: string;
  readonly declarationProfileCode: string;
  readonly signatoryClassCode: string;
  readonly filingProfileCode: string;
  readonly packageFamilyCode: string;
  readonly correctionOfPackageId: string | null;
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

export interface AnnualEvidencePackRef {
  readonly evidencePackId: string;
  readonly companyId: string;
  readonly packageId: string;
  readonly versionId: string | null;
  readonly accountingPeriodId: string;
  readonly fiscalYearId: string | null;
  readonly fiscalYear: string;
  readonly legalFormProfileId: string;
  readonly reportingObligationProfileId: string;
  readonly declarationProfileCode: string;
  readonly packageFamilyCode: string;
  readonly sourceFingerprint: string;
  readonly checksum: string;
}

export interface TaxDeclarationPackageRef {
  readonly taxDeclarationPackageId: string;
  readonly annualReportPackageId: string;
  readonly annualReportVersionId: string;
  readonly companyId: string;
  readonly fiscalYear: string;
  readonly packageCode: string;
  readonly declarationProfileCode: string;
  readonly packageFamilyCode: string;
  readonly status: TaxDeclarationPackageStatus;
  readonly outputChecksum: string;
}
