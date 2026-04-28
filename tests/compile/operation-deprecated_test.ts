/**
 * Red-Gate scaffold for sw2m/clesty issue #153 — Operation `deprecated`.
 *
 * staging: tests are stubbed (`Deno.test.ignore`) until #153 grows a tech
 *          spec and the implementation lands. Activation flow:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each `Deno.test.ignore` with `Deno.test`.
 *            3. Remove every `// wip` and `// staging` line.
 *            4. Land impl as a non-test commit descending from the
 *               Red-gate-cleared marker (philosophies §VIII).
 *
 * Goal (from #3):
 *   - `deprecated: true` on an operation marks it deprecated.
 *   - `--help` for the subcommand surfaces a deprecation banner.
 *   - Invocation prints a deprecation warning to stderr.
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once src/compile/codegen.ts grows the
// deprecated wiring. The graceful try/import pattern is the canonical shape.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-deprecated/", import.meta.url),
);

// staging: keep the bindings lint-clean while assertions are still WIP.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — `deprecated: true` surfaces in `--help`.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#153 (wip): operation with `deprecated: true` shows banner in --help output",
  () => {
    // staging: compile a fixture with one deprecated operation and one
    // active operation. Run the generated binary's `--help`. Assert the
    // deprecated subcommand line includes a "(deprecated)" marker (or
    // similar — exact text per the to-be-written tech spec).
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — invocation of a deprecated op writes a warning to stderr.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#153 (wip): invoking a deprecated operation prints warning to stderr",
  () => {
    // staging: compile + invoke the deprecated op against a stubbed server.
    // Assert stderr contains a deprecation warning. Exit code remains 0
    // unless the call itself fails — deprecation is a warning, not an
    // error.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item C — default (`deprecated` absent, or `false`) emits no warning.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#153 (wip): non-deprecated operation emits no banner / warning",
  () => {
    // staging: control fixture. Assert the active subcommand has no
    // deprecation banner in --help and no warning on invocation.
    assert(true, "wip");
  },
);
