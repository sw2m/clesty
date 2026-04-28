/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #764 (CLI entry point) and
 * #765 (deno compile bundle step). Exercises `clesty compile <spec>
 * --output <bin>` end-to-end:
 *
 *   1. Reads the spec, runs preflight (#107) and ref-safety (#241).
 *   2. Calls `Codegen.emit()` (#130 / #151 / #152 / #153 / #154 / #155 /
 *      #156 / #157 / #159 / #162 / #163) to produce the CLI source.
 *   3. Composes a TypeScript entry that links the runtime response matcher.
 *   4. Invokes `deno compile --output <bin>` to produce a complete binary.
 *   5. The binary is self-contained — runs with no Deno on the target host.
 *
 * Tests run the CLI as a subprocess so they exercise the full orchestration
 * path. Fixtures under tests/fixtures/cli-entry-point/ stay minimal.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const REPO_ROOT = fromFileUrl(new URL("../../", import.meta.url));
const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/cli-entry-point/", import.meta.url),
);

const CLI_PATH = `${REPO_ROOT}src/cli.ts`;

type RunResult = { code: number; stdout: string; stderr: string };

async function runCli(args: string[]): Promise<RunResult> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", CLI_PATH, ...args],
    stdout: "piped",
    stderr: "piped",
  });
  const out = await cmd.output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

async function runBin(bin: string, args: string[]): Promise<RunResult> {
  const cmd = new Deno.Command(bin, {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const out = await cmd.output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

async function tempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "clesty-cli-test-" });
}

async function cleanup(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Item A — `clesty compile --help` exits 0 and lists the verb.
// ---------------------------------------------------------------------------

Deno.test("cli (#764): --help exits 0 and names the compile verb", async () => {
  const r = await runCli(["--help"]);
  assertEquals(r.code, 0, `--help should exit 0; stderr:\n${r.stderr}`);
  assertStringIncludes(r.stdout + r.stderr, "compile");
});

// ---------------------------------------------------------------------------
// Item B — missing spec arg: non-zero exit, error on stderr.
// ---------------------------------------------------------------------------

Deno.test("cli (#764): missing spec argument exits non-zero with error message", async () => {
  const r = await runCli(["compile"]);
  assert(r.code !== 0, `expected non-zero exit; stdout:\n${r.stdout}`);
  // Some message naming the missing arg or usage.
  assert(
    /usage|spec|argument|missing/i.test(r.stderr + r.stdout),
    `expected usage/error message; stderr:\n${r.stderr}\nstdout:\n${r.stdout}`,
  );
});

// ---------------------------------------------------------------------------
// Item C — `compile` on a valid spec produces a binary at --output.
// ---------------------------------------------------------------------------

Deno.test("cli (#764, #765): compile produces a runnable binary at --output", async () => {
  const dir = await tempDir();
  try {
    const out = `${dir}/petstore-cli`;
    const r = await runCli([
      "compile",
      `${FIXTURE_DIR}petstore-mini.yaml`,
      "--output",
      out,
    ]);
    assertEquals(
      r.code,
      0,
      `compile should exit 0; stderr:\n${r.stderr}\nstdout:\n${r.stdout}`,
    );
    // Binary exists and is executable.
    const stat = await Deno.stat(out);
    assert(stat.isFile, `expected ${out} to be a file`);
    // Binary --help works without Deno present (it's self-contained).
    const helpRun = await runBin(out, ["--help"]);
    assertEquals(
      helpRun.code,
      0,
      `binary --help should exit 0; stderr:\n${helpRun.stderr}`,
    );
    // The binary lists the operation's kebab-case subcommand from the spec.
    assertStringIncludes(
      helpRun.stdout + helpRun.stderr,
      "list-pets",
      "expected 'list-pets' subcommand from petstore-mini.yaml",
    );
  } finally {
    await cleanup(dir);
  }
});

// ---------------------------------------------------------------------------
// Item D — preflight failure surfaces with non-zero exit + named error.
// ---------------------------------------------------------------------------

Deno.test("cli (#764): unsupported openapi version surfaces Compile.UnsupportedVersion", async () => {
  const dir = await tempDir();
  try {
    const out = `${dir}/bad-cli`;
    const r = await runCli([
      "compile",
      `${FIXTURE_DIR}unsupported-version.yaml`,
      "--output",
      out,
    ]);
    assert(r.code !== 0, `expected non-zero exit on unsupported version`);
    assertStringIncludes(
      r.stderr + r.stdout,
      "UnsupportedVersion",
      `expected 'UnsupportedVersion' in output; got stderr:\n${r.stderr}\nstdout:\n${r.stdout}`,
    );
    // No artifact was written.
    let exists = false;
    try {
      await Deno.stat(out);
      exists = true;
    } catch { /* ok */ }
    assert(!exists, `binary should not be written on preflight failure`);
  } finally {
    await cleanup(dir);
  }
});

// ---------------------------------------------------------------------------
// Item E — ref-safety failure surfaces.
// ---------------------------------------------------------------------------

Deno.test("cli (#764): parent-escape \\$ref surfaces RefEscapesRoot", async () => {
  const dir = await tempDir();
  try {
    const out = `${dir}/escape-cli`;
    const r = await runCli([
      "compile",
      `${FIXTURE_DIR}parent-escape.yaml`,
      "--output",
      out,
    ]);
    assert(r.code !== 0, `expected non-zero exit on parent-escape`);
    assertStringIncludes(
      r.stderr + r.stdout,
      "RefEscapesRoot",
      `expected 'RefEscapesRoot' in output; got stderr:\n${r.stderr}\nstdout:\n${r.stdout}`,
    );
  } finally {
    await cleanup(dir);
  }
});
