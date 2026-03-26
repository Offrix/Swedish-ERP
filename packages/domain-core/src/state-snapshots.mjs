function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Map);
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function serializeValue(value) {
  if (value instanceof Map) {
    return {
      __type: "Map",
      entries: [...value.entries()].map(([key, entryValue]) => [serializeValue(key), serializeValue(entryValue)])
    };
  }

  if (Array.isArray(value)) {
    return value.map((entryValue) => serializeValue(entryValue));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeValue(entryValue)])
    );
  }

  return cloneJson(value);
}

function deserializeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entryValue) => deserializeValue(entryValue));
  }

  if (isPlainObject(value)) {
    if (value.__type === "Map") {
      return new Map((value.entries || []).map(([key, entryValue]) => [deserializeValue(key), deserializeValue(entryValue)]));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, deserializeValue(entryValue)])
    );
  }

  return cloneJson(value);
}

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
      payload[key] = serializeValue(customSerializers[key](value));
      continue;
    }
    payload[key] = serializeValue(value);
  }

  return payload;
}

export function applyDurableStateSnapshot(
  targetState,
  snapshot,
  { preserveKeys = [], customHydrators = {} } = {}
) {
  const preserved = new Set(preserveKeys);
  const restored = deserializeValue(snapshot || {});

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

    targetState[key] = cloneJson(nextValue);
  }
}
