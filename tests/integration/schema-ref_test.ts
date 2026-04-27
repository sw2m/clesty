/**
 * Red-Gate integration tests for hey-api's Schema `$ref` behaviour
 * (clesty issue #241, test plan items 1–8).
 *
 * Every test in this file is `Deno.test.ignore`. The clesty compile pipeline
 * (programmatic API + generated-TS assertion harness) does not exist yet.
 * Test bodies are fully written so that, the moment the harness lands, the
 * suite runs as-is. Each `.ignore` carries a `TODO(#241)` comment explaining
 * what needs to exist before the test can be unskipped.
 *
 * Spec mapping:
 *   1. Local `$ref` resolves end-to-end.
 *   2. 3.0 sibling silently ignored (compile MUST succeed; sibling does NOT
 *      surface as a doc comment).
 *   3. 3.1 sibling annotation surfaces (sibling description appears in
 *      generated TS as a field-level doc comment, while the resolved type
 *      still reflects the target).
 *   4. External-file ref (inside spec dir) resolves.
 *   5. JSON Pointer escape (`~1` → `/`) resolves.
 *   6. `$ref` chain (`$ref` → `$ref`) resolves.
 *   7. Refusal cases: non-string ref, missing target, parent escape,
 *      absolute path — each must yield a `Compile.*` error with origin.
 *   8. Recursive type (Tree → Tree) — the highest-risk hey-api canary.
 *      Must produce a self-referential TS type alias, not a stack overflow.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";

const FIXTURE_DIR = fromFileUrl(new URL("../fixtures/schema-ref/", import.meta.url));

// ---------------------------------------------------------------------------
// Compile-pipeline shim
// ---------------------------------------------------------------------------
// These types describe the programmatic API the integration tests will call
// once the harness lands. The actual implementation will live under
// `src/compile/` and re-export hey-api's generator with clesty's pre-flight
// + error wrapping. The types here document the contract the tests need.
// ---------------------------------------------------------------------------

interface CompileResult {
  /** Map of generated filename → file contents. Used to assert on emitted TS. */
  files: Record<string, string>;
}

interface CompileOptions {
  allowRefRoot?: string;
}

function compile(_specPath: string, _opts?: CompileOptions): Promise<CompileResult> {
  // Placeholder — replaced by real implementation in the Green Gate row.
  // Intentionally throws so anyone who unskips a test before the harness
  // lands gets a clear signal. Returns a Promise to match the eventual
  // async API shape so call sites don't have to change when wired up.
  return Promise.reject(
    new Error("clesty compile pipeline not implemented yet (issue #241)"),
  );
}

/** Concatenate every emitted TS file — most assertions only care about content. */
function emittedSource(result: CompileResult): string {
  return Object.entries(result.files)
    .filter(([name]) => name.endsWith(".ts"))
    .map(([, body]) => body)
    .join("\n\n// ---- file boundary ----\n\n");
}

// ---------------------------------------------------------------------------
// Item 1: Local $ref resolves
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 1): local $ref resolves to target schema",
  // TODO(#241): unskip once src/compile/{pipeline,api}.ts is wired up.
  async () => {
    const result = await compile(join(FIXTURE_DIR, "local-ref.yaml"));
    const src = emittedSource(result);
    // hey-api emits a `Pet` type with the target's structure.
    assertStringIncludes(src, "Pet");
    assertStringIncludes(src, "name");
    assertStringIncludes(src, "id");
  },
);

// ---------------------------------------------------------------------------
// Item 2: 3.0 sibling silently ignored
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 2): 3.0 doc with $ref + description sibling — sibling silently dropped",
  // TODO(#241): needs compile pipeline + generated-TS scanning.
  async () => {
    const result = await compile(join(FIXTURE_DIR, "30-sibling.yaml"));
    const src = emittedSource(result);
    // Compile must succeed; the resolved type must still be Pet's shape.
    assertStringIncludes(src, "Pet");
    assertStringIncludes(src, "name");
    // Spec rule: 3.0 ignores siblings silently. The sibling description
    // text must NOT appear in generated output (it's not annotated, not
    // attached as a doc comment, just dropped).
    assert(
      !src.includes("This sibling MUST be silently ignored on 3.0."),
      "3.0 sibling description leaked into generated TS — spec violation",
    );
  },
);

