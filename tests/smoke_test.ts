/**
 * Smoke test: verifies the test harness can load a YAML fixture and that the
 * standard library YAML parser produces the expected top-level shape.
 *
 * This is intentionally trivial. It exists so CI fails loudly the moment the
 * harness, import map, or task wiring breaks — *before* feature tests start
 * being added.
 */

import { assert, assertEquals } from "@std/assert";
import { loadYamlFixture } from "./support/runner.ts";

Deno.test("smoke: harness loads minimal.yaml fixture", async () => {
  const doc = await loadYamlFixture("minimal.yaml");
  assert(doc !== null && typeof doc === "object", "fixture should parse to an object");
  const openapi = (doc as Record<string, unknown>).openapi;
  assertEquals(typeof openapi, "string", "top-level `openapi` field must be a string");
});

Deno.test("smoke: harness loads petstore-tiny.yaml fixture", async () => {
  const doc = await loadYamlFixture("petstore-tiny.yaml");
  assert(doc !== null && typeof doc === "object");
  const openapi = (doc as Record<string, unknown>).openapi;
  assertEquals(typeof openapi, "string");
});
