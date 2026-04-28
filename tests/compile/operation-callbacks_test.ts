/**
 * Red-Gate scaffold for sw2m/clesty issue #152 — Operation `callbacks`.
 *
 * staging: tests are stubbed (`Deno.test.ignore`) until #152 grows a tech
 *          spec and the implementation lands. Activation flow:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each `Deno.test.ignore` with `Deno.test`.
 *            3. Remove every `// wip` and `// staging` line.
 *            4. Land impl as a non-test commit descending from the
 *               Red-gate-cleared marker (philosophies §VIII).
 *
 * Goal (from #3 / #27):
 *   - Out-of-band callbacks. CLI: `cli describe-callbacks` only — clesty
 *     does NOT issue live callback requests.
 *   - Test: callback expressions render in the describe output.
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once src/compile/codegen.ts grows the
// callbacks describe-rendering wiring.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-callbacks/", import.meta.url),
);

// staging: keep bindings lint-clean while assertions are still WIP.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — `describe-callbacks` subcommand exists and lists callback names.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#152 (wip): generated CLI exposes a `describe-callbacks` subcommand",
  () => {
    // staging: compile a fixture with one operation declaring two named
    // callbacks. Run --help on the generated binary. Assert
    // `describe-callbacks` appears among the subcommands. Exact subcommand
    // shape per the to-be-written tech spec.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — Describe output renders runtime callback expressions verbatim.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#152 (wip): describe-callbacks renders the {$request.body#/...} expressions",
  () => {
    // staging: callback URL templates contain runtime expressions like
    // `{$request.body#/callbackUrl}`. Assert these expressions appear in
    // the describe output verbatim — clesty does NOT resolve them, since
    // there is no live callback issued.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item C — No live request is issued by `describe-callbacks`.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#152 (wip): describe-callbacks issues no network request",
  () => {
    // staging: invoke `describe-callbacks` against a fixture and assert
    // the test process makes no outbound HTTP request (probe via a
    // stubbed fetch / network sentinel — exact harness per the to-be-
    // written tech spec).
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item D — Multiple callbacks per operation each render.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#152 (wip): each named callback in an operation renders its own block",
  () => {
    // staging: fixture with `callbacks: { onUpdate: ..., onDelete: ... }`.
    // Assert both names and their URL templates appear in describe output.
    assert(true, "wip");
  },
);
