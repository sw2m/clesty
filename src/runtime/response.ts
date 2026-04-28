/**
 * Runtime response matcher.
 *
 * Given a received HTTP status and the baked-in response table from
 * codegen, returns the matched table entry plus its key, or null if
 * nothing in the table applies.
 *
 * Precedence (per #151): exact > range > default.
 *
 * @module
 */

type Kind = "exact" | "range" | "default";
type Entry = { kind: Kind; rangeDigit?: number };
type Table = Record<string, Entry>;
type Match = { matchedKey: string; kind: Kind; rangeDigit?: number };

/**
 * Resolve `status` against `table`. Skips range matching when
 * `status` is outside the valid HTTP space [100, 599] — a 0 from an
 * aborted request or a 600 from a misbehaving load balancer must
 * fall through to `default` rather than match an illegal `0XX`/`6XX`
 * range that the spec forbids.
 */
export function match(status: number, table: Table): Match | null {
  const exactKey = String(status);
  const exact = table[exactKey];
  if (exact && exact.kind === "exact") {
    return { matchedKey: exactKey, kind: "exact" };
  }
  if (status >= 100 && status <= 599) {
    const rangeKey = `${Math.floor(status / 100)}XX`;
    const range = table[rangeKey];
    if (range && range.kind === "range") {
      return { matchedKey: rangeKey, kind: "range", rangeDigit: range.rangeDigit };
    }
  }
  const def = table["default"];
  if (def && def.kind === "default") {
    return { matchedKey: "default", kind: "default" };
  }
  return null;
}
