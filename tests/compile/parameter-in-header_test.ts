/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #157 — Parameter `in: header`.
 *
 * Mirrors #156's query suite: the codegen now handles all four parameter
 * locations uniformly (path / query / header / cookie). This file asserts
 * the header-specific surface — `--<name>` flags + threading into the
 * hey-api `headers: { ... }` block.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/parameter-in-header/", import.meta.url),
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

Deno.test("compile (#157): required header parameter emits required `--<name>` flag", async () => {
  const src = await emitSource("required-header.yaml");
  assert(
    flagsMatching(src, REQUIRED_RE).has("X-Tenant"),
    `expected required '--X-Tenant' flag; src:\n${src}`,
  );
});

Deno.test("compile (#157): optional header parameter emits a plain `option` flag", async () => {
  const src = await emitSource("optional-header.yaml");
  assert(
    !flagsMatching(src, REQUIRED_RE).has("X-Trace-Id"),
    `expected '--X-Trace-Id' to NOT be requiredOption; src:\n${src}`,
  );
  assert(
    flagsMatching(src, OPTIONAL_RE).has("X-Trace-Id"),
    `expected optional '--X-Trace-Id' flag; src:\n${src}`,
  );
});

Deno.test("compile (#157): header parameter threads into hey-api `headers: { ... }` block", async () => {
  const src = await emitSource("required-header.yaml");
  const block = src.match(/headers\s*:\s*\{([^}]*)\}/);
  assert(block !== null, `expected a 'headers: { ... }' block; src:\n${src}`);
  assertStringIncludes(block[1], "X-Tenant");
});

Deno.test("compile (#157): hyphenated header names use bracket-access (regression)", async () => {
  // `X-Tenant` was previously emitted as `X-Tenant: opts.X-Tenant`
  // which TypeScript parses as `opts.X - Tenant` — silent miscompile.
  // Quoted-key + bracket-access is the only form that round-trips.
  const src = await emitSource("required-header.yaml");
  // Disallowed: bare-identifier on a hyphen-bearing name.
  assert(
    !/\bopts\.X-Tenant\b/.test(src),
    `expected NO 'opts.X-Tenant' bare-access form; src:\n${src}`,
  );
  // Required: bracket-access form.
  assert(
    /\bopts\["X-Tenant"\]/.test(src),
    `expected 'opts["X-Tenant"]' bracket-access form; src:\n${src}`,
  );
});

Deno.test("compile (#157): operation with no header parameters has no `headers` block", async () => {
  const src = await emitSource("no-header.yaml");
  const block = src.match(/headers\s*:\s*\{([^}]*)\}/);
  if (block !== null) {
    assert(
      block[1].trim().length === 0,
      `expected empty/absent 'headers: {}' for no-header op; got: ${block[0]}`,
    );
  }
});
