/**
 * Generated-binary integration tests for Path templating with `{var}`
 * (sw2m/clesty issue #130).
 *
 * Phase 2a Red Gate. Items 6–13 from the spec's "B. Generated-binary
 * integration tests" subsection require a compile-and-run harness plus a
 * mocked HTTP server — neither exists yet. Every test in this file is marked
 * `Deno.test.ignore` with a `TODO(#130)` comment. The bodies encode the
 * assertions for the Green-Gate run; the harness work is tracked separately
 * and is not blocking for the Red Gate.
 *
 * When the harness lands, replace the `Harness` shim with the real entry
 * point and flip `Deno.test.ignore` -> `Deno.test`. The suite runs as
 * written. Until then the Deno test runner reports each test as ignored,
 * which is exactly what the Red Gate expects.
 *
 * Spec mapping ("B. Generated-binary integration tests" of #130):
 *   6.  Missing required value — exits 64, no request issued.
 *   7.  ASCII string — `GET /pets/abc`.
 *   8.  Integer schema — `--n 42` → `/n/42`; `--n abc` → exit 64.
 *   9.  Boolean schema — `--flag true` accepted; `--flag yes` rejected.
 *   10. Slash in string value — assert hey-api's emitted encoding (likely `%2F`).
 *   11. Space in value — assert hey-api's emitted encoding (`%20` typical).
 *   12. UTF-8 multi-byte — `--id "日本"` → UTF-8 percent-encoded bytes.
 *   13. Reserved sub-delim characters — assert hey-api's as-observed emission.
 *
 * Per the spec: clesty does NOT impose RFC 3986 strictness on hey-api. The
 * tests assert the *observed* hey-api behaviour and document it. If hey-api
 * regresses (e.g. spans path segments on `/`), file an upstream bug — do not
 * paper over it in clesty.
 *
 * @module
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const FIXTURE_DIR = fromFileUrl(new URL("../fixtures/path-templating/", import.meta.url));

/**
 * Placeholder shape for the compile-and-run harness. The real harness will:
 *   1. compile the OpenAPI fixture into a clesty-generated CLI binary,
 *   2. spin up a mocked HTTP server that records the inbound request URL
 *      (raw, byte-for-byte) and responds with a canned status/body,
 *   3. invoke the binary's subcommand with `Deno.Command`,
 *   4. capture stdout, stderr, exit code, and the recorded request URL.
 *
 * For now, calling `Harness.run` throws so any `.ignore`d test that gets
 * un-ignored before harness support lands fails loudly with a clear signal.
 */
// deno-lint-ignore no-explicit-any
const Harness: any = {
  // deno-lint-ignore require-await
  async run(_opts: unknown): Promise<never> {
    throw new Error("integration harness not implemented yet — Red Gate (issue #130)");
  },
  fixture(name: string): string {
    return `${FIXTURE_DIR}${name}`;
  },
};

// ---------------------------------------------------------------------------
// Item 6 — Missing required value
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 6): missing required value -> exit 64, help-style error, no request issued",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("single-path-param.yaml"),
      operation: "getUser",
      args: [], // no --id supplied
      // No `server` block: the harness must not even open a connection.
    });
    assertEquals(result.exitCode, 64); // EX_USAGE
    assertEquals(result.requestsIssued, 0);
    // The error message must be a CLI usage error and must mention the
    // missing flag so the user can fix it.
    assert(result.stderr.length > 0);
    assertStringIncludes(result.stderr, "--id");
  },
);

// ---------------------------------------------------------------------------
// Item 7 — ASCII string value
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 7): ASCII string `--id abc` issues GET /pets/abc",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    // Note: the spec example uses `/pets/{id}`; our fixture uses `/users/{id}`
    // since we already have it. The contract is identical: the literal string
    // must appear unescaped in the URL path segment.
    const result = await Harness.run({
      fixture: Harness.fixture("single-path-param.yaml"),
      operation: "getUser",
      args: ["--id", "abc"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    assertEquals(result.requestPath, "/users/abc");
  },
);

// ---------------------------------------------------------------------------
// Item 8 — Integer schema coercion
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 8a): integer schema `--n 42` issues GET /n/42",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("integer-schema.yaml"),
      operation: "getByNum",
      args: ["--n", "42"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    assertEquals(result.requestPath, "/n/42");
  },
);

Deno.test.ignore(
  "integration (item 8b): integer schema `--n abc` exits 64 (coercion failure)",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("integer-schema.yaml"),
      operation: "getByNum",
      args: ["--n", "abc"],
      // No `server`: no request must be issued — coercion fails before
      // the request layer is reached.
    });
    assertEquals(result.exitCode, 64);
    assertEquals(result.requestsIssued, 0);
    assert(result.stderr.length > 0);
    // Error must name the flag and the expected type so the user can fix it.
    assertStringIncludes(result.stderr, "--n");
    assertStringIncludes(result.stderr.toLowerCase(), "integer");
  },
);

// ---------------------------------------------------------------------------
// Item 9 — Boolean schema coercion
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 9a): boolean schema `--flag true` is accepted",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("boolean-schema.yaml"),
      operation: "getByFlag",
      args: ["--flag", "true"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    assertEquals(result.requestPath, "/flag/true");
  },
);

Deno.test.ignore(
  "integration (item 9b): boolean schema `--flag false` is accepted",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("boolean-schema.yaml"),
      operation: "getByFlag",
      args: ["--flag", "false"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    assertEquals(result.requestPath, "/flag/false");
  },
);

