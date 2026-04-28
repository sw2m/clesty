/**
 * Red-Gate tests for sw2m/clesty issue #130 — Path templating with `{var}`.
 *
 * Phase 2a (per `sw2m/philosophies` §II): tests are written BEFORE the
 * implementation. Every test here MUST fail today because
 * `src/compile/codegen.ts` (the path-templating codegen template) does not
 * exist yet. The graceful-import pattern lets `deno task test` run end-to-end
 * and emit a uniform "not implemented yet — Red Gate" failure for each
 * numbered case rather than aborting the whole run with a module-resolution
 * error.
 *
 * Once the implementation lands (Green Gate), these same assertions must
 * pass unchanged.
 *
 * Spec mapping ("A. Compile-time codegen tests" subsection of #130):
 *   1. Single path parameter — generated code declares one required flag and
 *      threads it through `client.{op}({ path: { id } })`.
 *   2. Multiple path parameters — one flag per parameter, all threaded.
 *   3. Path with no parameters — no path-parameter flags.
 *   4. Path parameter not declared in `parameters` — compile-time error
 *      `Compile.UndeclaredPathParam`.
 *   5. Path parameter declared but missing `required: true` — compile
 *      succeeds with a `Compile.NonStrictPath` warning.
 *
 * The contract under test is a `Codegen.emit(specPath)` (or equivalently
 * named) function returning a `{ source, warnings }` shape. The tests use
 * loose-shape probes so the implementation has room to choose between
 * `emit`, `compile`, `render`, etc., without forcing the test rewrite — the
 * `requireImpl()` helper picks whichever entry point is exposed.
 *
 * @module
 */

import { assert, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

// deno-lint-ignore no-explicit-any
let Codegen: any;
// deno-lint-ignore no-explicit-any
let Compile: any;

try {
  const mod = await import("../../src/compile/codegen.ts");
  Codegen = mod.Codegen ?? mod.CodegenTemplate ?? mod.default ?? mod;
  Compile = mod.Compile;
} catch {
  Codegen = null;
  Compile = null;
}

const RED_GATE = "compile codegen not implemented yet — Red Gate (issue #130)";

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/path-templating/", import.meta.url),
);

function fixturePath(name: string): string {
  return `${FIXTURE_DIR}${name}`;
}

/** Resolve whichever public entry point the implementation exposes. */
// deno-lint-ignore no-explicit-any
function emitFn(): (spec: string) => Promise<any> | any {
  if (!Codegen) throw new Error(RED_GATE);
  const candidates = ["emit", "compile", "render", "generate", "fromSpec"];
  for (const name of candidates) {
    const fn = Codegen[name];
    if (typeof fn === "function") return fn.bind(Codegen);
  }
  throw new Error(RED_GATE);
}

/**
 * Run the codegen template against a fixture and return the emitted TS source
 * as a single string. Tests assert on substring patterns rather than AST shape
 * so the implementation has room to pick its own commander/yargs/etc. style
 * without forcing test rewrites.
 */
async function emitSource(fixture: string): Promise<string> {
  const fn = emitFn();
  const result = await fn(fixturePath(fixture));
  // Accept several plausible return shapes:
  //   - a raw string (the source)
  //   - { source: string }
  //   - { files: Record<string, string> } (concatenated, like #241's harness)
  if (typeof result === "string") return result;
  if (typeof result?.source === "string") return result.source;
  if (result?.files && typeof result.files === "object") {
    return Object.entries(result.files as Record<string, string>)
      .filter(([name]) => name.endsWith(".ts"))
      .map(([, body]) => body)
      .join("\n\n// ---- file boundary ----\n\n");
  }
  throw new Error(
    `unexpected codegen result shape: ${JSON.stringify(Object.keys(result ?? {}))}`,
  );
}

/** Collect warnings from the codegen result, regardless of return shape. */
async function emitWarnings(fixture: string): Promise<unknown[]> {
  const fn = emitFn();
  const result = await fn(fixturePath(fixture));
  if (Array.isArray(result?.warnings)) return result.warnings;
  return [];
}

// ---------------------------------------------------------------------------
// Item 1 — Single path parameter
// ---------------------------------------------------------------------------

