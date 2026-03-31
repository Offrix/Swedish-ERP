export type SieFormatCode = "SIE4";
export type SieImportModeCode = "opening_balance_batch" | "journal_history";

export interface SieExportJob {
  readonly sieExportJobId: string;
  readonly companyId: string;
  readonly status: "completed";
  readonly formatCode: SieFormatCode;
  readonly fiscalYearId: string | null;
  readonly fromDate: string | null;
  readonly toDate: string | null;
  readonly fileName: string;
  readonly checksumAlgorithm: "sha256";
  readonly checksum: string;
  readonly lineCount: number;
  readonly companyProfile: {
    readonly legalName: string | null;
    readonly orgNumber: string | null;
  };
  readonly scope: {
    readonly fiscalYearIds: readonly string[];
    readonly journalEntryCount: number;
    readonly openingBalanceBatchCount: number;
    readonly accountCount: number;
  };
  readonly content: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly completedAt: string;
  readonly correlationId: string;
}

export interface SieImportJob {
  readonly sieImportJobId: string;
  readonly companyId: string;
  readonly status: "applied";
  readonly modeCode: SieImportModeCode;
  readonly formatCode: SieFormatCode;
  readonly fileName: string | null;
  readonly fiscalYearId: string | null;
  readonly checksumAlgorithm: "sha256";
  readonly checksum: string;
  readonly summary: {
    readonly accountCount: number;
    readonly rangeCount: number;
    readonly openingBalanceLineCount: number;
    readonly voucherCount: number;
    readonly importedJournalEntryCount: number;
  };
  readonly openingBalanceBatchId: string | null;
  readonly importedJournalEntryIds: readonly string[];
  readonly sourceCode: string;
  readonly externalReference: string | null;
  readonly parsedProgramName: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly completedAt: string;
  readonly correlationId: string;
}

export interface SieSnapshot {
  readonly sieExportJobs: readonly SieExportJob[];
  readonly sieImportJobs: readonly SieImportJob[];
}

export declare const SIE_FORMAT_CODE: SieFormatCode;
export declare const SIE_EXPORT_JOB_STATUSES: readonly ["completed"];
export declare const SIE_IMPORT_JOB_STATUSES: readonly ["applied"];
export declare const SIE_IMPORT_MODE_CODES: readonly SieImportModeCode[];

export declare function createSiePlatform(options?: Record<string, unknown>): {
  exportSie4: typeof exportSie4;
  listSieExportJobs: typeof listSieExportJobs;
  getSieExportJob: typeof getSieExportJob;
  importSie4: typeof importSie4;
  listSieImportJobs: typeof listSieImportJobs;
  getSieImportJob: typeof getSieImportJob;
  snapshotSie: typeof snapshotSie;
  exportDurableState: () => unknown;
  importDurableState: (snapshot: unknown) => void;
};

export declare function createSieEngine(options?: Record<string, unknown>): ReturnType<typeof createSiePlatform>;

export declare function exportSie4(options: {
  companyId: string;
  fiscalYearId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  fileName?: string | null;
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): SieExportJob;

export declare function listSieExportJobs(options: { companyId: string }): readonly SieExportJob[];

export declare function getSieExportJob(options: {
  companyId: string;
  sieExportJobId: string;
}): SieExportJob;

export declare function importSie4(options: {
  companyId: string;
  modeCode: SieImportModeCode;
  content: string;
  fileName?: string | null;
  fiscalYearId?: string | null;
  openingDate?: string | null;
  sourceCode?: string | null;
  externalReference?: string | null;
  evidenceRefs?: readonly string[];
  actorId: string;
  idempotencyKey: string;
  correlationId?: string;
}): SieImportJob;

export declare function listSieImportJobs(options: { companyId: string }): readonly SieImportJob[];

export declare function getSieImportJob(options: {
  companyId: string;
  sieImportJobId: string;
}): SieImportJob;

export declare function snapshotSie(): SieSnapshot;
