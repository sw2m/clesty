/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #159 — Parameter `in: cookie`.
 *
 * Mirrors #156 (query) / #157 (header): cookies thread into hey-api's
 * `cookies: { ... }` block via the same `paramsByLocation` plumbing.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/parameter-in-cookie/", import.meta.url),
);

function fixturePath(name: string): string {
  return `${FIXTURE_DIR}${name}`;
}

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(fixturePath(fixture));
  return typeof result === "string" ? result : (result.source ?? "");
}

function flagsMatching(src: string, re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(re)) out.add(m[1]);
  return out;
}

const REQUIRED_RE = /requiredOption\(\s*["']--([a-zA-Z0-9_-]+)/g;
const OPTIONAL_RE = /(?<!required)\.option\(\s*["']--([a-zA-Z0-9_-]+)/g;

Deno.test("compile (#159): required cookie parameter emits required `--<name>` flag", async () => {
  const src = await emitSource("required-cookie.yaml");
  assert(
    flagsMatching(src, REQUIRED_RE).has("session"),
    `expected required '--session' flag; src:\n${src}`,
  );
});

Deno.test("compile (#159): optional cookie parameter emits a plain `option` flag", async () => {
  const src = await emitSource("optional-cookie.yaml");
  assert(
    !flagsMatching(src, REQUIRED_RE).has("preferences"),
    `expected '--preferences' to NOT be requiredOption; src:\n${src}`,
  );
  assert(
    flagsMatching(src, OPTIONAL_RE).has("preferences"),
    `expected optional '--preferences' flag; src:\n${src}`,
  );
});

Deno.test("compile (#159): cookie parameter threads into hey-api `cookies: { ... }` block", async () => {
  const src = await emitSource("required-cookie.yaml");
  const block = src.match(/cookies\s*:\s*\{([^}]*)\}/);
  assert(block !== null, `expected a 'cookies: { ... }' block; src:\n${src}`);
  assertStringIncludes(block[1], "session");
});

Deno.test("compile (#159): operation with no cookie parameters has no `cookies` block", async () => {
  const src = await emitSource("no-cookie.yaml");
  const block = src.match(/cookies\s*:\s*\{([^}]*)\}/);
  if (block !== null) {
    assert(
      block[1].trim().length === 0,
      `expected empty/absent 'cookies: {}' for no-cookie op; got: ${block[0]}`,
    );
  }
});
