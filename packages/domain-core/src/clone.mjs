const TYPED_ARRAY_CTORS = Object.freeze({
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  BigInt64Array,
  BigUint64Array
});

export function cloneValue(value) {
  return value == null ? value : structuredClone(value);
}

export function cloneSnapshotValue(value) {
  return deserializeSnapshotValue(serializeSnapshotValue(value));
}

export function serializeSnapshotValue(value) {
  if (value === undefined) {
    return { __type: "Undefined" };
  }

  if (value instanceof Date) {
    return {
      __type: "Date",
      value: value.toISOString()
    };
  }

  if (value instanceof Map) {
    return {
      __type: "Map",
      entries: [...value.entries()].map(([key, entryValue]) => [
        serializeSnapshotValue(key),
        serializeSnapshotValue(entryValue)
      ])
    };
  }

  if (value instanceof Set) {
    return {
      __type: "Set",
      values: [...value.values()].map((entryValue) => serializeSnapshotValue(entryValue))
    };
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return {
      __type: "Buffer",
      encoding: "base64",
      value: value.toString("base64")
    };
  }

  if (ArrayBuffer.isView(value)) {
    return {
      __type: "TypedArray",
      viewType: value.constructor.name,
      encoding: "base64",
      value: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("base64")
    };
  }

  if (value instanceof ArrayBuffer) {
    return {
      __type: "ArrayBuffer",
      encoding: "base64",
      value: Buffer.from(value).toString("base64")
    };
  }

  if (Array.isArray(value)) {
    return value.map((entryValue) => serializeSnapshotValue(entryValue));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeSnapshotValue(entryValue)])
    );
  }

  return value;
}

export function deserializeSnapshotValue(value) {
  if (Array.isArray(value)) {
    return value.map((entryValue) => deserializeSnapshotValue(entryValue));
  }

  if (isPlainObject(value)) {
    switch (value.__type) {
      case "Undefined":
        return undefined;
      case "Date":
        return new Date(value.value);
      case "Map":
        return new Map((value.entries || []).map(([key, entryValue]) => [
          deserializeSnapshotValue(key),
          deserializeSnapshotValue(entryValue)
        ]));
      case "Set":
        return new Set((value.values || []).map((entryValue) => deserializeSnapshotValue(entryValue)));
      case "Buffer":
        return Buffer.from(value.value || "", value.encoding || "base64");
      case "ArrayBuffer": {
        const buffer = Buffer.from(value.value || "", value.encoding || "base64");
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
      case "TypedArray":
        return deserializeTypedArray(value);
      default:
        return Object.fromEntries(
          Object.entries(value).map(([key, entryValue]) => [key, deserializeSnapshotValue(entryValue)])
        );
    }
  }

  return value;
}

function deserializeTypedArray(value) {
  const ctor = TYPED_ARRAY_CTORS[value.viewType];
  if (!ctor) {
    throw new TypeError(`Unsupported typed array snapshot type: ${value.viewType}`);
  }
  const buffer = Buffer.from(value.value || "", value.encoding || "base64");
  return new ctor(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

function isPlainObject(value) {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