// ---------------------------------------------------------------------------
// Item 3: 3.1 sibling annotation surfaces
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 3): 3.1 doc with $ref + description sibling — sibling surfaces as doc comment",
  // TODO(#241): needs compile pipeline + JSDoc-aware generated-TS scanning.
  async () => {
    const result = await compile(join(FIXTURE_DIR, "31-sibling.yaml"));
    const src = emittedSource(result);
    // Resolved type still reflects Pet.
    assertStringIncludes(src, "Pet");
    assertStringIncludes(src, "name");
    // Sibling description must appear somewhere in the generated TS — most
    // likely as a JSDoc `*` comment on the field. We assert on substring
    // rather than exact JSDoc shape because hey-api's emit format is its
    // own concern; if hey-api changes JSDoc style, this test stays useful.
    assertStringIncludes(src, "This sibling MUST surface on 3.1 as a doc comment.");
  },
);

// ---------------------------------------------------------------------------
// Item 4: External-file ref (inside spec dir)
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 4): external-file $ref inside spec dir resolves",
  // TODO(#241): needs compile pipeline; no networking required for this fixture.
  async () => {
    const result = await compile(join(FIXTURE_DIR, "external-file/main.yaml"));
    const src = emittedSource(result);
    assertStringIncludes(src, "Pet");
    assertStringIncludes(src, "name");
    assertStringIncludes(src, "id");
  },
);

// ---------------------------------------------------------------------------
// Item 5: JSON Pointer escape — `~1` → `/`
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 5): JSON Pointer escape ~1 resolves to component named foo/bar",
  // TODO(#241): needs compile pipeline + generated-TS scanning.
  async () => {
    const result = await compile(join(FIXTURE_DIR, "pointer-escape.yaml"));
    const src = emittedSource(result);
    // Hey-api will sanitize `foo/bar` into a TS-safe identifier (e.g.
    // `FooBar`). We don't pin the exact transform — we assert that the
    // unique field `id: string` from the target schema landed in the output
    // and that no "unresolved" ref string survived.
    assertStringIncludes(src, "id");
    assert(!src.includes("foo~1bar"), "pointer escape leaked unresolved into TS");
    assert(!src.includes("$ref"), "$ref string leaked unresolved into TS");
  },
);

// ---------------------------------------------------------------------------
// Item 6: $ref chain ($ref -> $ref)
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 6): chain ($ref -> $ref) resolves to terminal target",
  // TODO(#241): needs compile pipeline.
  async () => {
    const result = await compile(join(FIXTURE_DIR, "chain.yaml"));
    const src = emittedSource(result);
    assertStringIncludes(src, "Pet");
    assertStringIncludes(src, "name");
    assertStringIncludes(src, "id");
    assert(!src.includes("$ref"), "$ref string leaked unresolved into TS");
  },
);

// ---------------------------------------------------------------------------
// Item 7: Refusal cases — each must yield a Compile.* error with origin
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 7a): non-string $ref → Compile.HeyApiFailure",
  // TODO(#241): needs compile pipeline + error class hierarchy.
  async () => {
    const specPath = join(FIXTURE_DIR, "non-string-ref.yaml");
    let thrown: unknown;
    try {
      await compile(specPath);
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== undefined, "expected compile to throw");
    const name = (thrown as { name?: string }).name;
    assertEquals(name, "HeyApiFailure", "must wrap hey-api's error as Compile.HeyApiFailure");
    // Origin (source path) must be present in the error chain so users can
    // locate the offending document.
    const msg = String((thrown as Error).message ?? "");
    assertStringIncludes(msg, "non-string-ref.yaml");
  },
);

Deno.test.ignore(
  "integration (item 7b): missing-target $ref → Compile.HeyApiFailure with pointer",
  // TODO(#241): needs compile pipeline + error class hierarchy.
  async () => {
    const specPath = join(FIXTURE_DIR, "missing-target.yaml");
    let thrown: unknown;
    try {
      await compile(specPath);
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== undefined, "expected compile to throw");
    const name = (thrown as { name?: string }).name;
    assertEquals(name, "HeyApiFailure", "must wrap hey-api's error as Compile.HeyApiFailure");
    const msg = String((thrown as Error).message ?? "");
    // Error must name the missing pointer so the user can find it.
    assertStringIncludes(msg, "DoesNotExist");
  },
);

