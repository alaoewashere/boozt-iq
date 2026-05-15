function serializeValue(v: unknown): unknown {
  if (
    v &&
    typeof v === "object" &&
    "toMillis" in v &&
    typeof (v as { toMillis: () => number }).toMillis === "function"
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (v instanceof Date) {
    return v.getTime();
  }
  if (Array.isArray(v)) {
    return v.map(serializeValue);
  }
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      out[k] = serializeValue(val);
    }
    return out;
  }
  return v;
}

/** Nested objects / dates → JSON-safe values for Server → Client props. */
export function serializePlainRecord(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = serializeValue(v);
  }
  return out;
}

export function serializeRecord<T extends Record<string, unknown>>(
  id: string,
  data: Record<string, unknown>
): T & { id: string } {
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = serializeValue(v);
  }
  return out as T & { id: string };
}
