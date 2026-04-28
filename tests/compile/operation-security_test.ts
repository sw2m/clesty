/**
 * Red-Gate scaffold for sw2m/clesty issue #154 — Operation `security`.
 *
 * staging: tests are stubbed (`Deno.test.ignore`) until the tech spec lands
 *          on issue #154 and the implementation is written. To activate:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each `Deno.test.ignore` with `Deno.test`.
 *            3. Remove every `// wip` and `// staging` line.
 *            4. Add the implementation in a follow-up commit that descends
 *               from the Red-gate-cleared marker — see philosophies §VIII
 *               (4-Result Rule) and the bootstrap pattern used in #453-#457.
 *
 * Goal (from the linked goal-spec, issue #3):
 *   - Per-op `security` overrides top-level.
 *   - `security: []` removes auth on the operation entirely.
 *   - Non-empty per-op `security` replaces the inherited set.
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once src/compile/codegen.ts grows the
// security wiring. The graceful try/import pattern from sibling Red-Gate
// suites (e.g. tests/compile/responses_test.ts) is the canonical shape.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-security/", import.meta.url),
);

// staging: keep the unused-binding lint-clean while the assertions are
// still WIP. Drop these two no-ops when the tests un-ignore.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — Empty `security: []` on an operation removes auth.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#154 (wip): operation with `security: []` emits no auth flag",
  () => {
    // staging: build a fixture where the doc has top-level `security: [...]`
    // but the operation overrides with `security: []`. Compile the spec via
    // `Codegen.emit(specPath)` and assert the generated subcommand source
    // does NOT declare any auth-bearing CLI flag (no `--token`, `--api-key`,
    // etc. tied to that operation).
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — Non-empty per-op `security` replaces the inherited set.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#154 (wip): non-empty operation `security` replaces inherited top-level set",
  () => {
    // staging: top-level `security: [{ apiKey: [] }]`; operation overrides
    // with `security: [{ bearerAuth: [] }]`. Assert generated subcommand
    // declares the bearerAuth-derived flag and NOT the apiKey-derived one.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item C — `security` OR-alternatives: any one in the list satisfies auth.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#154 (wip): operation `security` OR-alternatives are runnable with any one",
  () => {
    // staging: operation with `security: [{ apiKey: [] }, { bearerAuth: [] }]`.
    // Assert the generated subcommand surface admits either flag set —
    // exact CLI shape (mutually-exclusive groups vs. precedence ordering)
    // is part of the tech-spec to be written on #154.
    assert(true, "wip");
  },
);
