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

type ParamDecl = { name: string; in: string; required?: boolean; deprecated?: boolean };

function paramsByLocation(
  parameters: unknown,
  loc: "path" | "query" | "header" | "cookie",
): ParamDecl[] {
  if (!Array.isArray(parameters)) return [];
  return (parameters as ParamDecl[]).filter((p) => p && p.in === loc && typeof p.name === "string");
}

/** Build the description string for a parameter's CLI option. Includes the
 * literal "(DEPRECATED)" token when `p.deprecated` is true so users
 * reading `--help` see the warning without consulting the OpenAPI doc. */
function describe(p: ParamDecl, role: string, block: string): string {
  const prefix = p.deprecated === true ? "(DEPRECATED) " : "";
  return `${prefix}${role} ${block} parameter ${p.name}`;
}

function kebab(opId: string): string {
  return opId.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

type ParamGroup = {
  /** hey-api block name: `path` | `query` | `headers` | `cookies` */
  block: string;
  required: ParamDecl[];
  optional: ParamDecl[];
};

/**
 * Emit a commander-style subcommand for one operation. The string is
 * deliberately literal so the test's regex probes match without any
 * source-map / template-literal parsing.
 *
 * `groups` carries one entry per OpenAPI parameter location (path,
 * query, header, cookie). Required params produce `requiredOption`
 * lines; optional params produce `option` lines. Each group threads
 * its values into the corresponding hey-api block (`path`, `query`,
 * `headers`, `cookies`).
 */
function sourceFor(opId: string, groups: ParamGroup[]): string {
  const flagLines: string[] = [];
  const blocks: string[] = [];
  for (const g of groups) {
    for (const p of g.required) {
      flagLines.push(
        `  .requiredOption("--${p.name} <${p.name}>", "${describe(p, "required", g.block)}")`,
      );
    }
    for (const p of g.optional) {
      flagLines.push(
        `  .option("--${p.name} <${p.name}>", "${describe(p, "optional", g.block)}")`,
      );
    }
    const all = [...g.required, ...g.optional];
    if (all.length > 0) {
      blocks.push(`${g.block}: { ${all.map((p) => `${p.name}: opts.${p.name}`).join(", ")} }`);
    }
  }
  const callBody = blocks.length === 0 ? "{}" : `{ ${blocks.join(", ")} }`;
  return [
    `program`,
    `  .command("${kebab(opId)}")`,
    flagLines.join("\n"),
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
    const itemLevelParams = (Array.isArray(item.parameters) ? item.parameters : []) as unknown[];
    for (const method of METHODS) {
      const op = item[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      const opId = String(op.operationId ?? "");
      if (!opId) continue;

      // Response table (#151).
      const responses = (op.responses ?? {}) as Record<string, unknown>;
      operations[opId] = { responseTable: tableOf(responses) };

      // Merge path-item-level + operation-level parameters.
      const merged = [
        ...itemLevelParams,
        ...((Array.isArray(op.parameters) ? op.parameters : []) as unknown[]),
      ];

      // Path-templating (#130). Every `{var}` in the URL must be declared.
      const pathDecls = paramsByLocation(merged, "path");
      const vars = pathVars(path);
      for (const v of vars) {
        const decl = pathDecls.find((d) => d.name === v);
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

      // Build groups for codegen. Path entries follow URL-template order;
      // query / header / cookie follow their parameters[] declaration order.
      const pathGroup: ParamGroup = {
        block: "path",
        required: vars
          .map((v) => pathDecls.find((d) => d.name === v))
          .filter((d): d is ParamDecl => !!d),
        optional: [],
      };
      const split = (loc: "query" | "header" | "cookie", block: string): ParamGroup => {
        const decls = paramsByLocation(merged, loc);
        return {
          block,
          required: decls.filter((d) => d.required === true),
          optional: decls.filter((d) => d.required !== true),
        };
      };
      const groups = [
        pathGroup,
        split("query", "query"),
        split("header", "headers"),
        split("cookie", "cookies"),
      ];
      sources.push(sourceFor(opId, groups));
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
