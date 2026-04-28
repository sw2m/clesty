/**
 * Red-Gate scaffold for sw2m/clesty issue #156 — Parameter `in: query`.
 *
 * staging: tests are stubbed (`Deno.test.ignore`) until #156 grows a tech
 *          spec and the implementation lands. Activation flow:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each `Deno.test.ignore` with `Deno.test`.
 *            3. Remove every `// wip` and `// staging` line.
 *            4. Land impl as a non-test commit descending from the
 *               Red-gate-cleared marker (philosophies §VIII).
 *
 * Goal (from #3):
 *   - Query string parameter — emits `--<name>` flag.
 *   - Value lands as `?name=value` in the request URL.
 *   - Absent flag omits the parameter unless it's marked `required: true`.
 *
 * Sibling-spec context: #130 (path templating, just merged) handled the
 * `path:` block of hey-api's typed input; the query case is the analogous
 * `query:` block, gated by `parameters[].in === "query"`.
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once src/compile/codegen.ts grows the
// query-parameter wiring.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/parameter-in-query/", import.meta.url),
);

// staging: keep bindings lint-clean while assertions are still WIP.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — Required query parameter emits a required CLI flag.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#156 (wip): required query parameter emits a required `--<name>` flag",
  () => {
    // staging: fixture: GET /pets?status with `parameters: [{ name: status,
    // in: query, required: true, schema: { type: string } }]`. Compile
    // and assert generated subcommand has a `requiredOption("--status ...")`
    // (or yargs equivalent — pattern-match against the same regex set used
    // in tests/compile/path-templating_test.ts for required flags).
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — Optional query parameter emits an optional flag.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#156 (wip): optional query parameter emits a non-required `--<name>` flag",
  () => {
    // staging: fixture: parameter without `required: true`. Assert the
    // generated subcommand declares a plain `option("--limit ...")` (no
    // requiredOption / demandOption).
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item C — Provided value threads into the hey-api `query: { ... }` block.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#156 (wip): provided query value threads into hey-api `query: { name: ... }`",
  () => {
    // staging: assert the generated handler builds `client.<op>({ query:
    // { status: opts.status, limit: opts.limit } })` — same structural
    // probe as #130's `path: { ... }` test. Key presence in the `query:`
    // block matters; whitespace / quoting does not.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item D — Absent optional flag omits the key from the query object.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#156 (wip): absent optional flag omits the key from the query object",
  () => {
    // staging: invoke the compiled binary without `--limit`. Assert the
    // outbound request URL does NOT contain `limit=` — the parameter
    // is omitted when the flag is absent and not required. Exact harness
    // depends on the compile-and-run integration suite landing.
    assert(true, "wip");
  },
);
