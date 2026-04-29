/**
 * Red-Gate tests for clesty/sw2m issue #107: `openapi` version field.
 *
 * Phase 2a per philosophies §II — these tests are written BEFORE the
 * implementation. They are EXPECTED TO FAIL because `src/compile/preflight.ts`
 * does not exist yet. That failure is the Red signal: it proves the tests
 * are real and load-bearing.
 *
 * Implementation contract under test (from #107 tech spec):
 *   class Preflight {
 *     static check(src: string | URL | ReadableStream):
 *       Promise<{ origin: string; dialect: "3.0" | "3.1"; version: string }>;
 *   }
 *
 * Errors (named classes on the `Compile` namespace):
 *   - Compile.MissingVersion
 *   - Compile.InvalidVersion
 *   - Compile.UnsupportedVersion
 *   - Compile.HeyApiFailure
 *
 * The import below is wrapped in a try/catch so the test file is
 * typecheck-tolerant of the missing module: `deno task test` runs, every
 * test fails with "Preflight not implemented yet — Red Gate", and the
 * failure count matches the test count. That is a clean Red signal.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

// deno-lint-ignore no-explicit-any
let Preflight: any;
// deno-lint-ignore no-explicit-any
let Compile: any;

try {
  const mod = await import("../../src/compile/preflight.ts");
  Preflight = mod.Preflight;
  Compile = mod.Compile;
} catch {
  Preflight = null;
  Compile = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/compile-openapi-version/", import.meta.url),
);

function fixturePath(name: string): string {
  return `${FIXTURE_DIR}${name}`;
}

function requireImpl(): void {
  if (!Preflight || !Compile) {
    throw new Error("Preflight not implemented yet — Red Gate");
  }
}

// ---------------------------------------------------------------------------
// 1. Acceptance fixtures: pre-flight passes; pipeline reaches hey-api step.
//    The spec says "use a hey-api stub or --dry-run to avoid slow codegen."
//    Here we assert only the pre-flight contract: `Preflight.check` resolves
//    with the expected dialect/version triple. Reaching the hey-api step is
//    covered by the integration test (item 7, ignored below).
// ---------------------------------------------------------------------------

const ACCEPTANCE: Array<{ file: string; version: string; dialect: "3.0" | "3.1" }> = [
  { file: "v300.yaml", version: "3.0.0", dialect: "3.0" },
  { file: "v301.yaml", version: "3.0.1", dialect: "3.0" },
  { file: "v302.yaml", version: "3.0.2", dialect: "3.0" },
  { file: "v303.yaml", version: "3.0.3", dialect: "3.0" },
  { file: "v304.yaml", version: "3.0.4", dialect: "3.0" },
  { file: "v310.yaml", version: "3.1.0", dialect: "3.1" },
  { file: "v311.yaml", version: "3.1.1", dialect: "3.1" },
  { file: "v312.yaml", version: "3.1.2", dialect: "3.1" },
];

for (const { file, version, dialect } of ACCEPTANCE) {
  Deno.test(`acceptance: ${file} (openapi ${version}) passes pre-flight`, async () => {
    requireImpl();
    const result = await Preflight.check(fixturePath(file));
    assertEquals(result.version, version);
    assertEquals(result.dialect, dialect);
    assertStringIncludes(result.origin, file);
  });
}

// ---------------------------------------------------------------------------
// 2. Refusal fixtures: pre-flight fails with the matching Compile.* error.
// ---------------------------------------------------------------------------

const REFUSAL: Array<
  { file: string; error: "MissingVersion" | "InvalidVersion" | "UnsupportedVersion" }
> = [
  { file: "swagger2.yaml", error: "MissingVersion" },
  { file: "missing.yaml", error: "MissingVersion" },
  { file: "v4.yaml", error: "UnsupportedVersion" },
  { file: "v32.yaml", error: "UnsupportedVersion" },
  { file: "zero-padded.yaml", error: "UnsupportedVersion" },
  { file: "prerelease.yaml", error: "UnsupportedVersion" },
  { file: "partial.yaml", error: "UnsupportedVersion" },
  { file: "non-string.yaml", error: "InvalidVersion" },
];

for (const { file, error } of REFUSAL) {
  Deno.test(`refusal: ${file} fails pre-flight with Compile.${error}`, async () => {
    requireImpl();
    let thrown: unknown = null;
    try {
      await Preflight.check(fixturePath(file));
    } catch (err) {
      thrown = err;
    }
    if (thrown === null) {
      throw new Error(`expected Compile.${error}, got no error`);
    }
    const ErrCtor = Compile[error];
    if (!(thrown instanceof ErrCtor)) {
      throw new Error(
        `expected instance of Compile.${error}, got ${
          (thrown as { constructor?: { name?: string } })?.constructor?.name
        }`,
      );
    }
    // origin must be present on every Compile.* error per the spec.
    assertStringIncludes((thrown as { origin: string }).origin, file);
  });
}

// ---------------------------------------------------------------------------
// 3. JSON / YAML parity: v300.json and v300.yaml both pass pre-flight
//    identically (same version, same dialect).
// ---------------------------------------------------------------------------

Deno.test("parity: v300.json and v300.yaml produce identical pre-flight result", async () => {
  requireImpl();
  const yamlResult = await Preflight.check(fixturePath("v300.yaml"));
  const jsonResult = await Preflight.check(fixturePath("v300.json"));
  assertEquals(yamlResult.version, jsonResult.version);
  assertEquals(yamlResult.dialect, jsonResult.dialect);
  assertEquals(yamlResult.version, "3.0.0");
  assertEquals(yamlResult.dialect, "3.0");
});

// ---------------------------------------------------------------------------
// 4. BOM: bom-v300.yaml passes pre-flight (leading UTF-8 BOM stripped).
// ---------------------------------------------------------------------------

Deno.test("bom: bom-v300.yaml passes pre-flight after BOM strip", async () => {
  requireImpl();
  const result = await Preflight.check(fixturePath("bom-v300.yaml"));
  assertEquals(result.version, "3.0.0");
  assertEquals(result.dialect, "3.0");
});

// ---------------------------------------------------------------------------
// 5. `origin` populated on errors for path, URL, and stdin sources.
// ---------------------------------------------------------------------------

Deno.test("origin: file path source — refusal carries path in origin", async () => {
  requireImpl();
  let thrown: unknown = null;
  try {
    await Preflight.check(fixturePath("v4.yaml"));
  } catch (err) {
    thrown = err;
  }
  if (thrown === null) throw new Error("expected refusal");
  assertStringIncludes((thrown as { origin: string }).origin, "v4.yaml");
});

Deno.test("origin: URL source — refusal carries URL string in origin", async () => {
  requireImpl();
  const url = new URL("v4.yaml", new URL(FIXTURE_DIR, "file://"));
  let thrown: unknown = null;
  try {
    await Preflight.check(url);
  } catch (err) {
    thrown = err;
  }
  if (thrown === null) throw new Error("expected refusal");
  assertStringIncludes((thrown as { origin: string }).origin, "v4.yaml");
});

Deno.test("origin: stdin/stream source — refusal carries '<stdin>' in origin", async () => {
  requireImpl();
  // Spec: stream identifier is "<stdin>" for an unnamed ReadableStream source.
  const bytes = new TextEncoder().encode(
    "openapi: 4.0.0\ninfo:\n  title: x\n  version: 0\npaths: {}\n",
  );
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  let thrown: unknown = null;
  try {
    await Preflight.check(stream);
  } catch (err) {
    thrown = err;
  }
  if (thrown === null) throw new Error("expected refusal");
  assertEquals((thrown as { origin: string }).origin, "<stdin>");
});

// ---------------------------------------------------------------------------
// 6. Pre-flight does not read more than MAX_PREFLIGHT_BYTES from the source.
//    Assertable via a fake ReadableStream that throws after that count.
//    The spec defines the default at 16 KiB.
// ---------------------------------------------------------------------------

Deno.test("budget: pre-flight reads at most MAX_PREFLIGHT_BYTES (16 KiB) from source", async () => {
  requireImpl();
  const MAX = 16 * 1024;
  // Header that satisfies pre-flight in the first chunk.
  const header = new TextEncoder().encode(
    "openapi: 3.0.0\ninfo:\n  title: budget\n  version: 0\npaths: {}\n",
  );
  let bytesRead = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (bytesRead === 0) {
        bytesRead += header.byteLength;
        controller.enqueue(header);
        return;
      }
      // Any subsequent pull beyond MAX must not happen. Trip a tripwire.
      if (bytesRead > MAX) {
        controller.error(new Error("pre-flight read past MAX_PREFLIGHT_BYTES"));
        return;
      }
      // Pad up to MAX with zeros; pre-flight should stop before consuming all of it.
      const remaining = MAX - bytesRead;
      const chunk = new Uint8Array(Math.min(1024, remaining));
      bytesRead += chunk.byteLength;
      controller.enqueue(chunk);
      if (bytesRead >= MAX) controller.close();
    },
  });

  const result = await Preflight.check(stream);
  assertEquals(result.version, "3.0.0");
});

// ---------------------------------------------------------------------------
// 7. hey-api error wrapping: when hey-api itself rejects a doc that passed
//    pre-flight, the surfaced error is `Compile.HeyApiFailure` carrying
//    the spec origin and a `cause` chain to the underlying error.
//
//    The cli orchestrator (#769) is what calls hey-api; this test invokes
//    `compile()` directly with a fixture that passes preflight + ref-safety
//    but breaks hey-api at parse time (a local `$ref` whose target does
//    not exist in components.schemas).
// ---------------------------------------------------------------------------

Deno.test(
  "hey-api: a hey-api rejection is wrapped as Compile.HeyApiFailure with origin",
  async () => {
    // Dynamic imports per VSDD §II Phase 2a Red Gate: this file is
    // designed to typecheck-tolerate missing modules. The graceful-
    // import pattern at the top of this file already handles
    // `src/compile/preflight.ts`; the cli orchestrator is loaded
    // here the same way so the file remains tolerant if `src/cli.ts`
    // is absent.
    const cli = await import("../../src/cli.ts");
    const preflight = await import("../../src/compile/preflight.ts");
    const dir = await Deno.makeTempDir({ prefix: "clesty-heyapi-" });
    try {
      const fixture = fixturePath("v300-broken-ref.yaml");
      let thrown: unknown;
      try {
        await cli.compile({ spec: fixture, output: `${dir}/bin` });
      } catch (e) {
        thrown = e;
      }
      assert(thrown !== undefined, "expected a HeyApiFailure throw");
      assert(
        thrown instanceof preflight.Compile.HeyApiFailure,
        `expected Compile.HeyApiFailure, got ${
          (thrown as { constructor?: { name?: string } })?.constructor?.name
        }: ${(thrown as Error)?.message}`,
      );
      assertStringIncludes(
        (thrown as { origin: string }).origin,
        "v300-broken-ref.yaml",
      );
    } finally {
      try {
        await Deno.remove(dir, { recursive: true });
      } catch { /* ignore */ }
    }
  },
);
