/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #153 — Operation `deprecated`.
 *
 * `deprecated: true` on an operation must surface in the generated CLI so a
 * user reading `--help` for the subcommand sees a deprecation marker. The
 * codegen contract: the line declaring the subcommand carries the literal
 * `(DEPRECATED)` token in its description.
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-deprecated/", import.meta.url),
);

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(`${FIXTURE_DIR}${fixture}`);
  return typeof result === "string" ? result : (result.source ?? "");
}

Deno.test("compile (#153): deprecated operation's command description carries (DEPRECATED) marker", async () => {
  const src = await emitSource("deprecated-op.yaml");
  // The marker should be on the line that declares the command (the
  // `.command(...)` call), not just somewhere in the source — co-locate
  // so users reading `--help` see it next to the subcommand name.
  const match = src.match(/\.command\(\s*["'][^"']+["']\s*,\s*["'][^"']*DEPRECATED/i);
  assert(
    match !== null,
    `expected DEPRECATED marker in the deprecated subcommand's .command() description; src:\n${src}`,
  );
});

Deno.test("compile (#153): non-deprecated operation has no DEPRECATED marker on its command", async () => {
  const src = await emitSource("active-op.yaml");
  // Control fixture — the only operation is not deprecated. Source must
  // contain no DEPRECATED tokens at all.
  assert(
    !/DEPRECATED/i.test(src),
    `expected no DEPRECATED token for active operation; src:\n${src}`,
  );
});

Deno.test("compile (#153): both deprecated and active ops in same doc — only one carries marker", async () => {
  const src = await emitSource("mixed-ops.yaml");
  const deprecatedMatches = src.match(/\.command\(\s*["']get-old-thing["'][^)]*DEPRECATED/i);
  const activeMatches = src.match(/\.command\(\s*["']get-new-thing["'][^)]*DEPRECATED/i);
  assert(deprecatedMatches !== null, `expected get-old-thing to carry DEPRECATED; src:\n${src}`);
  assert(activeMatches === null, `get-new-thing must NOT carry DEPRECATED; src:\n${src}`);
});
