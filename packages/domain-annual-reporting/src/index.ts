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
  readonly profileCode: "k2" | "k3";
  readonly status: string;
}

export interface AnnualReportSignatoryRef {
  readonly signatoryId: string;
  readonly packageId: string;
  readonly versionId: string;
  readonly companyUserId: string;
  readonly userId: string;
  readonly signatoryRole: string;
  readonly status: string;
}
