/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #156 — Parameter `in: query`.
 *
 * Mirrors the structural shape of #130 (path templating): the test imports
 * `Codegen.emit(specPath)` from `src/compile/codegen.ts`, runs it against a
 * fixture, and asserts on substring patterns in the emitted source so the
 * implementation has room to choose its own commander/yargs/etc. style
 * without forcing test rewrites.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/parameter-in-query/", import.meta.url),
);

function fixturePath(name: string): string {
  return `${FIXTURE_DIR}${name}`;
}

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(fixturePath(fixture));
  return typeof result === "string" ? result : (result.source ?? "");
}

function flagsMatching(src: string, re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(re)) out.add(m[1]);
  return out;
}

const REQUIRED_RE = /requiredOption\(\s*["']--([a-zA-Z0-9_-]+)/g;
const OPTIONAL_RE = /(?<!required)\.option\(\s*["']--([a-zA-Z0-9_-]+)/g;

// ---------------------------------------------------------------------------
// Item A — required query parameter emits a required CLI flag.
// ---------------------------------------------------------------------------

Deno.test("compile (#156): required query parameter emits a required `--<name>` flag", async () => {
  const src = await emitSource("required-query.yaml");
  assert(
    flagsMatching(src, REQUIRED_RE).has("status"),
    `expected required '--status' flag; src:\n${src}`,
  );
});

// ---------------------------------------------------------------------------
// Item B — optional query parameter emits a non-required flag.
// ---------------------------------------------------------------------------

Deno.test("compile (#156): optional query parameter emits a plain `option` flag", async () => {
  const src = await emitSource("optional-query.yaml");
  assert(
    !flagsMatching(src, REQUIRED_RE).has("limit"),
    `expected '--limit' to NOT be requiredOption; src:\n${src}`,
  );
  assert(
    flagsMatching(src, OPTIONAL_RE).has("limit"),
    `expected optional '--limit' flag; src:\n${src}`,
  );
});

// ---------------------------------------------------------------------------
// Item C — query value threads into hey-api's `query: { ... }` block.
// ---------------------------------------------------------------------------

Deno.test("compile (#156): query parameter threads into hey-api `query: { ... }` block", async () => {
  const src = await emitSource("required-query.yaml");
  const queryBlock = src.match(/query\s*:\s*\{([^}]*)\}/);
  assert(queryBlock !== null, `expected a 'query: { ... }' block in:\n${src}`);
  assertStringIncludes(queryBlock[1], "status");
});

// ---------------------------------------------------------------------------
// Item D — operation with no query parameters omits the `query` block.
// ---------------------------------------------------------------------------

Deno.test("compile (#156): operation with no query parameters has no `query: { ... }` block", async () => {
  const src = await emitSource("no-query.yaml");
  const queryBlock = src.match(/query\s*:\s*\{([^}]*)\}/);
  if (queryBlock !== null) {
    assert(
      queryBlock[1].trim().length === 0,
      `expected empty / absent 'query: {}' for no-query op; got: ${queryBlock[0]}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Item E — query and path parameters coexist in the same operation.
// ---------------------------------------------------------------------------

Deno.test("compile (#156): query + path parameters thread into both blocks independently", async () => {
  const src = await emitSource("query-and-path.yaml");
  const pathBlock = src.match(/path\s*:\s*\{([^}]*)\}/);
  const queryBlock = src.match(/query\s*:\s*\{([^}]*)\}/);
  assert(pathBlock !== null, `expected 'path: { ... }' block; src:\n${src}`);
  assert(queryBlock !== null, `expected 'query: { ... }' block; src:\n${src}`);
  assertStringIncludes(pathBlock[1], "id");
  assertStringIncludes(queryBlock[1], "include");
});
