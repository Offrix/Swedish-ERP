import crypto from "node:crypto";
import { cloneValue } from "../../../domain-core/src/clone.mjs";
import {
  buildProviderBaselineRef,
  createError,
  createStatelessProvider,
  hashObject,
  nowIso,
  normalizeOptionalText,
  requireText
} from "./provider-runtime-helpers.mjs";

export const SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE = "signicat_signing_archive";

export function createSignicatSigningArchiveProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
    surfaceCode: "evidence_archive",
    connectionType: "signing_evidence_archive",
    environmentMode,
    requiredCredentialKinds: ["client_secret", "certificate_ref"],
    sandboxSupported: true,
    trialSafe: false,
    productionSupported: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "signicat_signing_archive_v1",
        baselineCode: "SE-SIGNICAT-SIGNING-ARCHIVE",
        operationCodes: ["signature_archive_create", "archive_reference_read"]
      }
    ]
  });
  const archiveRecords = new Map();

  return {
    ...provider,
    archiveSignedEvidence,
    listArchiveRecords,
    snapshot() {
      return {
        archiveRecords: [...archiveRecords.values()]
      };
    },
    restore(snapshot = {}) {
      archiveRecords.clear();
      for (const record of Array.isArray(snapshot.archiveRecords) ? snapshot.archiveRecords : []) {
        archiveRecords.set(record.archiveRecordId, record);
      }
    }
  };

  function archiveSignedEvidence({
    companyId,
    sourceObjectType,
    sourceObjectId,
    sourceObjectVersion = null,
    signerActorId,
    evidenceBundleId = null,
    signaturePayloadHash = null,
    signoffHash = null,
    metadata = {}
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceObjectType = requireText(sourceObjectType, "source_object_type_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "source_object_id_required");
    const resolvedSignerActorId = requireText(signerActorId, "actor_id_required");
    const resolvedSignaturePayloadHash = normalizeOptionalText(signaturePayloadHash)
      || hashObject({
        sourceObjectType: resolvedSourceObjectType,
        sourceObjectId: resolvedSourceObjectId,
        sourceObjectVersion: normalizeOptionalText(sourceObjectVersion),
        signerActorId: resolvedSignerActorId,
        metadata
      });
    if (resolvedSignaturePayloadHash.length < 12) {
      throw createError(400, "signature_payload_hash_invalid", "Signature payload hash must be present.");
    }
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
      baselineCode: "SE-SIGNICAT-SIGNING-ARCHIVE",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        sourceObjectType: resolvedSourceObjectType,
        sourceObjectId: resolvedSourceObjectId
      }
    });
    const archiveRecord = Object.freeze({
      archiveRecordId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      sourceObjectVersion: normalizeOptionalText(sourceObjectVersion),
      signerActorId: resolvedSignerActorId,
      providerCode: SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineRef,
      providerBaselineCode: providerBaselineRef.baselineCode,
      signatureReference: `signature:${resolvedSourceObjectType}:${resolvedSourceObjectId}:${resolvedSignaturePayloadHash.slice(0, 16)}`,
      signatureArchiveRef: `signicat-archive:${resolvedSourceObjectType}:${resolvedSourceObjectId}:${resolvedSignaturePayloadHash.slice(0, 16)}`,
      evidenceArchiveId: `evidence-archive:${crypto.randomUUID().replace(/-/g, "")}`,
      evidenceBundleId: normalizeOptionalText(evidenceBundleId),
      signaturePayloadHash: resolvedSignaturePayloadHash,
      signoffHash: normalizeOptionalText(signoffHash),
      archiveChecksum: hashObject({
        companyId: resolvedCompanyId,
        sourceObjectType: resolvedSourceObjectType,
        sourceObjectId: resolvedSourceObjectId,
        sourceObjectVersion: normalizeOptionalText(sourceObjectVersion),
        signerActorId: resolvedSignerActorId,
        signaturePayloadHash: resolvedSignaturePayloadHash,
        signoffHash: normalizeOptionalText(signoffHash),
        evidenceBundleId: normalizeOptionalText(evidenceBundleId),
        metadata
      }),
      metadata: cloneValue(metadata || {}),
      createdAt: nowIso(clock)
    });
    archiveRecords.set(archiveRecord.archiveRecordId, archiveRecord);
    return archiveRecord;
  }

  function listArchiveRecords({ companyId, sourceObjectType = null, sourceObjectId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...archiveRecords.values()]
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (sourceObjectType ? record.sourceObjectType === sourceObjectType : true))
      .filter((record) => (sourceObjectId ? record.sourceObjectId === sourceObjectId : true))
      .map((record) => ({ ...record, metadata: cloneValue(record.metadata || {}) }));
  }
}
