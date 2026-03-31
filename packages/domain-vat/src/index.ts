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
  readonly transactionLine: VatTransactionLine;
  readonly status: string;
  readonly lifecycleStatus?: "pending_review" | "approved" | "posted" | "declared" | "corrected";
  readonly declarationBoxCodes: readonly string[];
  readonly declarationBoxAmounts: readonly VatDecisionBoxAmount[];
  readonly postingEntries: readonly VatDecisionPostingEntry[];
  readonly bookingTemplateCode: string;
  readonly decisionCategory: string;
  readonly invoiceTextRequirements: readonly string[];
  readonly viesStatus: "valid" | "invalid" | "unverified" | "missing" | "not_applicable";
  readonly deductionRuleCode: "full_deduction" | "partial_deduction" | "blocked_deduction";
  readonly reverseChargeFlag: boolean;
  readonly ossFlag: boolean;
  readonly importFlag: boolean;
  readonly creditNoteFlag: boolean;
  readonly originalVatDecisionId: string | null;
  readonly outputs: VatDecisionOutputs;
  readonly warnings: readonly { code: string; message: string }[];
  readonly explanation: readonly string[];
  readonly reviewQueueCode: string | null;
  readonly reviewQueueItemId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly approvedAt?: string | null;
  readonly approvedByActorId?: string | null;
  readonly postedAt?: string | null;
  readonly postedByActorId?: string | null;
  readonly journalEntryIds?: readonly string[];
  readonly declaredAt?: string | null;
  readonly declaredByActorId?: string | null;
  readonly vatDeclarationRunIds?: readonly string[];
  readonly vatPeriodicStatementRunIds?: readonly string[];
  readonly correctedAt?: string | null;
  readonly correctedByActorId?: string | null;
  readonly lifecycleUpdatedAt?: string | null;
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
  readonly viesStatus: "valid" | "invalid" | "unverified" | "missing" | "not_applicable";
  readonly deductionRuleCode: "full_deduction" | "partial_deduction" | "blocked_deduction";
  readonly reverseChargeFlag: boolean;
  readonly ossFlag: boolean;
  readonly importFlag: boolean;
  readonly reportingChannel: "regular_vat_return" | "oss" | "ioss";
  readonly euListEligible: boolean;
  readonly ossRecord: VatSpecialSchemeRecord | null;
  readonly iossRecord: VatSpecialSchemeRecord | null;
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
  readonly resolutionCode?: string | null;
  readonly resolutionNote?: string | null;
  readonly resolvedVatCode?: string | null;
  readonly resolvedVatDecisionId?: string | null;
  readonly resolvedByActorId?: string | null;
  readonly resolvedAt?: string | null;
}

export interface VatTransactionLine {
  readonly seller_country: string | null;
  readonly seller_vat_registration_country: string | null;
  readonly buyer_country: string | null;
  readonly buyer_type: string | null;
  readonly buyer_vat_no: string | null;
  readonly supply_type: string | null;
  readonly goods_or_services: string | null;
  readonly invoice_date: string | null;
  readonly delivery_date: string | null;
  readonly currency: string | null;
  readonly line_amount_ex_vat: number | null;
  readonly vat_rate: number | null;
  readonly vat_code_candidate: string | null;
  readonly project_id: string | null;
  readonly source_type: string | null;
  readonly source_id: string | null;
  readonly buyer_is_taxable_person: boolean | null;
  readonly buyer_vat_number: string | null;
  readonly buyer_vat_number_status: string | null;
  readonly supply_subtype: string | null;
  readonly property_related_flag: boolean | null;
  readonly construction_service_flag: boolean | null;
  readonly transport_end_country: string | null;
  readonly import_flag: boolean | null;
  readonly export_flag: boolean | null;
  readonly reverse_charge_flag: boolean | null;
  readonly oss_flag: boolean | null;
  readonly ioss_flag: boolean | null;
  readonly tax_date: string | null;
  readonly prepayment_date: string | null;
  readonly line_discount: number | null;
  readonly line_quantity: number | null;
  readonly line_uom: string | null;
  readonly tax_rate_candidate: number | null;
  readonly exemption_reason: string | null;
  readonly invoice_text_code: string | null;
  readonly report_box_code: string | null;
  readonly credit_note_flag: boolean | null;
  readonly original_vat_decision_id: string | null;
  readonly deduction_ratio: number | null;
  readonly ecb_exchange_rate_to_eur: number | null;
  readonly consignment_value_eur: number | null;
  readonly region: "SE" | "EU" | "NON_EU" | null;
}

