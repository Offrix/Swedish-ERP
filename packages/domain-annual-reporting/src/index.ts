export type AnnualReportProfileCode = "k1" | "k2" | "k3";
export type AnnualReportPackageStatus = "draft" | "ready_for_signature" | "signed" | "submitted" | "locked" | "superseded";
export type AnnualReportSignatoryStatus = "invited" | "signed" | "declined" | "superseded";
export type TaxDeclarationPackageStatus = "ready" | "submitted" | "accepted" | "rejected" | "superseded";
export type CurrentTaxComputationStatus = "prepared";
export type CurrentTaxDeterminationStatus = "computed" | "not_applicable";

export interface AnnualReportVersionRef {
  readonly packageId: string;
  readonly versionId: string;
  readonly checksum: string;
  readonly lockedAt?: string | null;
  readonly signoffHash?: string | null;
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
  readonly signatureReference?: string | null;
  readonly signatureArchiveRef?: string | null;
  readonly evidenceArchiveId?: string | null;
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
  readonly signatureArchiveRefs?: readonly Record<string, unknown>[];
  readonly signoffRefs?: readonly Record<string, unknown>[];
}

export interface TaxAdjustmentLineRef {
  readonly taxAdjustmentLineId: string;
  readonly adjustmentCode: string;
  readonly description?: string | null;
  readonly amount: number;
  readonly evidenceRef?: string | null;
}

export interface CurrentTaxComputationRef {
  readonly currentTaxComputationId: string;
  readonly annualReportPackageId: string;
  readonly annualReportVersionId: string;
  readonly companyId: string;
  readonly fiscalYear: string;
  readonly legalFormCode: string;
  readonly declarationProfileCode: string;
  readonly status: CurrentTaxComputationStatus;
  readonly determinationStatus: CurrentTaxDeterminationStatus;
  readonly determinationReasonCode: string;
  readonly taxRatePercent: number;
  readonly taxRateDecimal: number;
  readonly bookResultBeforeTaxAmount: number;
  readonly taxAdjustmentAmount: number;
  readonly taxableResultAmount: number;
  readonly taxableBaseAmount: number;
  readonly lossCarryforwardCandidateAmount: number;
  readonly currentTaxAmount: number;
  readonly specialPayrollTaxReferenceAmount: number;
  readonly closingJournalRefs?: readonly Record<string, unknown>[];
  readonly taxAdjustmentLines?: readonly TaxAdjustmentLineRef[];
  readonly outputChecksum: string;
}

export interface TaxDeclarationPackageRef {
  readonly taxDeclarationPackageId: string;
  readonly annualReportPackageId: string;
  readonly annualReportVersionId: string;
  readonly companyId: string;
  readonly fiscalYear: string;
  readonly packageCode: string;
  readonly declarationProfileCode: string;
  readonly signatoryClassCode?: string;
  readonly filingProfileCode?: string;
  readonly packageFamilyCode: string;
  readonly status: TaxDeclarationPackageStatus;
  readonly outputChecksum: string;
  readonly annualReportVersionChecksum?: string;
  readonly annualReportVersionLockedAt?: string | null;
  readonly annualReportVersionSignoffHash?: string | null;
  readonly currentTaxComputationId?: string;
  readonly currentTaxComputation?: CurrentTaxComputationRef;
  readonly closingJournalRefs?: readonly Record<string, unknown>[];
}
