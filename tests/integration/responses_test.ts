/**
 * Generated-binary integration tests for Operation `responses`
 * (issue sw2m/clesty#151).
 *
 * Phase 2a Red Gate. Items 3-22 from the spec's "B. Generated-binary
 * integration tests" subsection require a compile-and-run harness plus a
 * mocked HTTP server — neither exists yet. Every test in this file is marked
 * `Deno.test.ignore` with a TODO. The bodies encode the assertions for the
 * Green Gate run; the harness work is tracked separately and is not blocking
 * for the Red Gate.
 *
 * When the harness lands, flip `Deno.test.ignore` -> `Deno.test` and the
 * suite runs as written. Until then the Deno test runner reports each test
 * as ignored, which is exactly what Red Gate expects.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const FIXTURE_DIR = fromFileUrl(new URL("../fixtures/responses/", import.meta.url));

/**
 * Placeholder shape for the compile-and-run harness. The real harness will:
 *   1. compile the OpenAPI fixture into a clesty-generated CLI binary,
 *   2. spin up a mocked HTTP server that returns the requested status /
 *      headers / body,
 *   3. invoke the binary's subcommand with `Deno.Command`,
 *   4. capture stdout, stderr, and the exit code.
 *
 * For now, calling any helper throws so each `.ignore`d test would fail
 * loudly the moment it is un-ignored without harness support.
 */
// deno-lint-ignore no-explicit-any
const Harness: any = {
  // deno-lint-ignore require-await
  async run(_opts: unknown): Promise<never> {
    throw new Error("integration harness not implemented yet — Red Gate");
  },
  fixture(name: string): string {
    return `${FIXTURE_DIR}${name}`;
  },
};

// ---------------------------------------------------------------------------
// Item 3: Exact-match precedence over range
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: exact 200 wins over 2XX range", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("exact-and-range.yaml"),
    operation: "getThing",
    server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
  });
  assertEquals(result.matchedKey, "200");
  assertEquals(result.exitCode, 0);
  assertEquals(result.stream, "stdout");
});

// ---------------------------------------------------------------------------
// Item 4: Range matches when no exact
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: 2XX range matches a received 201", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("range-only.yaml"),
    operation: "getThing",
    server: { status: 201, headers: { "content-type": "application/json" }, body: "{}" },
  });
  assertEquals(result.matchedKey, "2XX");
  assertEquals(result.exitCode, 0);
  assertEquals(result.stream, "stdout");
});

// ---------------------------------------------------------------------------
// Item 5: Default matches when neither exact nor range applies
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: default matches 999 when no range key applies", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("default-only.yaml"),
    operation: "getThing",
    server: { status: 999, headers: { "content-type": "application/json" }, body: "{}" },
  });
  assertEquals(result.matchedKey, "default");
  // 999 is out of range -> exit 6 per the table.
  assertEquals(result.exitCode, 6);
  assertEquals(result.stream, "stderr");
});

// ---------------------------------------------------------------------------
// Item 6: No match — exit 5, stderr
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: 200-only fixture returns 503 -> no match, exit 5, stderr",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("200-only.yaml"),
      operation: "getThing",
      server: { status: 503, headers: { "content-type": "application/json" }, body: "{}" },
    });
    assertEquals(result.matchedKey, null);
    assertEquals(result.exitCode, 5);
    assertEquals(result.stream, "stderr");
  },
);

// ---------------------------------------------------------------------------
// Item 7: Exit codes — one per status class
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: 1xx received -> exit 0", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("default-only.yaml"),
    operation: "getThing",
    server: { status: 100, headers: {}, body: "" },
  });
  assertEquals(result.exitCode, 0);
});

Deno.test.ignore("integration: 2xx received -> exit 0", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("200-only.yaml"),
    operation: "getThing",
    server: { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
  });
  assertEquals(result.exitCode, 0);
});

Deno.test.ignore("integration: 3xx received with --no-follow-redirects -> exit 0", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands. See item 22.
  const result = await Harness.run({
    fixture: Harness.fixture("default-only.yaml"),
    operation: "getThing",
    flags: ["--no-follow-redirects"],
    server: { status: 302, headers: { location: "https://example.test/elsewhere" }, body: "" },
  });
  assertEquals(result.exitCode, 0);
});

Deno.test.ignore("integration: 4xx received -> exit 4", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("4xx-routing.yaml"),
    operation: "getThing",
    server: { status: 404, headers: { "content-type": "application/json" }, body: "{}" },
  });
  assertEquals(result.exitCode, 4);
});

Deno.test.ignore("integration: 5xx received -> exit 5", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("default-only.yaml"),
    operation: "getThing",
    server: { status: 503, headers: { "content-type": "application/json" }, body: "{}" },
  });
  assertEquals(result.exitCode, 5);
});

