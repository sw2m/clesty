/**
 * Compile-time codegen tests for Operation `responses` (issue sw2m/clesty#151).
 *
 * Phase 2a Red Gate: these tests are written before implementation. They MUST
 * fail with the "Red Gate" message because the modules under test do not yet
 * exist. The graceful-import pattern lets `deno task test` run end-to-end
 * without a `module not found` panic — instead each test fails by assertion.
 *
 * Coverage maps to the spec's "A. Compile-time codegen tests" subsection,
 * items 1-2:
 *
 *   1. Lowercase range key in spec -> compile errors with
 *      `Compile.UnknownRangeKey`.
 *   2. Snapshot: generated handler for an operation with declared 200, 2XX,
 *      4XX, default; assert the runtime support helpers see the expected
 *      baked-in table.
 *
 * The integration suite (items 3-22) lives in
 * `tests/integration/responses_test.ts`.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import * as Yaml from "@std/yaml";
import { fromFileUrl } from "@std/path";

// deno-lint-ignore no-explicit-any
let Codegen: any;
// deno-lint-ignore no-explicit-any
let Response: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}
try {
  Response = await import("../../src/runtime/response.ts");
} catch {
  Response = null;
}

const FIXTURE_DIR = fromFileUrl(new URL("../fixtures/responses/", import.meta.url));

async function loadFixture(name: string): Promise<Record<string, unknown>> {
  const text = await Deno.readTextFile(`${FIXTURE_DIR}${name}`);
  const doc = Yaml.parse(text);
  assert(doc !== null && typeof doc === "object", `fixture ${name} did not parse`);
  return doc as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Item 1: lowercase range key -> Compile.UnknownRangeKey
// ---------------------------------------------------------------------------

Deno.test("compile: lowercase '2xx' range key is rejected with Compile.UnknownRangeKey", async () => {
  if (!Codegen) {
    throw new Error("compile codegen not implemented yet — Red Gate");
  }
  const doc = await loadFixture("lowercase-range.yaml");
  // The codegen template's emit() walks the responses map. A lowercase range
  // key like "2xx" must be refused — only uppercase 1XX-5XX are acceptable.
  assertThrows(
    () => Codegen.emit(doc),
    Codegen.Compile.UnknownRangeKey,
    "2xx",
  );
});

Deno.test("compile: unknown 'abc' range key is rejected with Compile.UnknownRangeKey", async () => {
  if (!Codegen) {
    throw new Error("compile codegen not implemented yet — Red Gate");
  }
  const doc = await loadFixture("unknown-range.yaml");
  assertThrows(
    () => Codegen.emit(doc),
    Codegen.Compile.UnknownRangeKey,
    "abc",
  );
});

// ---------------------------------------------------------------------------
// Item 2: snapshot — baked-in match table for {200, 2XX, 4XX, default}
// ---------------------------------------------------------------------------

Deno.test("compile: emit() bakes in the expected match table for 200/2XX/4XX/default", async () => {
  if (!Codegen) {
    throw new Error("compile codegen not implemented yet — Red Gate");
  }
  const doc = await loadFixture("4xx-routing.yaml");
  // Splice in the 200 entry so this fixture exercises all four key shapes
  // without adding a fifth fixture file.
  const responses = ((doc.paths as Record<string, unknown>)["/thing"] as Record<string, unknown>)
    .get as Record<string, unknown>;
  (responses.responses as Record<string, unknown>)["200"] = {
    description: "exact OK",
    content: { "application/json": { schema: { type: "object" } } },
  };

  const emitted = Codegen.emit(doc);
  assert(emitted, "emit() must return something");
  // The emitted artifact exposes the resolved table for `getThing`. The
  // exact field name is part of the implementation contract — adjust to
  // match once codegen.ts lands.
  const table = emitted.operations.getThing.responseTable;
  assertEquals(Object.keys(table).sort(), ["2XX", "200", "4XX", "default"].sort());
  assertEquals(table["200"].kind, "exact");
  assertEquals(table["2XX"].kind, "range");
  assertEquals(table["2XX"].rangeDigit, 2);
  assertEquals(table["4XX"].kind, "range");
  assertEquals(table["4XX"].rangeDigit, 4);
  assertEquals(table["default"].kind, "default");
});

// ---------------------------------------------------------------------------
// Item 2 (companion): runtime matcher precedence — exact > range > default
// ---------------------------------------------------------------------------

Deno.test("compile: Response.match() picks exact over range when both apply", () => {
  if (!Response) {
    throw new Error("runtime response matcher not implemented yet — Red Gate");
  }
  const table = {
    "200": { kind: "exact" },
    "2XX": { kind: "range", rangeDigit: 2 },
    "default": { kind: "default" },
  };
  const result = Response.match(200, table);
  assertEquals(result?.matchedKey, "200");
  assertEquals(result?.kind, "exact");
});

Deno.test("compile: Response.match() falls back to range when no exact key", () => {
  if (!Response) {
    throw new Error("runtime response matcher not implemented yet — Red Gate");
  }
  const table = {
    "2XX": { kind: "range", rangeDigit: 2 },
    "default": { kind: "default" },
  };
  const result = Response.match(201, table);
  assertEquals(result?.matchedKey, "2XX");
  assertEquals(result?.kind, "range");
});

Deno.test("compile: Response.match() falls back to default when neither exact nor range", () => {
  if (!Response) {
    throw new Error("runtime response matcher not implemented yet — Red Gate");
  }
  const table = {
    "200": { kind: "exact" },
    "default": { kind: "default" },
  };
  const result = Response.match(503, table);
  assertEquals(result?.matchedKey, "default");
  assertEquals(result?.kind, "default");
});

Deno.test("compile: Response.match() returns null when nothing matches", () => {
  if (!Response) {
    throw new Error("runtime response matcher not implemented yet — Red Gate");
  }
  const table = {
    "200": { kind: "exact" },
  };
  const result = Response.match(503, table);
  assertEquals(result, null);
});

Deno.test("compile: Response.match() skips range matching for status < 100", () => {
  if (!Response) {
    throw new Error("runtime response matcher not implemented yet — Red Gate");
  }
  const table = {
    "2XX": { kind: "range", rangeDigit: 2 },
    "default": { kind: "default" },
  };
  // Aborted request reports status 0 — must not match "0XX" (illegal) and
  // must fall through to default.
  const result = Response.match(0, table);
  assertEquals(result?.matchedKey, "default");
});

Deno.test("compile: Response.match() skips range matching for status > 599", () => {
  if (!Response) {
    throw new Error("runtime response matcher not implemented yet — Red Gate");
  }
  const table = {
    "5XX": { kind: "range", rangeDigit: 5 },
    "default": { kind: "default" },
  };
  // Status 600 from a misbehaving load balancer — must not be treated as 6XX
  // (illegal range) and must fall through to default.
  const result = Response.match(600, table);
  assertEquals(result?.matchedKey, "default");
});
