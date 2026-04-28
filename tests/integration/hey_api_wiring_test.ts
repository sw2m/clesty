/**
 * Phase 2a Red-Gate suite for sw2m/clesty issue #766 — hey-api typed-client
 * wiring inside the compiled binary.
 *
 * The compile pipeline (#764, #765) produces a binary whose subcommand
 * `--help` is correct via codegen alone. With hey-api wired in, the
 * binary additionally:
 *
 *   - bundles the typed client emitted by `@hey-api/openapi-ts`, so the
 *     `client.<opId>(...)` calls inside the codegen-generated action
 *     bodies resolve to real, type-safe functions instead of the
 *     "not implemented yet" Proxy stub from #769.
 *   - exits 5 with a `Compile.HeyApiFailure` surface if hey-api itself
 *     rejects the spec mid-pipeline (the test below for that case is
 *     deferred until a fixture exists that passes preflight + ref-safety
 *     but breaks hey-api).
 *
 * The harness for "actually make an HTTP call against a stubbed server"
 * lives in #767.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

const REPO_ROOT = fromFileUrl(new URL("../../", import.meta.url));
const FIXTURE_DIR = fromFileUrl(
  new URL("../fixtures/hey-api-wiring/", import.meta.url),
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
  return await Deno.makeTempDir({ prefix: "clesty-hey-test-" });
}

async function cleanup(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Item A — compiled binary's per-operation --help lists its parameters.
// ---------------------------------------------------------------------------

Deno.test("hey-api (#766): compiled binary's `<op> --help` lists path + query flags", async () => {
  const dir = await tempDir();
  try {
    const out = `${dir}/cli`;
    const r = await runCli([
      "compile",
      `${FIXTURE_DIR}parameterized.yaml`,
      "--output",
      out,
    ]);
    assertEquals(r.code, 0, `compile must succeed; stderr:\n${r.stderr}`);
    const help = await runBin(out, ["get-pet", "--help"]);
    assertEquals(help.code, 0, `<op> --help must exit 0; stderr:\n${help.stderr}`);
    const text = help.stdout + help.stderr;
    assertStringIncludes(text, "--id", `expected '--id' flag; got:\n${text}`);
    assertStringIncludes(text, "--include", `expected '--include' flag; got:\n${text}`);
  } finally {
    await cleanup(dir);
  }
});

// ---------------------------------------------------------------------------
// Item B — invoking a subcommand on the compiled binary no longer throws
//          the "not implemented yet (#768)" stub. With hey-api wired, the
//          action attempts an HTTP request; without a stubbed server it
//          will fail with a network error rather than the stub message.
// ---------------------------------------------------------------------------

Deno.test("hey-api (#766): action body no longer throws #768 stub message", async () => {
  const dir = await tempDir();
  try {
    const out = `${dir}/cli`;
    const compileR = await runCli([
      "compile",
      `${FIXTURE_DIR}parameterized.yaml`,
      "--output",
      out,
    ]);
    assertEquals(compileR.code, 0, `compile must succeed; stderr:\n${compileR.stderr}`);
    // Invoke against an unreachable URL so the request fails. We assert
    // the failure does NOT mention the #768 stub text, proving the
    // hey-api code path is reached. A real network failure (ECONNREFUSED,
    // DNS resolution, etc.) is fine.
    const run = await runBin(out, ["get-pet", "--id", "1"]);
    assert(
      !/clesty runtime not implemented yet/.test(run.stderr + run.stdout),
      `expected hey-api code path reached; got:\nstdout: ${run.stdout}\nstderr: ${run.stderr}`,
    );
  } finally {
    await cleanup(dir);
  }
});
