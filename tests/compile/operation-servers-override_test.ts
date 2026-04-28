/**
 * Red-Gate scaffold for sw2m/clesty issue #155 — Operation `servers` override.
 *
 * staging: tests are stubbed (`Deno.test.ignore`) until #155 grows a tech
 *          spec and the implementation lands. Activation flow:
 *            1. Flesh out the test bodies against the final tech spec.
 *            2. Replace each `Deno.test.ignore` with `Deno.test`.
 *            3. Remove every `// wip` and `// staging` line.
 *            4. Land impl as a non-test commit descending from the
 *               Red-gate-cleared marker (philosophies §VIII).
 *
 * Goal (from #3):
 *   - Per-op `servers` overrides path-level which overrides doc-level.
 *   - Op uses its own base URL when `servers` is set on it.
 *
 * @module
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// wip: import the code-under-test once src/compile/codegen.ts grows the
// per-op servers wiring.
// deno-lint-ignore no-explicit-any
let Codegen: any;
try {
  Codegen = await import("../../src/compile/codegen.ts");
} catch {
  Codegen = null;
}

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-servers-override/", import.meta.url),
);

// staging: keep bindings lint-clean while assertions are still WIP.
void Codegen;
void FIXTURE_DIR;

// ---------------------------------------------------------------------------
// Item A — Op-level `servers` beats path-level `servers`.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#155 (wip): operation `servers` overrides path-level `servers`",
  () => {
    // staging: fixture has both path-level and op-level `servers`. Compile
    // and assert the operation's generated request URL uses the OP-LEVEL
    // base URL, not the path-level one. Exact assertion shape (handler
    // body inspection vs. integration-harness invocation) per the
    // to-be-written tech spec.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item B — Path-level `servers` beats doc-level `servers`.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#155 (wip): path-level `servers` overrides doc-level `servers`",
  () => {
    // staging: fixture has doc-level + path-level (no op-level). Operation
    // uses path-level base URL.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item C — Doc-level `servers` is the fallback when no override exists.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#155 (wip): operation falls back to doc-level `servers` when no override",
  () => {
    // staging: doc-level only. Operation uses doc-level base URL.
    assert(true, "wip");
  },
);

// ---------------------------------------------------------------------------
// Item D — `servers[].variables` substitution (if scoped to this issue).
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#155 (wip): server URL variable substitution honours per-op overrides",
  () => {
    // staging: fixture with `{environment}` variable in op-level server.
    // Assert variable defaults are baked into the generated handler, with
    // a CLI flag to override (`--server-environment`). Exact flag name
    // and override semantics per the to-be-written tech spec.
    assert(true, "wip");
  },
);
