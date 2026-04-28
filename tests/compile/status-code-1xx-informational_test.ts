/**
 * Red-Gate scaffold for sw2m/clesty issue #429 — Status code 1XX informational.
 *
 * staging: tests are stubbed until #429 grows a tech spec and the
 *          implementation lands. Activation flow:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each Deno.test.ignore with Deno.test.
 *            3. Remove every // wip and // staging line.
 *            4. Land impl as a non-test commit descending from the
 *               Red-gate-cleared marker (philosophies VIII).
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once the relevant src/compile module
// grows the wiring for this issue.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/status-code-1xx-informational/", import.meta.url),
);

// staging: keep bindings lint-clean while assertions are still WIP.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — primary contract.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#429 (wip): primary contract",
  () => {
    // staging: replace once #429 pins the contract.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — refusal / edge case.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#429 (wip): refusal / edge case",
  () => {
    // staging: replace once #429 pins the refusal shape.
    assert(true, "wip");
  },
);
