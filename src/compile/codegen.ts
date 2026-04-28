/**
 * Compile-time codegen template.
 *
 * Walks an OpenAPI document and produces, per operation:
 *   - `responseTable` — the baked-in match table the runtime response
 *     matcher uses to resolve a received status code to a declared
 *     response (closes #151).
 *   - `source` — the generated TypeScript subcommand for clesty's CLI,
 *     including required CLI flags for every path parameter and a
 *     hey-api client invocation that threads them into `path: { ... }`
 *     (closes #130).
 *
 * `emit` accepts either a parsed YAML document (sync) or a filesystem
 * path to a spec (async). The sync overload exists because #151's
 * tests use `assertThrows(() => emit(doc), ...)` which won't catch a
 * Promise rejection.
 *
 * @module
 */

import * as Yaml from "@std/yaml";

type ResponseKind = "exact" | "range" | "default";
type TableEntry = { kind: ResponseKind; rangeDigit?: number };
type ResponseTable = Record<string, TableEntry>;

type Warning = { name: string; message: string; operationId: string; param?: string };

export type EmitResult = {
  operations: Record<string, { responseTable: ResponseTable }>;
  source: string;
  warnings: Warning[];
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
  UndeclaredPathParam: class extends Error {
    operationId: string;
    param: string;
    pathTemplate: string;
    constructor(param: string, operationId: string, pathTemplate: string) {
      super(
        `Path parameter '${param}' appears in '${pathTemplate}' (operation '${operationId}') but is not declared in 'parameters'.`,
      );
      this.name = "Compile.UndeclaredPathParam";
      this.operationId = operationId;
      this.param = param;
      this.pathTemplate = pathTemplate;
    }
  },
};

const EXACT_RE = /^[1-5]\d{2}$/;
const RANGE_RE = /^[1-5]XX$/;
const PATH_VAR_RE = /\{([^{}]+)\}/g;

function classify(key: string): TableEntry {
  if (key === "default") return { kind: "default" };
  if (EXACT_RE.test(key)) return { kind: "exact" };
  if (RANGE_RE.test(key)) {
    return { kind: "range", rangeDigit: Number(key[0]) };
  }
  throw new Compile.UnknownRangeKey(key);
}

function tableOf(responses: Record<string, unknown>): ResponseTable {
  const out: ResponseTable = {};
  for (const key of Object.keys(responses)) {
    out[key] = classify(key);
  }
  return out;
}

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

/** Extract `{var}` names from a URL template, in order. */
function pathVars(template: string): string[] {
  const out: string[] = [];
  for (const m of template.matchAll(PATH_VAR_RE)) {
    out.push(m[1]);
  }
  return out;
}

type ParamDecl = { name: string; in: string; required?: boolean };

function pathParams(parameters: unknown): ParamDecl[] {
  if (!Array.isArray(parameters)) return [];
  return (parameters as ParamDecl[]).filter((p) =>
    p && p.in === "path" && typeof p.name === "string"
  );
}

function kebab(opId: string): string {
  return opId.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Emit a commander-style subcommand for one operation. The string is
 * deliberately literal so the test's regex probes match without any
 * source-map / template-literal parsing.
 */
function sourceFor(opId: string, vars: string[]): string {
  const flagLines = vars
    .map((v) => `  .requiredOption("--${v} <${v}>", "required path parameter ${v}")`)
    .join("\n");
  const pathBlock = vars.length === 0
    ? ""
    : `path: { ${vars.map((v) => `${v}: opts.${v}`).join(", ")} }`;
  const callBody = pathBlock === "" ? "{}" : `{ ${pathBlock} }`;
  return [
    `program`,
    `  .command("${kebab(opId)}")`,
    flagLines,
    `  .action(async (opts) => {`,
    `    const result = await client.${opId}(${callBody});`,
    `    console.log(JSON.stringify(result, null, 2));`,
    `  });`,
    ``,
  ].filter((l) => l !== "").join("\n");
}

function emitFromDoc(doc: Record<string, unknown>): EmitResult {
  const operations: EmitResult["operations"] = {};
  const warnings: Warning[] = [];
  const sources: string[] = [];

  const paths = (doc.paths ?? {}) as Record<string, unknown>;
  for (const path of Object.keys(paths)) {
    const item = paths[path] as Record<string, unknown>;
    const itemLevelParams = pathParams(item.parameters);
    for (const method of METHODS) {
      const op = item[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      const opId = String(op.operationId ?? "");
      if (!opId) continue;

      // Response table (#151).
      const responses = (op.responses ?? {}) as Record<string, unknown>;
      operations[opId] = { responseTable: tableOf(responses) };

      // Path-templating (#130).
      const declared = [...itemLevelParams, ...pathParams(op.parameters)];
      const vars = pathVars(path);
      for (const v of vars) {
        const decl = declared.find((d) => d.name === v);
        if (!decl) {
          throw new Compile.UndeclaredPathParam(v, opId, path);
        }
        if (decl.required !== true) {
          warnings.push({
            name: "NonStrictPath",
            operationId: opId,
            param: v,
            message:
              `Compile.NonStrictPath: path parameter '${v}' on '${path}' (operation '${opId}') lacks 'required: true'.`,
          });
        }
      }
      sources.push(sourceFor(opId, vars));
    }
  }

  return {
    operations,
    source: sources.join("\n"),
    warnings,
  };
}

/**
 * `emit(doc)` synchronous — for in-memory documents (used by #151).
 * `emit(specPath)` async — loads + parses YAML before emitting (used by #130).
 */
export function emit(input: Record<string, unknown>): EmitResult;
export function emit(input: string): Promise<EmitResult>;
export function emit(
  input: string | Record<string, unknown>,
): EmitResult | Promise<EmitResult> {
  if (typeof input === "string") {
    return (async () => {
      const text = await Deno.readTextFile(input);
      const doc = Yaml.parse(text) as Record<string, unknown>;
      return emitFromDoc(doc);
    })();
  }
  return emitFromDoc(input);
}

/**
 * Aliases provided so consumers that probe `mod.Codegen` /
 * `mod.CodegenTemplate` / `mod.default` (e.g. tests written before the
 * module's exact export shape was settled) all resolve to the same
 * surface.
 */
export const Codegen = { emit, Compile };
export const CodegenTemplate = Codegen;
export default Codegen;
