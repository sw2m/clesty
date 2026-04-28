/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #152 — Operation `callbacks`.
 *
 * Out-of-band callbacks are documentation-only for clesty: the generated
 * binary exposes a `describe-callbacks` subcommand that lists, per
 * operation, the named callbacks and their URL templates. Runtime
 * expressions like `{$request.body#/callbackUrl}` appear verbatim — clesty
 * never resolves them since no live callback request is issued.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const mod = await import("../../src/compile/codegen.ts");
// deno-lint-ignore no-explicit-any
const Codegen: any = (mod as Record<string, unknown>).Codegen ?? mod;

const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/operation-callbacks/", import.meta.url),
);

async function emitSource(fixture: string): Promise<string> {
  const result = await Codegen.emit(`${FIXTURE_DIR}${fixture}`);
  return typeof result === "string" ? result : (result.source ?? "");
}

Deno.test("compile (#152): doc with callbacks emits a `describe-callbacks` subcommand", async () => {
  const src = await emitSource("with-callbacks.yaml");
  const match = src.match(/\.command\(\s*["']describe-callbacks["']/);
  assert(
    match !== null,
    `expected a 'describe-callbacks' subcommand; src:\n${src}`,
  );
});

Deno.test("compile (#152): describe output renders runtime expressions verbatim", async () => {
  const src = await emitSource("with-callbacks.yaml");
  // The expression in the fixture is `{$request.body#/callbackUrl}` — it
  // should appear verbatim in the emitted source so the runtime can
  // print it as-is.
  assertStringIncludes(src, "{$request.body#/callbackUrl}");
});

Deno.test("compile (#152): describe-callbacks issues no HTTP / fetch call", async () => {
  const src = await emitSource("with-callbacks.yaml");
  // Find the action block for describe-callbacks. It must NOT contain
  // `client.<op>(`, `fetch(`, or `await client.` — describe is a pure
  // print operation, no live request.
  const block = src.match(
    /\.command\(\s*["']describe-callbacks["'][\s\S]*?\.action\(([\s\S]*?)\)\s*;/,
  );
  assert(block !== null, `could not locate describe-callbacks action; src:\n${src}`);
  assert(
    !/\bfetch\s*\(/.test(block[1]) && !/await\s+client\./.test(block[1]),
    `describe-callbacks action must not call fetch/client; got:\n${block[1]}`,
  );
});

Deno.test("compile (#152): doc with no callbacks emits no describe-callbacks subcommand", async () => {
  const src = await emitSource("no-callbacks.yaml");
  assert(
    !/\.command\(\s*["']describe-callbacks["']/.test(src),
    `expected NO describe-callbacks subcommand for callback-free doc; src:\n${src}`,
  );
});

Deno.test("compile (#152): each named callback's expression appears in describe output", async () => {
  const src = await emitSource("multi-callbacks.yaml");
  // Both onUpdate and onDelete should appear with their expressions.
  assertStringIncludes(src, "{$request.body#/onUpdateUrl}");
  assertStringIncludes(src, "{$request.body#/onDeleteUrl}");
});
