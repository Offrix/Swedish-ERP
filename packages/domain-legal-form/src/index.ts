export type LegalFormCode =
  | "AKTIEBOLAG"
  | "EKONOMISK_FORENING"
  | "ENSKILD_NARINGSVERKSAMHET"
  | "HANDELSBOLAG"
  | "KOMMANDITBOLAG";

export type DeclarationProfileCode = "INK2" | "INK4" | "NE";
export type LegalFormProfileStatus = "planned" | "active" | "historical" | "superseded";
export type ReportingObligationProfileStatus = "draft" | "approved" | "historical" | "superseded";

export interface LegalFormProfileRef {
  readonly legalFormProfileId: string;
  readonly companyId: string;
  readonly legalFormCode: LegalFormCode;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly filingProfileCode: string;
  readonly signatoryClassCode: string;
  readonly declarationProfileCode: DeclarationProfileCode;
  readonly status: LegalFormProfileStatus;
}

export interface ReportingObligationProfileRef {
  readonly reportingObligationProfileId: string;
  readonly companyId: string;
  readonly legalFormProfileId: string;
  readonly legalFormCode: LegalFormCode;
  readonly fiscalYearKey: string;
  readonly fiscalYearId: string | null;
  readonly accountingPeriodId: string | null;
  readonly requiresAnnualReport: boolean;
  readonly requiresYearEndAccounts: boolean;
  readonly allowsSimplifiedYearEnd: boolean;
  readonly requiresBolagsverketFiling: boolean;
  readonly requiresTaxDeclarationPackage: boolean;
  readonly declarationProfileCode: DeclarationProfileCode;
  readonly signatoryClassCode: string;
  readonly filingProfileCode: string;
  readonly packageFamilyCode: string;
  readonly status: ReportingObligationProfileStatus;
}
