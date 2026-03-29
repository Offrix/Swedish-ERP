import { cloneValue as clone } from "./clone.mjs";

export const COMMIT_LAG_STATES = Object.freeze(["healthy", "degraded", "critical"]);
export const PROJECTION_REBUILD_GATE_STATES = Object.freeze(["healthy", "warning", "blocking"]);

const DEFAULT_COMMIT_LAG_WARNING_MINUTES = 15;
const DEFAULT_COMMIT_LAG_CRITICAL_MINUTES = 60;
const DEFAULT_PROJECTION_RUNNING_STALE_MINUTES = 15;

export function summarizeTransactionBoundary({
  commandReceipts = [],
  outboxMessages = [],
  asOf = null,
  warningLagMinutes = DEFAULT_COMMIT_LAG_WARNING_MINUTES,
  criticalLagMinutes = DEFAULT_COMMIT_LAG_CRITICAL_MINUTES
} = {}) {
  const resolvedAsOf = normalizeTimestamp(asOf);
  const receiptItems = normalizeRecords(commandReceipts);
  const outboxItems = normalizeRecords(outboxMessages);
  const pendingOutboxItems = outboxItems.filter((item) => !item.publishedAt && item.status !== "published");
  const groupedByDomainKey = new Map();

  for (const receipt of receiptItems) {
    const domainKey = normalizeOptionalText(receipt.domainKey) || "__unknown__";
    const entry = getOrCreateDomainEntry(groupedByDomainKey, domainKey);
    entry.committedCount += 1;
    entry.latestCommittedAt = maxTimestamp(entry.latestCommittedAt, receipt.recordedAt);
  }

  for (const outboxMessage of outboxItems) {
    const domainKey = normalizeOptionalText(outboxMessage.domainKey) || "__unknown__";
    const entry = getOrCreateDomainEntry(groupedByDomainKey, domainKey);
    entry.outboxCount += 1;
    entry.latestOutboxRecordedAt = maxTimestamp(entry.latestOutboxRecordedAt, outboxMessage.recordedAt);
    entry.latestPublishedAt = maxTimestamp(entry.latestPublishedAt, outboxMessage.publishedAt);
    if (!outboxMessage.publishedAt && outboxMessage.status !== "published") {
      const lagMinutes = ageMinutes({ recordedAt: outboxMessage.recordedAt, asOf: resolvedAsOf });
      entry.unpublishedCount += 1;
      entry.oldestUnpublishedAt = minTimestamp(entry.oldestUnpublishedAt, outboxMessage.recordedAt);
      entry.oldestUnpublishedAgeMinutes = maxNumber(entry.oldestUnpublishedAgeMinutes, lagMinutes);
      if (outboxMessage.status === "dead_lettered") {
        entry.deadLetteredCount += 1;
      }
    }
  }

  const items = [...groupedByDomainKey.values()]
    .map((entry) => {
      const lagState = resolveCommitLagState({
        unpublishedCount: entry.unpublishedCount,
        oldestUnpublishedAgeMinutes: entry.oldestUnpublishedAgeMinutes,
        deadLetteredCount: entry.deadLetteredCount,
        warningLagMinutes,
        criticalLagMinutes
      });
      return {
        domainKey: entry.domainKey,
        committedCount: entry.committedCount,
        outboxCount: entry.outboxCount,
        unpublishedCount: entry.unpublishedCount,
        deadLetteredCount: entry.deadLetteredCount,
        latestCommittedAt: entry.latestCommittedAt,
        latestOutboxRecordedAt: entry.latestOutboxRecordedAt,
        latestPublishedAt: entry.latestPublishedAt,
        oldestUnpublishedAt: entry.oldestUnpublishedAt,
        oldestUnpublishedAgeMinutes: entry.oldestUnpublishedAgeMinutes,
        lagState
      };
    })
    .sort((left, right) => {
      const severityDiff = lagStateRank(right.lagState) - lagStateRank(left.lagState);
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return String(left.domainKey).localeCompare(String(right.domainKey));
    });

  const oldestUnpublishedAgeMinutes = pendingOutboxItems.reduce(
    (maxAge, item) => maxNumber(maxAge, ageMinutes({ recordedAt: item.recordedAt, asOf: resolvedAsOf })),
    null
  );
  const lagState = resolveCommitLagState({
    unpublishedCount: pendingOutboxItems.length,
    oldestUnpublishedAgeMinutes,
    deadLetteredCount: pendingOutboxItems.filter((item) => item.status === "dead_lettered").length,
    warningLagMinutes,
    criticalLagMinutes
  });

  return clone({
    asOf: resolvedAsOf,
    warningLagMinutes,
    criticalLagMinutes,
    summary: {
      commandReceiptCount: receiptItems.length,
      outboxMessageCount: outboxItems.length,
      unpublishedOutboxCount: pendingOutboxItems.length,
      deadLetteredOutboxCount: pendingOutboxItems.filter((item) => item.status === "dead_lettered").length,
      laggingDomainCount: items.filter((item) => item.lagState !== "healthy").length,
      oldestUnpublishedAgeMinutes,
      latestCommittedAt: receiptItems.reduce((latest, item) => maxTimestamp(latest, item.recordedAt), null),
      latestPublishedAt: outboxItems.reduce((latest, item) => maxTimestamp(latest, item.publishedAt), null),
      lagState
    },
    items
  });
}