Deno.test.ignore(
  "integration (item 7c): parent-escape $ref → Compile.RefEscapesRoot (pre-flight)",
  // TODO(#241): needs compile pipeline + RefEscapesRoot integration.
  async () => {
    const specPath = join(FIXTURE_DIR, "parent-escape.yaml");
    let thrown: unknown;
    try {
      await compile(specPath);
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== undefined, "expected compile to throw");
    const name = (thrown as { name?: string }).name;
    assertEquals(
      name,
      "RefEscapesRoot",
      "parent escape must be caught by clesty pre-flight, NOT hey-api",
    );
  },
);

Deno.test.ignore(
  "integration (item 7d): absolute-path $ref → Compile.RefEscapesRoot (pre-flight)",
  // TODO(#241): needs compile pipeline + RefEscapesRoot integration.
  async () => {
    const specPath = join(FIXTURE_DIR, "absolute-path.yaml");
    let thrown: unknown;
    try {
      await compile(specPath);
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== undefined, "expected compile to throw");
    const name = (thrown as { name?: string }).name;
    assertEquals(
      name,
      "RefEscapesRoot",
      "absolute path must be caught by clesty pre-flight, NOT hey-api",
    );
  },
);

// ---------------------------------------------------------------------------
// Item 8: RECURSIVE TYPE — highest-risk hey-api canary
// ---------------------------------------------------------------------------
// Per spec: "@hey-api/json-schema-ref-parser defaults *can* throw `Maximum
// call stack size exceeded` on cycles unless configured to bundle/dereference
// lazily. If hey-api regresses here, this test fails immediately."
//
// The body below is fully written. If a hey-api update reintroduces a cycle
// regression, unskipping this test alone is enough to detect it.
// ---------------------------------------------------------------------------

Deno.test.ignore(
  "integration (item 8, CRITICAL CANARY): recursive Tree -> Tree compiles to self-referential type",
  // TODO(#241): unskip the moment the compile harness lands. This is the
  // highest-priority canary in the row — DO NOT delete or weaken its body.
  async () => {
    const specPath = join(FIXTURE_DIR, "recursive.yaml");

    // 1. Compile must complete. A regression to the "stack overflow on
    //    cycles" failure mode would throw here. The .catch+rethrow-with-
    //    context pattern makes the failure mode obvious in test output.
    let result: CompileResult;
    try {
      result = await compile(specPath);
    } catch (e) {
      throw new Error(
        `RECURSIVE-TYPE CANARY FAILED — hey-api regression suspected. ` +
          `Original error: ${(e as Error).message ?? e}`,
      );
    }

    const src = emittedSource(result);

    // 2. The generated TS must mention `Tree`. We don't pin the exact emit
    //    shape (interface vs type alias, optional vs required `children`)
    //    because hey-api's output style is its own concern. The contract is:
    //    the type exists and is self-referential.
    assertStringIncludes(src, "Tree");

    // 3. Self-reference: somewhere in the generated source, `Tree` must
    //    appear in a context where the `Tree` type references itself
    //    (typically through `children?: Array<Tree>` or `Tree[]`). We assert
    //    on the loose substring patterns hey-api is known to emit; if it
    //    changes its style, the test surfaces a false positive that the
    //    Green-Gate row owner can update — which is preferable to silently
    //    accepting a flattened (non-recursive) emit.
    const selfRefPatterns = [
      /Tree\s*\[\]/, //                     Tree[]
      /Array<\s*Tree\s*>/, //               Array<Tree>
      /children\??\s*:\s*Tree/, //          children: Tree...
    ];
    const matched = selfRefPatterns.some((re) => re.test(src));
    assert(
      matched,
      "expected generated TS to contain a self-reference to Tree (Tree[], Array<Tree>, or children: Tree...) — got:\n" +
        src,
    );

    // 4. No raw `$ref` strings should leak — that would mean hey-api gave up
    //    on cycle resolution.
    assert(!src.includes("$ref"), "$ref string leaked unresolved into TS");
  },
);
