import { DOCUMENT_STATES, DOCUMENT_VARIANT_TYPES, createDocumentArchiveEngine } from "../../document-engine/src/index.mjs";

export { DOCUMENT_STATES, DOCUMENT_VARIANT_TYPES };

export function createDocumentArchivePlatform(options = {}) {
  return createDocumentArchiveEngine(options);
}
