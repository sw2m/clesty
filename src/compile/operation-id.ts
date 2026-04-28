/**
 * Convert an OpenAPI Operation `operationId` to a kebab-case CLI command
 * name (closes #148).
 *
 * Rules (deduced from the acceptance table):
 *
 *   1. ASCII-only input. Non-ASCII rejected with `OperationId.NonAscii`.
 *   2. Word boundaries inserted at:
 *      - lowercase → UPPERCASE (`getURL` → `get-URL`)
 *      - UPPERCASE → UPPERCASE followed by 2+ lowercase chars
 *        (`IDList` → `ID-List`, but `URLs` stays — single trailing
 *        lowercase is treated as a plural suffix, not a new word)
 *      - digit → letter (`2getPets` → `2-get-Pets`)
 *      Letter → digit gets NO boundary (`V2` stays together).
 *   3. Any non-alphanumeric run becomes a single `-`.
 *   4. Leading/trailing `-`s are stripped; runs of `-`s collapse to one.
 *   5. Output is lowercased.
 *   6. Result must be non-empty after step 4. Empty → `OperationId.Empty`.
 *
 * Determinism: `toCommand` is a pure function of its input.
 * Idempotency: a kebab-shaped input passes through unchanged.
 *
 * @module
 */

const SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// `\x00-\x7f` is the canonical ASCII range; the lint rule warns about
// control chars in regex but here that's exactly the intent.
// deno-lint-ignore no-control-regex
const ASCII = /^[\x00-\x7f]*$/;

class Empty extends Error {
  constructor(input: string) {
    super(`operationId is empty after normalization: ${JSON.stringify(input)}`);
    this.name = "OperationId.Empty";
  }
}

class NonAscii extends Error {
  constructor(input: string) {
    super(`operationId contains non-ASCII characters: ${JSON.stringify(input)}`);
    this.name = "OperationId.NonAscii";
  }
}

class MappingCollision extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationId.MappingCollision";
  }
}

function normalize(input: string): string {
  if (!ASCII.test(input)) {
    throw new NonAscii(input);
  }
  // Boundary insertion. Order matters: insert at acronym-then-word
  // (`IDList` → `ID-List`) BEFORE camelCase (`getU` → `get-U`) so the
  // cascade correctly handles consecutive boundaries.
  // The acronym pattern requires 2+ trailing lowercase chars so
  // `URLs` stays together (single `s` is a plural suffix, not a word).
  let s = input
    .replace(/([A-Z])([A-Z][a-z]{2,})/g, "$1-$2")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([0-9])([A-Za-z])/g, "$1-$2");
  s = s.replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  if (s === "") {
    throw new Empty(input);
  }
  return s;
}

/**
 * `OperationId.toCommand(input)` — public entry point. See module
 * docstring for the conversion rules.
 *
 * `OperationId.assertNoCollisions(ids)` — throws `MappingCollision` on
 * the first colliding pair, with both source ids and the kebab name in
 * the message so the user can rename one upstream.
 */
export const OperationId = {
  toCommand(input: string): string {
    return normalize(input);
  },

  Empty,
  NonAscii,
  MappingCollision,

  assertNoCollisions(ids: ReadonlyArray<string>): void {
    const buckets = new Map<string, string[]>();
    for (const id of ids) {
      let kebab: string;
      try {
        kebab = normalize(id);
      } catch {
        // Ids that fail normalization don't collide with anything;
        // they fail their own toCommand call when invoked.
        continue;
      }
      const list = buckets.get(kebab);
      if (list) {
        list.push(id);
      } else {
        buckets.set(kebab, [id]);
      }
    }
    const collisions: string[] = [];
    for (const [kebab, sources] of buckets) {
      if (sources.length > 1) {
        collisions.push(
          `Mapping collision: ${
            sources.map((s) => JSON.stringify(s)).join(" and ")
          } both map to '${kebab}'`,
        );
      }
    }
    if (collisions.length > 0) {
      throw new MappingCollision(collisions.join("; "));
    }
  },

  /** Internal — exposed for the test's shape regex. */
  SHAPE,
};
