/**
 * Red-Gate tests for sw2m/clesty issue #148 — Operation `operationId`.
 *
 * Phase 2a (per `sw2m/philosophies` §II): tests are written before the
 * implementation. Every test in this file MUST fail today because
 * `src/compile/operation-id.ts` does not exist yet. The graceful import
 * pattern lets `deno task test` run end-to-end and emit a uniform "not
 * implemented yet — Red Gate" failure for each numbered case in the spec's
 * Test plan rather than aborting the harness with a module-resolution error.
 *
 * Once the implementation lands, these same tests must pass unchanged
 * (Phase 2b — Green Gate).
 *
 * @module
 */

import { assert, assertEquals, assertMatch, assertThrows } from "@std/assert";
import { fromFileUrl } from "@std/path";
import fc from "fast-check";

// deno-lint-ignore no-explicit-any
let OperationId: any;
try {
  OperationId = (await import("../../src/compile/operation-id.ts")).OperationId;
} catch {
  OperationId = null;
}

const RED_GATE = "OperationId not implemented yet — Red Gate";

function requireImpl(): void {
  if (OperationId === null || typeof OperationId?.toCommand !== "function") {
    throw new Error(RED_GATE);
  }
}

/** Output shape required by the spec: lowercase kebab, no leading/trailing/double `-`. */
const SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Acceptance table from the tech spec (#148). */
const ACCEPTANCE: ReadonlyArray<readonly [string, string]> = [
  ["listPets", "list-pets"],
  ["ListPets", "list-pets"],
  ["list-pets", "list-pets"],
  ["list_pets", "list-pets"],
  ["listpets", "listpets"],
  ["getUserByID", "get-user-by-id"],
  ["getURLs", "get-urls"],
  ["parseHTMLDoc", "parse-html-doc"],
  ["getV2Pets", "get-v2-pets"],
  ["2getPets", "2-get-pets"],
  ["__listPets__", "list-pets"],
  ["list pets", "list-pets"],
  ["list/pets", "list-pets"],
  ["listPets!", "list-pets"],
];

// ---------------------------------------------------------------------------
// Test plan item 1 — Acceptance table.
// ---------------------------------------------------------------------------

for (const [input, expected] of ACCEPTANCE) {
  Deno.test(`#148 acceptance: toCommand(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
    requireImpl();
    assertEquals(OperationId.toCommand(input), expected);
  });
}

// ---------------------------------------------------------------------------
// Test plan item 1 (cont.) — Edge cases table.
// ---------------------------------------------------------------------------

Deno.test("#148 edge: empty string throws OperationId.Empty", () => {
  requireImpl();
  assertThrows(() => OperationId.toCommand(""), OperationId.Empty);
});

Deno.test("#148 edge: '---' (all separators) throws OperationId.Empty", () => {
  requireImpl();
  assertThrows(() => OperationId.toCommand("---"), OperationId.Empty);
});

Deno.test("#148 edge: non-ASCII '日本' throws OperationId.NonAscii", () => {
  requireImpl();
  assertThrows(() => OperationId.toCommand("日本"), OperationId.NonAscii);
});

Deno.test("#148 edge: very long string (256+ chars) passes through", () => {
  requireImpl();
  const long = "a".repeat(300);
  const out = OperationId.toCommand(long);
  assertEquals(out, long);
  assertMatch(out, SHAPE);
});

Deno.test("#148 edge: already-kebab is identity-mapped", () => {
  requireImpl();
  assertEquals(OperationId.toCommand("list-pets"), "list-pets");
});

Deno.test("#148 edge: single character 'a' -> 'a'", () => {
  requireImpl();
  assertEquals(OperationId.toCommand("a"), "a");
});

// ---------------------------------------------------------------------------
// Test plan item 2 — Idempotency on each acceptance input.
// ---------------------------------------------------------------------------

for (const [input] of ACCEPTANCE) {
  Deno.test(`#148 idempotency: toCommand(toCommand(${JSON.stringify(input)})) === toCommand(${JSON.stringify(input)})`, () => {
    requireImpl();
    const once = OperationId.toCommand(input);
    const twice = OperationId.toCommand(once);
    assertEquals(twice, once);
  });
}

// ---------------------------------------------------------------------------
// Test plan item 3 — Determinism.
// ---------------------------------------------------------------------------

Deno.test("#148 determinism: two calls on the same input return equal strings", () => {
  requireImpl();
  for (const [input] of ACCEPTANCE) {
    assertEquals(OperationId.toCommand(input), OperationId.toCommand(input));
  }
});

// ---------------------------------------------------------------------------
// Test plan item 4 — Output shape.
// ---------------------------------------------------------------------------

Deno.test("#148 output shape: every acceptance output matches ^[a-z0-9]+(-[a-z0-9]+)*$", () => {
  requireImpl();
  for (const [input] of ACCEPTANCE) {
    const out = OperationId.toCommand(input);
    assertMatch(out, SHAPE);
  }
});

// ---------------------------------------------------------------------------
// Test plan items 5-7 — Acronym rule corner cases.
// ---------------------------------------------------------------------------