Deno.test("compile (item 1): single path parameter emits one required flag", async () => {
  if (!Codegen) throw new Error(RED_GATE);
  const src = await emitSource("single-path-param.yaml");
  // The generated subcommand must declare exactly one required option for
  // `--id`. We probe several plausible commander/yargs/etc. shapes to keep
  // the assertion robust against the implementer's CLI library choice.
  const requiredIdPatterns = [
    /requiredOption\(\s*["']--id\b/, //                  commander
    /\.option\(\s*["']--id\b[^)]*demandOption/, //       yargs
    /demand(?:Option)?\(\s*["']id["']/, //               yargs alt
    /required[^)]*--id/i, //                              fallback substring
  ];
  assert(
    requiredIdPatterns.some((re) => re.test(src)),
    "expected a required CLI flag '--id' in generated source; got:\n" + src,
  );
});

Deno.test(
  "compile (item 1): single path parameter is threaded into the hey-api client call",
  async () => {
    if (!Codegen) throw new Error(RED_GATE);
    const src = await emitSource("single-path-param.yaml");
    // The handler must build the typed input object the hey-api client expects:
    // `{ path: { id: <coerced id> } }`. We assert on the structural fragment
    // `path:` containing `id:` rather than on whitespace/quote shape.
    const pathThreadingPatterns = [
      /path\s*:\s*\{[^}]*\bid\b/, //                    path: { id ... }
      /\{\s*id\s*:[^}]*\}\s*\)?\s*[,)]/, //              { id: ... }
    ];
    assert(
      pathThreadingPatterns.some((re) => re.test(src)),
      "expected `{ path: { id: ... } }` threading in generated handler; got:\n" + src,
    );
  },
);

// ---------------------------------------------------------------------------
// Item 2 — Multiple path parameters
// ---------------------------------------------------------------------------

Deno.test(
  "compile (item 2): multiple path parameters emit one required flag per parameter",
  async () => {
    if (!Codegen) throw new Error(RED_GATE);
    const src = await emitSource("multi-path-param.yaml");
    const requiredIdPatterns = [
      /requiredOption\(\s*["']--id\b/,
      /\.option\(\s*["']--id\b[^)]*demandOption/,
      /demand(?:Option)?\(\s*["']id["']/,
      /required[^)]*--id/i,
    ];
    const requiredOrderIdPatterns = [
      /requiredOption\(\s*["']--orderId\b/,
      /\.option\(\s*["']--orderId\b[^)]*demandOption/,
      /demand(?:Option)?\(\s*["']orderId["']/,
      /required[^)]*--orderId/i,
    ];
    assert(
      requiredIdPatterns.some((re) => re.test(src)),
      "expected a required CLI flag '--id' for /users/{id}/orders/{orderId}; got:\n" + src,
    );
    assert(
      requiredOrderIdPatterns.some((re) => re.test(src)),
      "expected a required CLI flag '--orderId' for /users/{id}/orders/{orderId}; got:\n" + src,
    );
  },
);

Deno.test(
  "compile (item 2): multiple path parameters are all threaded into the hey-api client call",
  async () => {
    if (!Codegen) throw new Error(RED_GATE);
    const src = await emitSource("multi-path-param.yaml");
    // Both `id` and `orderId` must appear inside the `path: { ... }` block
    // the handler hands to the hey-api client. We accept any whitespace
    // between them but require both keys be present in the structural region.
    const pathBlockMatch = src.match(/path\s*:\s*\{([^}]*)\}/);
    assert(
      pathBlockMatch !== null,
      "expected a `path: { ... }` block in the generated handler; got:\n" + src,
    );
    const block = pathBlockMatch[1];
    assertStringIncludes(block, "id");
    assertStringIncludes(block, "orderId");
  },
);

// ---------------------------------------------------------------------------
// Item 3 — Path with no parameters
// ---------------------------------------------------------------------------

Deno.test(
  "compile (item 3): /health (no path params) emits no path-parameter flags",
  async () => {
    if (!Codegen) throw new Error(RED_GATE);
    const src = await emitSource("no-params.yaml");
    // Negative assertions: the handler must NOT declare any required path-
    // parameter flags, and the hey-api call must NOT thread a non-empty
    // `path: { ... }` object. (An empty `path: {}` is acceptable if hey-api
    // requires the key; we forbid only the case where it carries values.)
    assert(
      !/requiredOption\(/.test(src),
      "expected NO required CLI flags for a no-param operation; got:\n" + src,
    );
    const pathBlockMatch = src.match(/path\s*:\s*\{([^}]*)\}/);
    if (pathBlockMatch !== null) {
      const block = pathBlockMatch[1].trim();
      assert(
        block.length === 0,
        "expected empty `path: {}` (or no `path` key) for a no-param operation; got block: " +
          JSON.stringify(block),
      );
    }
  },
);

// ---------------------------------------------------------------------------
// Item 4 — Undeclared path parameter (refusal)
// ---------------------------------------------------------------------------

Deno.test(
  "compile (item 4): undeclared path param refuses with Compile.UndeclaredPathParam",
  async () => {
    if (!Codegen) throw new Error(RED_GATE);
    const fn = emitFn();
    let thrown: unknown;
    try {
      await fn(fixturePath("undeclared-path-param.yaml"));
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== undefined, "expected codegen to throw on undeclared path param");
    // Either the implementation exposes the error class on `Compile`, or the
    // thrown error self-identifies via its `name` / constructor.name. We
    // accept either to keep the test independent of how the namespace is
    // arranged, while still asserting the exact contract name.
    const expected = "UndeclaredPathParam";
    if (Compile && Compile[expected]) {
      assert(
        thrown instanceof Compile[expected],
        `expected instance of Compile.${expected}, got ${
          (thrown as { constructor?: { name?: string } })?.constructor?.name
        }`,
      );
    } else {
      const name = (thrown as { name?: string }).name ??
        (thrown as { constructor?: { name?: string } })?.constructor?.name;
      assert(
        name === expected,
        `expected error class name '${expected}', got '${name}'`,
      );
    }
    // The error must name the offending parameter so the user can locate it.
    const msg = String((thrown as Error).message ?? "");
    assertStringIncludes(msg, "id");
  },
);

// ---------------------------------------------------------------------------
// Item 5 — Non-strict path (warning, not error)
// ---------------------------------------------------------------------------

Deno.test(
  "compile (item 5): path param missing `required: true` compiles with Compile.NonStrictPath warning",
  async () => {
    if (!Codegen) throw new Error(RED_GATE);
    const fn = emitFn();
    // Compile must SUCCEED — the spec is explicit that this is a warning,
    // not an error.
    let result: unknown;
    try {
      result = await fn(fixturePath("non-strict-path.yaml"));
    } catch (e) {
      throw new Error(
        `expected non-strict path to compile (warning, not error), but threw: ${
          (e as Error).message ?? e
        }`,
      );
    }
    assert(result !== undefined, "expected a non-undefined codegen result");

    // The warning must be surfaced. We probe the most plausible carrier
    // (a `warnings` array on the result) and accept either a structured
    // entry whose `name` / `kind` is `NonStrictPath`, or a string that
    // mentions the contract name.
    const warnings = await emitWarnings("non-strict-path.yaml");
    assert(
      Array.isArray(warnings) && warnings.length > 0,
      "expected at least one warning for a non-strict path",
    );
    const matched = warnings.some((w) => {
      if (typeof w === "string") return w.includes("NonStrictPath");
      const name = (w as { name?: string; kind?: string; code?: string }).name ??
        (w as { kind?: string }).kind ??
        (w as { code?: string }).code;
      if (name === "NonStrictPath") return true;
      const msg = String((w as { message?: string }).message ?? "");
      return msg.includes("NonStrictPath");
    });
    assert(
      matched,
      "expected a `Compile.NonStrictPath` warning; got: " + JSON.stringify(warnings),
    );

    // Despite the warning, the generated source must still emit a required
    // flag for `id` — the URL cannot be built without it, regardless of the
    // parameter object's `required` flag.
    const src = await emitSource("non-strict-path.yaml");
    const requiredIdPatterns = [
      /requiredOption\(\s*["']--id\b/,
      /\.option\(\s*["']--id\b[^)]*demandOption/,
      /demand(?:Option)?\(\s*["']id["']/,
      /required[^)]*--id/i,
    ];
    assert(
      requiredIdPatterns.some((re) => re.test(src)),
      "non-strict path must STILL emit a required '--id' flag; got:\n" + src,
    );
  },
);
