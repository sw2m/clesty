/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #163 — Parameter `deprecated`.
 *
 * `deprecated: true` on a parameter must surface in the generated CLI so a
 * user reading `--help` learns the flag is on the way out without having
 * to read the OpenAPI doc directly. The exact rendering is part of the
 * codegen contract; this test pins down the structural shape: the
 * generated source contains the literal string "(DEPRECATED)" inside the
 * option's description for any deprecated parameter.
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/parameter-deprecated/", import.meta.url),
);

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(`${FIXTURE_DIR}${fixture}`);
  return typeof result === "string" ? result : (result.source ?? "");
}

Deno.test("compile (#163): deprecated query parameter description carries (DEPRECATED) marker", async () => {
  const src = await emitSource("deprecated-query.yaml");
  // The deprecation marker should be on the line that declares the flag,
  // not just somewhere in the source. Match either an `option(...)` or
  // `requiredOption(...)` line whose description contains DEPRECATED.
  const match = src.match(/(?:requiredOption|option)\(\s*["']--legacy[^)]*DEPRECATED/i);
  assert(
    match !== null,
    `expected '--legacy' option's description to include DEPRECATED; src:\n${src}`,
  );
});

Deno.test("compile (#163): non-deprecated parameter has no DEPRECATED marker", async () => {
  const src = await emitSource("active-query.yaml");
  // Control fixture — no parameter has deprecated: true. Source should
  // contain no DEPRECATED tokens at all.
  assert(
    !/DEPRECATED/i.test(src),
    `expected no DEPRECATED token for active parameters; src:\n${src}`,
  );
});

Deno.test("compile (#163): deprecated header parameter also marked", async () => {
  const src = await emitSource("deprecated-header.yaml");
  const match = src.match(/(?:requiredOption|option)\(\s*["']--X-Old[^)]*DEPRECATED/i);
  assert(
    match !== null,
    `expected '--X-Old' header option to include DEPRECATED; src:\n${src}`,
  );
});
