/**
 * Minimal test harness.
 *
 * Loads OpenAPI fixtures from `tests/fixtures/` and parses them as YAML. As
 * the implementation grows this module will gain helpers for invoking the
 * generator, capturing CLI output, etc. For now it only knows how to read a
 * fixture off disk.
 *
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import { fromFileUrl, join } from "@std/path";

const FIXTURES_DIR = fromFileUrl(new URL("../fixtures/", import.meta.url));

/** Resolve a fixture path relative to `tests/fixtures/`. */
export function fixturePath(name: string): string {
  return join(FIXTURES_DIR, name);
}

/** Read a fixture file as a UTF-8 string. */
export async function readFixture(name: string): Promise<string> {
  return await Deno.readTextFile(fixturePath(name));
}

/**
 * Load a YAML fixture and return the parsed document. The return type is
 * `unknown` on purpose — callers should narrow it themselves until we have
 * real OpenAPI types in `src/`.
 */
export async function loadYamlFixture(name: string): Promise<unknown> {
  const text = await readFixture(name);
  return parseYaml(text);
}
