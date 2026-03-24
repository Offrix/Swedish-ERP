export type EstimateVersionStatus = "draft" | "reviewed" | "approved" | "quoted" | "converted" | "superseded";
export type EstimateLineTypeCode = "labor" | "material" | "subcontractor" | "equipment" | "other";

export interface EstimateLineRef {
  readonly estimateLineId: string;
  readonly lineTypeCode: EstimateLineTypeCode;
  readonly description: string;
  readonly quantity: number;
  readonly unitCode: string;
  readonly costAmount: number;
  readonly salesAmount: number;
  readonly projectPhaseCode: string | null;
  readonly riskClassCode: string;
  readonly costModelCode: string;
}

export interface EstimateAssumptionRef {
  readonly estimateAssumptionId: string;
  readonly assumptionCode: string;
  readonly description: string;
  readonly impactAmount: number;
}

export interface EstimateQuoteConversionRef {
  readonly quoteConversionId: string;
  readonly estimateVersionId: string;
  readonly customerId: string;
  readonly title: string;
  readonly currencyCode: string;
  readonly validUntil: string | null;
  readonly payload: {
    readonly customerId: string;
    readonly title: string;
    readonly validUntil: string | null;
    readonly currencyCode: string;
    readonly lines: readonly {
      readonly description: string;
      readonly quantity: number;
      readonly unitCode: string;
      readonly unitPrice: number;
    }[];
  };
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface EstimateProjectBudgetConversionRef {
  readonly projectBudgetVersionId: string;
  readonly projectId: string;
  readonly reportingPeriod: string;
  readonly lineCount: number;
  readonly convertedAt: string;
  readonly createdByActorId: string;
}

export interface EstimateVersionRef {
  readonly estimateVersionId: string;
  readonly companyId: string;
  readonly estimateNo: string;
  readonly versionNo: number;
  readonly supersedesEstimateVersionId: string | null;
  readonly supersededByEstimateVersionId: string | null;
  readonly customerId: string;
  readonly projectId: string | null;
  readonly title: string;
  readonly status: EstimateVersionStatus;
  readonly currencyCode: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly lines: readonly EstimateLineRef[];
  readonly assumptions: readonly EstimateAssumptionRef[];
  readonly quoteConversion: EstimateQuoteConversionRef | null;
  readonly projectBudgetConversion: EstimateProjectBudgetConversionRef | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly totals?: {
    readonly lineCount: number;
    readonly assumptionCount: number;
    readonly totalCostAmount: number;
    readonly totalSalesAmount: number;
    readonly assumptionImpactAmount: number;
    readonly marginAmount: number;
    readonly marginPercent: number;
  };
}