// ---------------------------------------------------------------------------
// Item 8: Stream routing — 2xx stdout, 4xx/5xx stderr
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: 2xx body goes to stdout", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("json.yaml"),
    operation: "getThing",
    server: { status: 200, headers: { "content-type": "application/json" }, body: '{"a":1}' },
  });
  assert(result.stdout.length > 0);
  assertEquals(result.stderr, "");
});

Deno.test.ignore("integration: 4xx body goes to stderr", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("4xx-routing.yaml"),
    operation: "getThing",
    server: {
      status: 404,
      headers: { "content-type": "application/json" },
      body: '{"err":"x"}',
    },
  });
  assertEquals(result.stdout, "");
  assert(result.stderr.length > 0);
});

Deno.test.ignore("integration: 5xx body goes to stderr", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("default-only.yaml"),
    operation: "getThing",
    server: {
      status: 503,
      headers: { "content-type": "application/json" },
      body: '{"err":"x"}',
    },
  });
  assertEquals(result.stdout, "");
  assert(result.stderr.length > 0);
});

// ---------------------------------------------------------------------------
// Item 9: 204 no body
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: 204 suppresses body, exit 0", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("204-no-body.yaml"),
    operation: "deleteThing",
    server: { status: 204, headers: {}, body: "" },
  });
  assertEquals(result.stdout, "");
  assertEquals(result.exitCode, 0);
});

// ---------------------------------------------------------------------------
// Item 10: JSON pretty-print
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: JSON body is pretty-printed with 2-space indent", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  // Caveat: V8 reorders integer-like JSON object keys ("0","1","2") into
  // numeric-first order regardless of the source-document order. The spec
  // accepts this for human-readable output. If strict source-order is ever
  // required, the renderer must be replaced with a streaming JSON formatter.
  const result = await Harness.run({
    fixture: Harness.fixture("json.yaml"),
    operation: "getThing",
    server: { status: 200, headers: { "content-type": "application/json" }, body: '{"a":1}' },
  });
  assertEquals(result.stdout, '{\n  "a": 1\n}\n');
});

// ---------------------------------------------------------------------------
// Item 11: JSON Content-Type with parameters
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: 'application/json; charset=utf-8' triggers pretty-print",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("json.yaml"),
      operation: "getThing",
      server: {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: '{"a":1}',
      },
    });
    assertEquals(result.stdout, '{\n  "a": 1\n}\n');
  },
);

// ---------------------------------------------------------------------------
// Item 12: +json suffix
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: 'application/vnd.api+json' triggers pretty-print", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("json.yaml"),
    operation: "getThing",
    server: {
      status: 200,
      headers: { "content-type": "application/vnd.api+json" },
      body: '{"a":1}',
    },
  });
  assertEquals(result.stdout, '{\n  "a": 1\n}\n');
});

// ---------------------------------------------------------------------------
// Item 13: text/plain — verbatim, trailing newline on TTY
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: text/plain is written verbatim, trailing newline added on TTY",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("text.yaml"),
      operation: "getThing",
      stdoutIsTty: true,
      server: { status: 200, headers: { "content-type": "text/plain" }, body: "hello" },
    });
    assertEquals(result.stdout, "hello\n");
  },
);

Deno.test.ignore(
  "integration: text/plain on TTY does not double-add newline if present",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("text.yaml"),
      operation: "getThing",
      stdoutIsTty: true,
      server: { status: 200, headers: { "content-type": "text/plain" }, body: "hello\n" },
    });
    assertEquals(result.stdout, "hello\n");
  },
);

// ---------------------------------------------------------------------------
// Item 14: Binary on TTY — refuse, warn on stderr, exit 0
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: image/png on TTY refuses, warning on stderr, exit 0", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("binary.yaml"),
    operation: "getThing",
    stdoutIsTty: true,
    server: {
      status: 200,
      headers: { "content-type": "image/png" },
      body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    },
  });
  assertEquals(result.stdout, "");
  assertEquals(result.exitCode, 0);
  assertStringIncludes(result.stderr.toLowerCase(), "binary");
});

// ---------------------------------------------------------------------------
// Item 15: Binary redirected — raw bytes to stdout
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: image/png with redirected stdout writes raw bytes", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const result = await Harness.run({
    fixture: Harness.fixture("binary.yaml"),
    operation: "getThing",
    stdoutIsTty: false,
    server: { status: 200, headers: { "content-type": "image/png" }, body: bytes },
  });
  assertEquals(result.stdoutBytes, bytes);
  assertEquals(result.exitCode, 0);
});

