export interface VatCodeDefinition {
  readonly vatCodeId: string;
  readonly companyId: string;
  readonly vatCode: string;
  readonly label: string;
  readonly vatRate: number;
  readonly rateType: string;
  readonly declarationBoxCodes: readonly string[];
  readonly bookingTemplateCode: string;
  readonly activeFlag: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VatRulePack {
  readonly rulePackId: string;
  readonly domain: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly version: string;
  readonly checksum: string;
  readonly sourceSnapshotDate: string;
  readonly semanticChangeSummary: string;
  readonly machineReadableRules: Record<string, unknown>;
  readonly humanReadableExplanation: readonly string[];
  readonly testVectors: readonly Record<string, unknown>[];
  readonly migrationNotes: readonly string[];
}

export interface VatDecisionRecord {
  readonly vatDecisionId: string;
  readonly companyId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly vatCode: string;
  readonly decisionCode: string;
  readonly rulePackId: string;
  readonly rulePackVersion: string;
  readonly sourceSnapshotDate: string;
  readonly inputsHash: string;
  readonly effectiveDate: string;
  readonly status: string;
  readonly declarationBoxCodes: readonly string[];
  readonly declarationBoxAmounts: readonly VatDecisionBoxAmount[];
  readonly postingEntries: readonly VatDecisionPostingEntry[];
  readonly bookingTemplateCode: string;
  readonly decisionCategory: string;
  readonly invoiceTextRequirements: readonly string[];
  readonly creditNoteFlag: boolean;
  readonly originalVatDecisionId: string | null;
  readonly outputs: VatDecisionOutputs;
  readonly warnings: readonly { code: string; message: string }[];
  readonly explanation: readonly string[];
  readonly reviewQueueCode: string | null;
  readonly reviewQueueItemId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface VatDecisionBoxAmount {
  readonly boxCode: string;
  readonly amount: number;
  readonly amountType: "taxable_base" | "output_vat" | "input_vat";
}

export interface VatDecisionPostingEntry {
  readonly entryCode: string;
  readonly direction: "debit" | "credit";
  readonly amount: number;
  readonly vatEffect: "taxable_base" | "output_vat" | "input_vat";
}

export interface VatDecisionOutputs {
  readonly vatCode: string;
  readonly decisionCategory: string;
  readonly declarationBoxCodes: readonly string[];
  readonly declarationBoxAmounts: readonly VatDecisionBoxAmount[];
  readonly postingEntries: readonly VatDecisionPostingEntry[];
  readonly bookingTemplateCode: string;
  readonly invoiceTextRequirements: readonly string[];
  readonly vatRate: number;
  readonly rateType: string;
}

export interface VatDeclarationBoxSummary {
  readonly boxCode: string;
  readonly amountType: "taxable_base" | "output_vat" | "input_vat";
  readonly amount: number;
}

export interface VatReviewQueueItem {
  readonly vatReviewQueueItemId: string;
  readonly companyId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly inputsHash: string;
  readonly rulePackId: string;
  readonly effectiveDate: string;
  readonly reviewReasonCode: string;
  readonly reviewQueueCode: string;
  readonly vatCodeCandidate: string | null;
  readonly status: string;
  readonly warnings: readonly { code: string; message: string }[];
  readonly explanation: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
