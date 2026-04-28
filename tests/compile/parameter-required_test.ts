/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #162 — Parameter `required`.
 *
 * Cross-cutting test of the `required: true` semantics across every parameter
 * location (query / header / cookie). The path location skips the test
 * here because the OpenAPI spec mandates `required: true` for in:path —
 * #130's path-templating tests already cover that case.
 *
 * Codegen plumbing landed in #469; this PR only exercises the surface.
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/parameter-required/", import.meta.url),
);

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(`${FIXTURE_DIR}${fixture}`);
  return typeof result === "string" ? result : (result.source ?? "");
}

function flagsMatching(src: string, re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(re)) out.add(m[1]);
  return out;
}

const REQUIRED_RE = /requiredOption\(\s*["']--([a-zA-Z0-9_-]+)/g;
const OPTIONAL_RE = /(?<!required)\.option\(\s*["']--([a-zA-Z0-9_-]+)/g;

Deno.test("compile (#162): required: true emits requiredOption across query/header/cookie", async () => {
  const src = await emitSource("required-mixed.yaml");
  const required = flagsMatching(src, REQUIRED_RE);
  assert(required.has("status"), `expected '--status' (query) required; src:\n${src}`);
  assert(required.has("X-Tenant"), `expected '--X-Tenant' (header) required; src:\n${src}`);
  assert(required.has("session"), `expected '--session' (cookie) required; src:\n${src}`);
});

Deno.test("compile (#162): required: false emits plain option across query/header/cookie", async () => {
  const src = await emitSource("optional-mixed.yaml");
  const required = flagsMatching(src, REQUIRED_RE);
  const optional = flagsMatching(src, OPTIONAL_RE);
  for (const name of ["limit", "X-Trace-Id", "preferences"]) {
    assert(!required.has(name), `'--${name}' must NOT be requiredOption; src:\n${src}`);
    assert(optional.has(name), `'--${name}' must be optional option; src:\n${src}`);
  }
});

Deno.test("compile (#162): absent `required` field defaults to optional", async () => {
  const src = await emitSource("absent-required.yaml");
  // OpenAPI spec: `required` defaults to false except for in:path.
  const required = flagsMatching(src, REQUIRED_RE);
  assert(
    !required.has("limit"),
    `expected absent 'required' to behave as optional; src:\n${src}`,
  );
});