// ---------------------------------------------------------------------------
// Item 16: 1XX accepted; 100 matches 1XX; exit 0
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: 1XX is a valid range key; 100 received matches it; exit 0",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    // Build a fixture inline to keep the static fixture set focused. The
    // harness accepts an inline doc for cases like this.
    const result = await Harness.run({
      inlineDoc: {
        openapi: "3.1.0",
        info: { title: "1XX Range", version: "0.0.1" },
        paths: {
          "/thing": {
            get: {
              operationId: "getThing",
              responses: {
                "1XX": { description: "informational" },
                "default": { description: "fallback" },
              },
            },
          },
        },
      },
      operation: "getThing",
      server: { status: 100, headers: {}, body: "" },
    });
    assertEquals(result.matchedKey, "1XX");
    assertEquals(result.exitCode, 0);
  },
);

// ---------------------------------------------------------------------------
// Item 17: Content-Type absent — treat as octet-stream; binary-on-TTY rule
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: missing Content-Type is treated as octet-stream; refused on TTY",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("no-content.yaml"),
      operation: "getThing",
      stdoutIsTty: true,
      server: { status: 200, headers: {}, body: new Uint8Array([0xff, 0xd8, 0xff]) },
    });
    assertEquals(result.stdout, "");
    assertEquals(result.exitCode, 0);
    assertStringIncludes(result.stderr.toLowerCase(), "binary");
  },
);

// ---------------------------------------------------------------------------
// Item 18: Network error — exit 70, stderr only
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: server unreachable -> exit 70, stderr, no stdout", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("200-only.yaml"),
    operation: "getThing",
    server: { unreachable: true },
  });
  assertEquals(result.exitCode, 70);
  assertEquals(result.stdout, "");
  assert(result.stderr.length > 0);
});

// ---------------------------------------------------------------------------
// Item 19: Out-of-range status -> exit 6, stderr, body suppressed if no default
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: status 600 with no default declared -> exit 6, stderr, body suppressed",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("200-only.yaml"),
      operation: "getThing",
      server: {
        status: 600,
        headers: { "content-type": "application/json" },
        body: '{"x":1}',
      },
    });
    assertEquals(result.exitCode, 6);
    assertEquals(result.stdout, "");
    assert(result.stderr.length > 0);
  },
);

Deno.test.ignore(
  "integration: status 0 (aborted) with default declared -> exit 6, stderr",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("range-only.yaml"),
      operation: "getThing",
      server: { status: 0, headers: {}, body: "" },
    });
    assertEquals(result.exitCode, 6);
    assertEquals(result.matchedKey, "default");
    assertEquals(result.stream, "stderr");
  },
);

// ---------------------------------------------------------------------------
// Item 20: Multiple Content-Type headers — first wins
// ---------------------------------------------------------------------------

Deno.test.ignore("integration: multiple Content-Type headers — first one wins", async () => {
  // TODO(#151): un-ignore once compile-and-run harness lands.
  const result = await Harness.run({
    fixture: Harness.fixture("json.yaml"),
    operation: "getThing",
    // Order matters: the first header value is the JSON one, so JSON
    // pretty-printing must trigger.
    server: {
      status: 200,
      headers: [
        ["content-type", "application/json"],
        ["content-type", "text/plain"],
      ],
      body: '{"a":1}',
    },
  });
  assertEquals(result.stdout, '{\n  "a": 1\n}\n');
});

// ---------------------------------------------------------------------------
// Item 21: Malformed Content-Type — fall through to octet-stream
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: malformed 'application / json' falls through to octet-stream",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("json.yaml"),
      operation: "getThing",
      stdoutIsTty: true,
      // Stray spaces around the slash — not a valid media type. The renderer
      // must fall through to octet-stream handling, which on a TTY refuses
      // and warns.
      server: {
        status: 200,
        headers: { "content-type": "application/ json" },
        body: '{"a":1}',
      },
    });
    assertEquals(result.stdout, "");
    assertEquals(result.exitCode, 0);
    assertStringIncludes(result.stderr.toLowerCase(), "binary");
  },
);

// ---------------------------------------------------------------------------
// Item 22: 3xx with no-follow — body suppressed, summary on stderr, exit 0
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration: 302 with --no-follow-redirects writes summary to stderr, no body, exit 0",
  async () => {
    // TODO(#151): un-ignore once compile-and-run harness lands.
    const result = await Harness.run({
      fixture: Harness.fixture("default-only.yaml"),
      operation: "getThing",
      flags: ["--no-follow-redirects"],
      server: {
        status: 302,
        headers: {
          "location": "https://example.test/elsewhere",
          "content-type": "text/html",
        },
        body: "<html>redirect</html>",
      },
    });
    assertEquals(result.stdout, "");
    assertEquals(result.exitCode, 0);
    assertStringIncludes(result.stderr, "302");
    assertStringIncludes(result.stderr, "https://example.test/elsewhere");
  },
);