export function summarizeProjectionRebuildGates({
  projectionContracts = [],
  projectionCheckpoints = [],
  asOf = null,
  runningStaleMinutes = DEFAULT_PROJECTION_RUNNING_STALE_MINUTES
} = {}) {
  const resolvedAsOf = normalizeTimestamp(asOf);
  const checkpointsByProjectionCode = new Map(
    normalizeRecords(projectionCheckpoints).map((checkpoint) => [checkpoint.projectionCode, checkpoint])
  );
  const items = normalizeRecords(projectionContracts)
    .map((contract) => {
      const checkpoint = checkpointsByProjectionCode.get(contract.projectionCode) || null;
      const checkpointAgeMinutes = checkpoint?.lastCompletedAt
        ? ageMinutes({ recordedAt: checkpoint.lastCompletedAt, asOf: resolvedAsOf })
        : null;
      const runningAgeMinutes = checkpoint?.lastStartedAt
        ? ageMinutes({ recordedAt: checkpoint.lastStartedAt, asOf: resolvedAsOf })
        : null;
      const gateState =
        !checkpoint || Number(checkpoint.checkpointSequenceNo || 0) === 0
          ? "blocking"
          : checkpoint.status === "failed"
            ? "blocking"
            : checkpoint.status === "running" && Number(runningAgeMinutes || 0) >= runningStaleMinutes
              ? "warning"
              : "healthy";
      const gateReasonCode =
        !checkpoint || Number(checkpoint.checkpointSequenceNo || 0) === 0
          ? "missing_checkpoint"
          : checkpoint.status === "failed"
            ? checkpoint.lastErrorCode || "projection_rebuild_failed"
            : checkpoint.status === "running" && Number(runningAgeMinutes || 0) >= runningStaleMinutes
              ? "projection_rebuild_running_stale"
              : null;
      return {
        projectionCode: contract.projectionCode,
        objectType: contract.objectType || null,
        sourceDomainCode: contract.sourceDomainCode || null,
        checkpointStatus: checkpoint?.status || "missing",
        checkpointSequenceNo: checkpoint?.checkpointSequenceNo || 0,
        lastCompletedAt: checkpoint?.lastCompletedAt || null,
        lastStartedAt: checkpoint?.lastStartedAt || null,
        checkpointAgeMinutes,
        runningAgeMinutes,
        lastErrorCode: checkpoint?.lastErrorCode || null,
        lastErrorMessage: checkpoint?.lastErrorMessage || null,
        gateState,
        gateReasonCode
      };
    })
    .sort((left, right) => {
      const severityDiff = projectionGateRank(right.gateState) - projectionGateRank(left.gateState);
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return String(left.projectionCode).localeCompare(String(right.projectionCode));
    });

  return clone({
    asOf: resolvedAsOf,
    runningStaleMinutes,
    summary: {
      totalProjectionCount: items.length,
      healthyCount: items.filter((item) => item.gateState === "healthy").length,
      warningCount: items.filter((item) => item.gateState === "warning").length,
      blockingCount: items.filter((item) => item.gateState === "blocking").length
    },
    items
  });
}

function getOrCreateDomainEntry(groupedByDomainKey, domainKey) {
  if (!groupedByDomainKey.has(domainKey)) {
    groupedByDomainKey.set(domainKey, {
      domainKey,
      committedCount: 0,
      outboxCount: 0,
      unpublishedCount: 0,
      deadLetteredCount: 0,
      latestCommittedAt: null,
      latestOutboxRecordedAt: null,
      latestPublishedAt: null,
      oldestUnpublishedAt: null,
      oldestUnpublishedAgeMinutes: null
    });
  }
  return groupedByDomainKey.get(domainKey);
}

function resolveCommitLagState({
  unpublishedCount,
  oldestUnpublishedAgeMinutes,
  deadLetteredCount,
  warningLagMinutes,
  criticalLagMinutes
}) {
  if (Number(deadLetteredCount || 0) > 0) {
    return "critical";
  }
  if (Number(unpublishedCount || 0) === 0) {
    return "healthy";
  }
  if (Number(oldestUnpublishedAgeMinutes || 0) >= Number(criticalLagMinutes || DEFAULT_COMMIT_LAG_CRITICAL_MINUTES)) {
    return "critical";
  }
  if (Number(oldestUnpublishedAgeMinutes || 0) >= Number(warningLagMinutes || DEFAULT_COMMIT_LAG_WARNING_MINUTES)) {
    return "degraded";
  }
  return "degraded";
}

function lagStateRank(value) {
  return {
    healthy: 1,
    degraded: 2,
    critical: 3
  }[value] || 0;
}

function projectionGateRank(value) {
  return {
    healthy: 1,
    warning: 2,
    blocking: 3
  }[value] || 0;
}

function normalizeRecords(values) {
  return Array.isArray(values)
    ? values.filter((value) => value && typeof value === "object").map((value) => clone(value))
    : [];
}

function normalizeTimestamp(value = null) {
  const candidate = value == null ? new Date() : new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    throw new TypeError("asOf must be a valid timestamp.");
  }
  return candidate.toISOString();
}

function ageMinutes({ recordedAt, asOf }) {
  if (!recordedAt) {
    return null;
  }
  return Math.max(0, Math.round((Date.parse(asOf) - Date.parse(recordedAt)) / 60000));
}

function maxTimestamp(left, right) {
  if (!right) {
    return left || null;
  }
  if (!left) {
    return right;
  }
  return Date.parse(right) > Date.parse(left) ? right : left;
}

function minTimestamp(left, right) {
  if (!right) {
    return left || null;
  }
  if (!left) {
    return right;
  }
  return Date.parse(right) < Date.parse(left) ? right : left;
}

function maxNumber(left, right) {
  if (right == null) {
    return left ?? null;
  }
  if (left == null) {
    return right;
  }
  return Math.max(left, right);
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
