/**
 * Red-Gate scaffold for sw2m/clesty issue #307 — Server URL with no servers defined.
 *
 * staging: tests are stubbed (`Deno.test.ignore`) until #307 grows a tech
 *          spec and the implementation lands. Activation flow:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each `Deno.test.ignore` with `Deno.test`.
 *            3. Remove every `// wip` and `// staging` line.
 *            4. Land impl as a non-test commit descending from the
 *               Red-gate-cleared marker (philosophies §VIII).
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once the relevant src/compile module
// grows the wiring for Server URL with no servers defined.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/server-url-with-no-servers-defined/", import.meta.url),
);

// staging: keep bindings lint-clean while assertions are still WIP.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — primary contract.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#307 (wip): Server URL with no servers defined — primary contract",
  () => {
    // staging: replace this stub once the tech spec on #307 pins down the
    // exact contract. The shape mirrors the sibling Red-Gate suites
    // (e.g. tests/compile/responses_test.ts) — graceful import of the
    // code-under-test, fixture fed in, structural assertion on the
    // emitted source / behaviour.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — refusal / edge case (if applicable per the to-be-written spec).
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#307 (wip): Server URL with no servers defined — refusal / edge case",
  () => {
    // staging: replace this stub once the tech spec on #307 pins the
    // refusal / edge-case shape. If the spec turns out to be acceptance-
    // only (no refusal cases), drop this test and update the activation
    // checklist in the PR body.
    assert(true, "wip");
  },
);
