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
// Item B — invoking a subcommand on the compiled binary actually attempts
//          an HTTP request via hey-api's typed client. We pin a positive
//          failure signature: a network error name from the fetch-client
//          (TypeError / ConnectionRefused / fetch-failed text) when the
//          target host is unreachable. A binary crash or stub message
//          would NOT produce these, so this is non-tautological.
// ---------------------------------------------------------------------------

Deno.test("hey-api (#766): action body reaches the fetch client (positive network-error signature)", async () => {
  const dir = await tempDir();
  try {
    const out = `${dir}/cli`;
    const compileResult = await runCli([
      "compile",
      `${FIXTURE_DIR}parameterized.yaml`,
      "--output",
      out,
    ]);
    assertEquals(compileResult.code, 0, `compile must succeed; stderr:\n${compileResult.stderr}`);
    // Invoke against the unreachable default base URL (the spec has no
    // `servers` set). The action must (a) NOT throw the #768 stub text,
    // and (b) produce a network-error signature consistent with reaching
    // the fetch client.
    const run = await runBin(out, ["get-pet", "--id", "1"]);
    const out_ = run.stdout + run.stderr;
    assert(
      !/clesty runtime not implemented yet/.test(out_),
      `stub message must not appear; got:\n${out_}`,
    );
    // Positive signature: at least one of these network-error tokens
    // must appear in stderr. fetch / TypeError / ECONNREFUSED / refused /
    // invalid URL — any of them prove control reached the fetch client.
    const networkErrorRe =
      /TypeError|fetch failed|ECONNREFUSED|refused|invalid URL|Invalid URL|Network/i;
    assert(
      networkErrorRe.test(out_),
      `expected a network-error signature proving fetch was reached; got:\n${out_}`,
    );
    assert(run.code !== 0, `non-zero exit expected on network failure; got ${run.code}`);
  } finally {
    await cleanup(dir);
  }
});
