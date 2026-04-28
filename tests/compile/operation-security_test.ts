/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #154 — Operation `security`.
 *
 * Every operation's effective security is the per-operation `security`
 * array if present, otherwise the doc-level `security` array. An empty
 * `security: []` removes auth on that operation entirely.
 *
 * For each effective security requirement, the codegen emits a CLI flag
 * derived from the named scheme in `components.securitySchemes`. The
 * exact flag shape per scheme:
 *   - apiKey:     `--api-key <value>`
 *   - http bearer: `--bearer-token <token>`
 *
 * Other schemes (oauth2 flows, mutualTLS) are out of scope for this PR
 * and consolidated under #154; they re-open if a clesty-side gap appears.
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-security/", import.meta.url),
);

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(`${FIXTURE_DIR}${fixture}`);
  return typeof result === "string" ? result : (result.source ?? "");
}

/** Find the flags declared inside the action block for a given subcommand. */
function flagsForOp(src: string, kebab: string): string {
  const re = new RegExp(
    `\\.command\\(\\s*["']${kebab}["'][\\s\\S]*?\\.action\\(`,
    "m",
  );
  const m = src.match(re);
  return m ? src.slice(m.index!, m.index! + m[0].length) : "";
}

Deno.test("compile (#154): doc-level security inherited by operation emits auth flag", async () => {
  const src = await emitSource("doc-level-only.yaml");
  const block = flagsForOp(src, "get-thing");
  assert(
    /--api-key/.test(block),
    `expected '--api-key' flag inherited from doc-level security; block:\n${block}`,
  );
});

Deno.test("compile (#154): operation `security: []` removes inherited auth flag", async () => {
  const src = await emitSource("op-removes-auth.yaml");
  const block = flagsForOp(src, "get-thing");
  assert(
    !/--api-key/.test(block),
    `expected NO '--api-key' flag for op with security: []; block:\n${block}`,
  );
});

Deno.test("compile (#154): non-empty op-level security replaces doc-level inherited set", async () => {
  const src = await emitSource("op-replaces.yaml");
  const block = flagsForOp(src, "get-thing");
  assert(
    /--bearer-token/.test(block),
    `expected '--bearer-token' from op-level security; block:\n${block}`,
  );
  assert(
    !/--api-key/.test(block),
    `expected '--api-key' to NOT carry through (replaced); block:\n${block}`,
  );
});

Deno.test("compile (#154): no security anywhere → no auth flags", async () => {
  const src = await emitSource("no-security.yaml");
  const block = flagsForOp(src, "get-thing");
  assert(
    !/--api-key|--bearer-token/.test(block),
    `expected no auth flags for unsecured op; block:\n${block}`,
  );
});
