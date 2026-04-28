/**
 * Compile-time codegen template.
 *
 * Closes the response-table portion of #151. Walks an OpenAPI document
 * and produces, for each operation, the baked-in match table the
 * runtime response matcher uses to resolve a received status code to a
 * declared response.
 *
 * The full source-emission contract (TypeScript output, `source` and
 * `warnings` fields) is added by sibling tech specs (#130 path
 * templating, etc.). This module exports the part #151 needs and leaves
 * room for those siblings to extend the result shape.
 *
 * @module
 */

/** Status keys live in OpenAPI's responses object. */
type ResponseKind = "exact" | "range" | "default";
type TableEntry = { kind: ResponseKind; rangeDigit?: number };
type ResponseTable = Record<string, TableEntry>;

export type EmitResult = {
  operations: Record<string, { responseTable: ResponseTable }>;
};

/** Compile-stage error classes. */
export const Compile = {
  UnknownRangeKey: class extends Error {
    key: string;
    constructor(key: string, message?: string) {
      super(
        message ??
          `Unknown response range key '${key}'. Allowed: 1XX-5XX, 3-digit status code, or 'default'.`,
      );
      this.name = "Compile.UnknownRangeKey";
      this.key = key;
    }
  },
};

const EXACT_RE = /^[1-5]\d{2}$/;
const RANGE_RE = /^[1-5]XX$/;

function classify(key: string): TableEntry {
  if (key === "default") return { kind: "default" };
  if (EXACT_RE.test(key)) return { kind: "exact" };
  if (RANGE_RE.test(key)) {
    return { kind: "range", rangeDigit: Number(key[0]) };
  }
  throw new Compile.UnknownRangeKey(key);
}

/** Build the response table for one operation's responses object. */
function tableOf(responses: Record<string, unknown>): ResponseTable {
  const out: ResponseTable = {};
  for (const key of Object.keys(responses)) {
    out[key] = classify(key);
  }
  return out;
}

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

/**
 * Walk every operation in the parsed OpenAPI document and return the
 * response tables. Throws synchronously on the first invalid response
 * key so the caller's `assertThrows` works.
 */
export function emit(doc: Record<string, unknown>): EmitResult {
  const out: EmitResult = { operations: {} };
  const paths = (doc.paths ?? {}) as Record<string, unknown>;
  for (const path of Object.keys(paths)) {
    const item = paths[path] as Record<string, unknown>;
    for (const method of METHODS) {
      const op = item[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      const opId = String(op.operationId ?? "");
      if (!opId) continue;
      const responses = (op.responses ?? {}) as Record<string, unknown>;
      out.operations[opId] = { responseTable: tableOf(responses) };
    }
  }
  return out;
}
