import {
  cloneSnapshotValue,
  deserializeSnapshotValue,
  serializeSnapshotValue
} from "./clone.mjs";

function replaceMap(target, source) {
  target.clear();
  for (const [key, value] of source.entries()) {
    target.set(key, value);
  }
}

export function serializeDurableState(state, { excludeKeys = [], customSerializers = {} } = {}) {
  const excluded = new Set(excludeKeys);
  const payload = {};

  for (const [key, value] of Object.entries(state || {})) {
    if (excluded.has(key)) {
      continue;
    }
    if (typeof customSerializers[key] === "function") {
      payload[key] = serializeSnapshotValue(customSerializers[key](value));
      continue;
    }
    payload[key] = serializeSnapshotValue(value);
  }

  return payload;
}

export function applyDurableStateSnapshot(
  targetState,
  snapshot,
  { preserveKeys = [], customHydrators = {} } = {}
) {
  const preserved = new Set(preserveKeys);
  const restored = deserializeSnapshotValue(snapshot || {});

  for (const [key, targetValue] of Object.entries(targetState || {})) {
    if (preserved.has(key)) {
      continue;
    }

    if (typeof customHydrators[key] === "function") {
      customHydrators[key](targetValue, restored[key]);
      continue;
    }

    const nextValue = restored[key];
    if (targetValue instanceof Map) {
      replaceMap(targetValue, nextValue instanceof Map ? nextValue : new Map());
      continue;
    }

    if (Array.isArray(targetValue)) {
      targetValue.splice(0, targetValue.length, ...(Array.isArray(nextValue) ? nextValue : []));
      continue;
    }

    targetState[key] = cloneSnapshotValue(nextValue);
  }
}