export interface VatSpecialSchemeRecord {
  readonly scheme: "oss" | "ioss";
  readonly identifierState: string;
  readonly orderType: string;
  readonly buyerCountry: string;
  readonly vatRate: number;
  readonly euroBaseAmount: number;
  readonly euroVatAmount: number;
  readonly originalCurrency: string | null;
  readonly exchangeRateToEur: number;
  readonly consignmentValueEur: number | null;
}

export interface VatSpecialSchemeSummaryRow {
  readonly scheme: "oss" | "ioss";
  readonly identifierState: string;
  readonly orderType: string;
  readonly buyerCountry: string;
  readonly vatRate: number;
  readonly euroBaseAmount: number;
  readonly euroVatAmount: number;
  readonly originalCurrencies: readonly string[];
  readonly exchangeRatesToEur: readonly number[];
}

export interface VatDeclarationAmountChange {
  readonly boxCode: string;
  readonly amountType: "taxable_base" | "output_vat" | "input_vat";
  readonly previousAmount: number;
  readonly currentAmount: number;
}

export interface VatDeclarationLedgerComparison {
  readonly matched: boolean;
  readonly reason: string | null;
  readonly expectedDebit: number;
  readonly expectedCredit: number;
  readonly actualDebit: number;
  readonly actualCredit: number;
  readonly matchedEntryCount?: number;
  readonly unmatchedExpectedLineCount?: number;
}

export interface VatDeclarationRun {
  readonly vatDeclarationRunId: string;
  readonly companyId: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly declarationBoxSummary: readonly VatDeclarationBoxSummary[];
  readonly ossSummary: readonly VatSpecialSchemeSummaryRow[];
  readonly iossSummary: readonly VatSpecialSchemeSummaryRow[];
  readonly ledgerComparison: VatDeclarationLedgerComparison;
  readonly previousSubmissionId: string | null;
  readonly correctionReason: string | null;
  readonly changedBoxes: readonly string[];
  readonly changedAmounts: readonly VatDeclarationAmountChange[];
  readonly signer: string;
  readonly submittedAt: string;
  readonly sourceSnapshotHash: string;
  readonly periodLockId?: string | null;
}

export interface VatPeriodLock {
  readonly vatPeriodLockId: string;
  readonly companyId: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly status: "locked" | "unlocked";
  readonly reasonCode: string;
  readonly basisSnapshotHash: string;
  readonly blockerCodes: readonly string[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly unlockedByActorId: string | null;
  readonly unlockedAt: string | null;
  readonly unlockReasonCode: string | null;
}

export interface VatDeclarationBasis {
  readonly companyId: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly decisionCount: number;
  readonly approvedDecisionCount?: number;
  readonly pendingReviewDecisionCount?: number;
  readonly declarationEligibleDecisionCount?: number;
  readonly decidedDecisionCount: number;
  readonly reviewRequiredDecisionCount: number;
  readonly regularDecisionCount: number;
  readonly ossDecisionCount: number;
  readonly iossDecisionCount: number;
  readonly declarationBoxSummary: readonly VatDeclarationBoxSummary[];
  readonly ossSummary: readonly VatSpecialSchemeSummaryRow[];
  readonly iossSummary: readonly VatSpecialSchemeSummaryRow[];
  readonly ledgerComparison: VatDeclarationLedgerComparison;
  readonly openReviewQueueItemCount: number;
  readonly openReviewQueueItems: readonly VatReviewQueueItem[];
  readonly reviewBoundaryCodes: readonly string[];
  readonly blockerCodes: readonly string[];
  readonly readyForLock: boolean;
  readonly readyForDeclaration: boolean;
  readonly activePeriodLock: VatPeriodLock | null;
  readonly sourceSnapshotHash: string;
}

export interface VatPeriodicStatementLine {
  readonly customerCountry: string;
  readonly customerVatNumber: string;
  readonly buyerVatNumberStatus: string | null;
  readonly goodsOrServices: "goods" | "services";
  readonly taxableAmount: number;
  readonly decisionIds: readonly string[];
}

export interface VatPeriodicStatementRun {
  readonly vatPeriodicStatementRunId: string;
  readonly companyId: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly lineCount: number;
  readonly lines: readonly VatPeriodicStatementLine[];
  readonly previousSubmissionId: string | null;
  readonly correctionReason: string | null;
  readonly sourceSnapshotHash: string;
  readonly generatedAt: string;
  readonly generatedByActorId: string;
}
