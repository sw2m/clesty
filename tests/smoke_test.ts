/**
 * Smoke test: verifies the test runner is wired and that a fixture parses as
 * YAML with the expected top-level shape. Intentionally trivial — it exists so
 * CI fails loudly the moment the harness, import map, or task wiring breaks
 * before feature tests start being added.
 */

import { assert, assertEquals } from "@std/assert";
import { parse as parseYaml } from "@std/yaml";
import { fromFileUrl } from "@std/path";

class Fixture {
  static readonly DIR = fromFileUrl(new URL("./fixtures/", import.meta.url));

  static async load(name: string): Promise<unknown> {
    return parseYaml(await Deno.readTextFile(`${Fixture.DIR}${name}`));
  }
}

Deno.test("smoke: minimal.yaml parses with a string `openapi` field", async () => {
  const doc = await Fixture.load("minimal.yaml");
  assert(doc !== null && typeof doc === "object");
  assertEquals(typeof (doc as Record<string, unknown>).openapi, "string");
});

Deno.test("smoke: petstore-tiny.yaml parses with a string `openapi` field", async () => {
  const doc = await Fixture.load("petstore-tiny.yaml");
  assert(doc !== null && typeof doc === "object");
  assertEquals(typeof (doc as Record<string, unknown>).openapi, "string");
});
