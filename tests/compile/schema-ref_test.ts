/**
 * Red-Gate tests for `Compile.RefEscapesRoot` pre-flight (clesty issue #241).
 *
 * Per VSDD Phase 2a (Red Gate): these tests are written BEFORE the
 * implementation exists. They MUST fail until the `src/compile/ref-safety.ts`
 * module ships. The dynamic import is wrapped in a try/catch so the file
 * still type-checks and runs — each test then throws a clear "not implemented"
 * error so the Red Gate failure is unambiguous in the test output.
 *
 * Scope (test plan items 9, 10, 11):
 *   9.  Path-traversal via `../` parent segments → `Compile.RefEscapesRoot`.
 *   10. Absolute filesystem path (`/etc/passwd`) → `Compile.RefEscapesRoot`.
 *   11. With `--allow-ref-root <dir>` (or programmatic equivalent), refs into
 *       that broadened root succeed.
 *
 * The pre-flight runs against the spec's directory. It scans every string-
 * valued `$ref` in the document, normalises the file portion, and rejects
 * anything that resolves outside the allowed root. Hash-only refs
 * (`#/components/...`) are local to the document and always allowed.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { fromFileUrl, join } from "@std/path";

const FIXTURE_DIR = fromFileUrl(new URL("../fixtures/schema-ref/", import.meta.url));

// deno-lint-ignore no-explicit-any
let RefSafety: any;
try {
  RefSafety = await import("../../src/compile/ref-safety.ts");
} catch {
  RefSafety = null;
}

function requireModule(): void {
  if (!RefSafety) {
    throw new Error(
      "src/compile/ref-safety.ts not implemented yet — Red Gate (issue #241)",
    );
  }
}

Deno.test("ref pre-flight (item 9): rejects parent escape via '../'", async () => {
  requireModule();
  const specPath = join(FIXTURE_DIR, "parent-escape.yaml");
  // The pre-flight is async because it may resolve symlinks via Deno.realPath.
  let thrown: unknown;
  try {
    await RefSafety.checkRefSafety(specPath);
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== undefined, "expected RefEscapesRoot to throw");
  assertEquals(
    (thrown as { name?: string }).name ??
      (thrown as { constructor: { name: string } }).constructor.name,
    "RefEscapesRoot",
    "error class name must be Compile.RefEscapesRoot",
  );
  // Error message should name the offending pointer so the user can find it.
  const msg = String((thrown as Error).message ?? "");
  assert(msg.includes("../"), `error message should include offending ref: ${msg}`);
});

Deno.test("ref pre-flight (item 10): rejects absolute filesystem path", async () => {
  requireModule();
  const specPath = join(FIXTURE_DIR, "absolute-path.yaml");
  let thrown: unknown;
  try {
    await RefSafety.checkRefSafety(specPath);
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== undefined, "expected RefEscapesRoot to throw");
  assertEquals(
    (thrown as { name?: string }).name ??
      (thrown as { constructor: { name: string } }).constructor.name,
    "RefEscapesRoot",
    "error class name must be Compile.RefEscapesRoot",
  );
  const msg = String((thrown as Error).message ?? "");
  assert(msg.includes("/etc/passwd"), `error message should include offending ref: ${msg}`);
});

Deno.test("ref pre-flight (item 11): --allow-ref-root broadens the allowed root", async () => {
  requireModule();
  // Build a temp layout:
  //   <tmp>/spec/api.yaml         — references ../shared/types.yaml#/components/schemas/Pet
  //   <tmp>/shared/types.yaml     — defines Pet
  // Default root (spec dir) would reject. With allowRefRoot=<tmp>, accept.
  const tmp = await Deno.makeTempDir({ prefix: "clesty-ref-safety-" });
  try {
    const specDir = join(tmp, "spec");
    const sharedDir = join(tmp, "shared");
    await Deno.mkdir(specDir);
    await Deno.mkdir(sharedDir);
    const specPath = join(specDir, "api.yaml");
    await Deno.writeTextFile(
      specPath,
      [
        "openapi: 3.0.3",
        "info:",
        "  title: allow-ref-root probe",
        "  version: 0.0.1",
        "paths:",
        "  /pets:",
        "    get:",
        "      operationId: getPet",
        "      responses:",
        '        "200":',
        "          description: Pet via shared types",
        "          content:",
        "            application/json:",
        "              schema:",
        '                $ref: "../shared/types.yaml#/components/schemas/Pet"',
        "components: {}",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      join(sharedDir, "types.yaml"),
      [
        "components:",
        "  schemas:",
        "    Pet:",
        "      type: object",
        "      required: [id]",
        "      properties:",
        "        id: { type: string }",
        "",
      ].join("\n"),
    );

    // Without broadened root: must reject (escapes specDir).
    let rejected: unknown;
    try {
      await RefSafety.checkRefSafety(specPath);
    } catch (e) {
      rejected = e;
    }
    assert(rejected !== undefined, "default root must reject ../shared/types.yaml");

    // With --allow-ref-root <tmp>: must accept (resolves within tmp).
    await RefSafety.checkRefSafety(specPath, { allowRefRoot: tmp });
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("ref pre-flight: allows hash-only local refs (smoke)", async () => {
  requireModule();
  const specPath = join(FIXTURE_DIR, "local-ref.yaml");
  // Should resolve cleanly — no external file segment, no path traversal.
  await RefSafety.checkRefSafety(specPath);
});

Deno.test("ref pre-flight: surfaces a usable error class shape", () => {
  requireModule();
  // The implementation must export a `RefEscapesRoot` error class with the
  // matching `name` so callers can `instanceof`-check or pattern-match it.
  assert(typeof RefSafety.RefEscapesRoot === "function", "RefEscapesRoot must be exported");
  const err = new RefSafety.RefEscapesRoot("probe", { ref: "../x", root: "/tmp/spec" });
  assertEquals(err.name, "RefEscapesRoot");
  // The constructor signature is part of the contract — second arg carries
  // the ref + root context. If this assertion fails, callers can't surface
  // the offending pointer in error messages.
  assertThrows(
    () => {
      throw err;
    },
    RefSafety.RefEscapesRoot,
  );
});
