import {
  ATTACHMENT_SCAN_RESULTS,
  DOCUMENT_STATES,
  DOCUMENT_VARIANT_TYPES,
  EMAIL_ATTACHMENT_STATES,
  EMAIL_INGEST_STATES,
  INBOX_CHANNEL_STATUSES,
  createDocumentArchiveEngine
} from "../../document-engine/src/index.mjs";

export {
  ATTACHMENT_SCAN_RESULTS,
  DOCUMENT_STATES,
  DOCUMENT_VARIANT_TYPES,
  EMAIL_ATTACHMENT_STATES,
  EMAIL_INGEST_STATES,
  INBOX_CHANNEL_STATUSES
};

export function createDocumentArchivePlatform(options = {}) {
  return createDocumentArchiveEngine(options);
}