Deno.test("#148 acronym ambiguous boundary: 'IDList' -> 'id-list'", () => {
  requireImpl();
  assertEquals(OperationId.toCommand("IDList"), "id-list");
});

Deno.test("#148 acronym at end: 'parseURL' -> 'parse-url'", () => {
  requireImpl();
  assertEquals(OperationId.toCommand("parseURL"), "parse-url");
});

Deno.test("#148 acronym no-op when last: 'parseHTML' -> 'parse-html'", () => {
  requireImpl();
  assertEquals(OperationId.toCommand("parseHTML"), "parse-html");
});

// ---------------------------------------------------------------------------
// Test plan item 8 — Empty after trim for various separator-only inputs.
// ---------------------------------------------------------------------------

for (const input of ["---", "___", "!!!"]) {
  Deno.test(`#148 empty-after-trim: ${JSON.stringify(input)} throws OperationId.Empty`, () => {
    requireImpl();
    assertThrows(() => OperationId.toCommand(input), OperationId.Empty);
  });
}

// ---------------------------------------------------------------------------
// Test plan item 9 — MappingCollision (compile-time, surfaces both source ids
// and the colliding kebab name). Encoded as a unit-level collision check on
// the `OperationId` class — the spec's API shape leaves room for a collision
// detector here without prescribing its exact entry point, so we exercise it
// through a small "register many ids" surface that the implementation is
// expected to expose. The check is twofold:
//   - the resulting error is an instance of OperationId.MappingCollision
//   - the error mentions both source operationIds and the kebab name
// ---------------------------------------------------------------------------

Deno.test("#148 mapping collision: 'getPet' and 'GetPet' collide on 'get-pet'", () => {
  requireImpl();
  // Source ids are deliberately chosen so all three required strings —
  // both source operationIds AND the colliding kebab name — are
  // distinct, so the assertions below verify each one independently
  // (rather than satisfying multiple includes-checks with a single
  // string that happens to be both a source and the kebab).
  const ids = ["getPet", "GetPet"];
  // The implementation must expose a detector that THROWS the error
  // itself; tests must never construct/throw it on the impl's behalf.
  // Today the spec contract is `assertNoCollisions(ids)` per #148 §9.
  const err = assertThrows(
    () => OperationId.assertNoCollisions(ids),
    OperationId.MappingCollision,
  ) as Error;
  const msg = String(err.message ?? "");
  assert(msg.includes("getPet"), `error should mention 'getPet': ${msg}`);
  assert(msg.includes("GetPet"), `error should mention 'GetPet': ${msg}`);
  assert(msg.includes("get-pet"), `error should mention 'get-pet' kebab: ${msg}`);
});

// ---------------------------------------------------------------------------
// Test plan item 10 — Property-based: output shape OR throws.
// ---------------------------------------------------------------------------

Deno.test("#148 property: for arbitrary strings, output matches shape or function throws", () => {
  requireImpl();
  fc.assert(
    fc.property(fc.string(), (s) => {
      try {
        const out = OperationId.toCommand(s);
        assertMatch(out, SHAPE);
      } catch (e) {
        // Any thrown value is acceptable here; the spec only requires that
        // the function either returns a kebab-shaped string or throws.
        assert(e instanceof Error);
      }
    }),
    { numRuns: 200 },
  );
});

// ---------------------------------------------------------------------------
// Test plan item 11 — Property-based: idempotency over the whole input space
// (excluding throw cases, which represent invalid input).
// ---------------------------------------------------------------------------

Deno.test("#148 property: idempotency holds for all non-throwing inputs", () => {
  requireImpl();
  fc.assert(
    fc.property(fc.string(), (s) => {
      let once: string;
      try {
        once = OperationId.toCommand(s);
      } catch {
        return; // skip throw cases per item 11
      }
      const twice = OperationId.toCommand(once);
      assertEquals(twice, once);
    }),
    { numRuns: 200 },
  );
});

// ---------------------------------------------------------------------------
// "Second integration check" from the spec — compile a fixture spec with
// operations using a representative set of operationId styles and assert the
// generated binary's `--help` lists the expected subcommand names.
//
// Marked `Deno.test.ignore` with a TODO because the compile-and-run harness
// does not exist yet (no `clesty` codegen entry point, no way to spawn the
// generated binary). The fixture lives at
// `tests/fixtures/operation-id/representative.yaml` so the harness, when it
// arrives, has a ready-to-use input.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "#148 integration: representative.yaml --help lists expected subcommand names (TODO: needs compile-and-run harness)",
  async () => {
    const fixture = fromFileUrl(
      new URL("../fixtures/operation-id/representative.yaml", import.meta.url),
    );
    // Sanity: the fixture file is present so the harness can pick it up later.
    const stat = await Deno.stat(fixture);
    assert(stat.isFile);

    // TODO(#148): once the compile-and-run harness exists, do:
    //   1. compile `fixture` with clesty into a temp directory
    //   2. spawn the resulting binary with `--help`
    //   3. assert each expected subcommand name appears in the output
    const expected = [
      "list-pets",
      "listpets",
      "get-user-by-id",
      "get-urls",
      "parse-html-doc",
      "get-v2-pets",
      "2-get-pets",
    ];
    assert(expected.length > 0); // placeholder
  },
);
