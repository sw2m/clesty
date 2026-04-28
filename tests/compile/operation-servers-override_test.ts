/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #155 — Operation `servers`
 * override.
 *
 * Each operation's generated source threads the chosen base URL into the
 * hey-api client call via a `baseUrl: "<url>"` literal. Precedence per
 * the OpenAPI spec: op-level `servers` > path-level `servers` > doc-level
 * `servers`. The first entry's `url` wins; URL-variable substitution is a
 * separable concern (covered elsewhere if/when a tech spec lands).
 */

import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-servers-override/", import.meta.url),
);

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(`${FIXTURE_DIR}${fixture}`);
  return typeof result === "string" ? result : (result.source ?? "");
}

/** Find the baseUrl threaded into an operation's client call. */
function baseUrlFor(src: string, opId: string): string | null {
  // Match one operation block at a time: `.command("<kebab>"...)` ...
  // `await client.<opId>({ baseUrl: "<url>", ...`
  const re = new RegExp(`client\\.${opId}\\([^)]*baseUrl\\s*:\\s*["']([^"']+)["']`);
  const m = src.match(re);
  return m ? m[1] : null;
}

Deno.test("compile (#155): op-level `servers` beats path-level and doc-level", async () => {
  const src = await emitSource("op-beats-path.yaml");
  const url = baseUrlFor(src, "getThing");
  assert(url === "https://op.example.com", `expected op-level URL; got ${url}\nsrc:\n${src}`);
});

Deno.test("compile (#155): path-level `servers` beats doc-level when no op-level set", async () => {
  const src = await emitSource("path-beats-doc.yaml");
  const url = baseUrlFor(src, "getThing");
  assert(url === "https://path.example.com", `expected path-level URL; got ${url}\nsrc:\n${src}`);
});

Deno.test("compile (#155): falls back to doc-level when no path/op override", async () => {
  const src = await emitSource("doc-only.yaml");
  const url = baseUrlFor(src, "getThing");
  assert(url === "https://doc.example.com", `expected doc-level URL; got ${url}\nsrc:\n${src}`);
});

Deno.test("compile (#155): no `servers` anywhere → no baseUrl in client call", async () => {
  const src = await emitSource("no-servers.yaml");
  const url = baseUrlFor(src, "getThing");
  assert(url === null, `expected no baseUrl in client call; got ${url}\nsrc:\n${src}`);
});