Deno.test.ignore(
  "integration (item 9c): boolean schema `--flag yes` is rejected (exit 64)",
  // TODO(#130): un-ignore once compile-and-run harness lands. The spec is
  // explicit: only "true" / "false" coerce; any other input is a CLI usage
  // error caught at the coercion layer baked in at compile time.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("boolean-schema.yaml"),
      operation: "getByFlag",
      args: ["--flag", "yes"],
    });
    assertEquals(result.exitCode, 64);
    assertEquals(result.requestsIssued, 0);
    assertStringIncludes(result.stderr, "--flag");
    assertStringIncludes(result.stderr.toLowerCase(), "boolean");
  },
);

// ---------------------------------------------------------------------------
// Item 10 — Slash in string value
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 10): slash in string value is percent-encoded by hey-api (likely %2F)",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  // Spec: assert the *actual* hey-api behaviour. If hey-api spans segments
  // (i.e. emits a literal `/`), that's a hey-api bug to file upstream — not
  // a clesty test failure. Either way, the assertion documents what hey-api
  // does today.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("single-path-param.yaml"),
      operation: "getUser",
      args: ["--id", "a/b"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    // The path must remain a single segment under `/users/`. We accept either
    // `%2F` (uppercase, RFC 3986 canonical) or `%2f` (lowercase) since
    // hey-api's exact case is its own concern, but the literal `/` must NOT
    // span segments. If you find this test failing because the URL is
    // `/users/a/b`, file an upstream hey-api bug.
    assert(
      result.requestPath === "/users/a%2Fb" || result.requestPath === "/users/a%2fb",
      `expected slash to be percent-encoded; got requestPath=${result.requestPath}`,
    );
  },
);

// ---------------------------------------------------------------------------
// Item 11 — Space in value
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 11): space in string value is percent-encoded by hey-api (typically %20)",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("single-path-param.yaml"),
      operation: "getUser",
      args: ["--id", "a b"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    // Spec: assert as-observed. RFC 3986 says `%20`; some encoders use `+`
    // (form-encoding). The path component never gets `+`-encoded by any
    // conformant encoder, but we still keep the assertion narrow to `%20`
    // and document the exception path.
    assertEquals(result.requestPath, "/users/a%20b");
  },
);

// ---------------------------------------------------------------------------
// Item 12 — UTF-8 multi-byte
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 12): UTF-8 multi-byte `--id 日本` is percent-encoded by UTF-8 bytes",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  // 日 = E6 97 A5, 本 = E6 9C AC; each byte percent-encoded yields the
  // literal below. We accept lower-case hex too because RFC 3986 §6.2.2.1
  // declares percent-encoded triplets case-insensitive in normalisation,
  // even if the canonical form is upper-case.
  async () => {
    const result = await Harness.run({
      fixture: Harness.fixture("single-path-param.yaml"),
      operation: "getUser",
      args: ["--id", "日本"],
      server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.exitCode, 0);
    const expectedUpper = "/users/%E6%97%A5%E6%9C%AC";
    const expectedLower = expectedUpper.toLowerCase().replace("/users/", "/users/");
    assert(
      result.requestPath === expectedUpper ||
        result.requestPath.toLowerCase() === expectedLower.toLowerCase(),
      `expected UTF-8 percent-encoded path; got requestPath=${result.requestPath}`,
    );
  },
);

// ---------------------------------------------------------------------------
// Item 13 — Reserved sub-delim characters
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 13): reserved sub-delim characters — assert hey-api's as-observed emission",
  // TODO(#130): un-ignore once compile-and-run harness lands.
  // RFC 3986 §3.3 declares these characters valid in `pchar` (the path
  // segment grammar): `:`, `@`, `(`, `)`, `;`, `=`, `,`, `&`, `+`. Many JS
  // encoders (most notably `encodeURIComponent`) percent-encode them anyway.
  // The spec is explicit: this test asserts the *as-observed* behaviour and
  // documents it; it does NOT impose RFC 3986 strictness on hey-api.
  //
  // Implementation note: the Green-Gate maintainer should record what
  // hey-api emits today and update the expected map below to match. The
  // structural assertion is "every character either appears verbatim OR is
  // a single, well-formed percent-triplet". The shape probe below is
  // intentionally conservative — it surfaces a clear signal if hey-api ever
  // changes its encoding policy.
  async () => {
    const reserved = [":", "@", "(", ")", ";", "=", ",", "&", "+"];
    for (const ch of reserved) {
      const result = await Harness.run({
        fixture: Harness.fixture("single-path-param.yaml"),
        operation: "getUser",
        args: ["--id", `x${ch}y`],
        server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
      });
      assertEquals(result.exitCode, 0, `request must succeed for ch=${ch}`);
      // Every emission must be either verbatim or percent-triplet form.
      // Reject anything else (truncation, double-encoding, etc.).
      const path = result.requestPath as string;
      assertStringIncludes(path, "/users/");
      const segment = path.slice("/users/".length);
      const verbatim = `x${ch}y`;
      // A well-formed alternative encoding: `x%XXy` where XX is two hex
      // digits. We compute that pattern from the actual byte.
      const code = ch.codePointAt(0)!;
      assert(code <= 0x7f, "this assertion's hex form assumes ASCII");
      const hex = code.toString(16).padStart(2, "0");
      const pctUpper = `x%${hex.toUpperCase()}y`;
      const pctLower = `x%${hex.toLowerCase()}y`;
      assert(
        segment === verbatim || segment === pctUpper || segment === pctLower,
        `unexpected emission for ch=${JSON.stringify(ch)}: segment=${JSON.stringify(segment)}`,
      );
    }
  },
);
