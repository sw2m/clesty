/**
 * Pre-flight check on the `openapi` version field of a source document.
 *
 * Closes #107. Reads at most {@link MAX_PREFLIGHT_BYTES} from the source,
 * extracts the OpenAPI version, classifies dialect (3.0 vs 3.1), and
 * either resolves with `{origin, dialect, version}` or rejects with a
 * specific {@link Compile} error class.
 *
 * Source can be:
 *   - a filesystem path (`string` not starting with `http`/`file`)
 *   - a `URL` (file:// or remote)
 *   - a `ReadableStream<Uint8Array>` (e.g. stdin)
 *
 * Pre-flight is deliberately lightweight: a regex scan of the first few
 * KiB of bytes after BOM strip. The full document is not parsed; that's
 * hey-api's job downstream.
 *
 * Stream sources: the reader's lock is released after the budget is hit,
 * not cancelled, so the underlying stream object remains valid. The
 * bytes already consumed are gone — see #107 tech-spec §7 and the
 * "Open questions" entry on stream handoff for the architectural
 * follow-up that will tee or buffer for hey-api.
 *
 * @module
 */

/** Maximum bytes pre-flight reads from any source. Spec default: 16 KiB. */
export const MAX_PREFLIGHT_BYTES = 16 * 1024;

/**
 * Strict X.Y.Z shape for accepted versions: major 3, minor 0 or 1, patch
 * is a non-negative integer with no leading zero. Per #107 tech-spec §6
 * this excludes `3.0` (no patch), `3.0.01` (zero-padded), `3.1.0-rc1`
 * (prerelease), `3.2.0`, `4.0.0`. Future patches like `3.0.5` or
 * `3.1.3` are accepted automatically.
 */
const SUPPORTED_RE = /^3\.[01]\.(?:0|[1-9]\d*)$/;
const SUPPORTED_DESC = "3.0.x or 3.1.x";

/** Compile-stage error classes. All carry an `origin` field. */
export const Compile = {
  MissingVersion: class extends Error {
    origin: string;
    constructor(origin: string, message?: string) {
      super(message ?? `OpenAPI version field missing in ${origin}`);
      this.name = "Compile.MissingVersion";
      this.origin = origin;
    }
  },
  InvalidVersion: class extends Error {
    origin: string;
    constructor(origin: string, message?: string) {
      super(message ?? `OpenAPI version field is not a string in ${origin}`);
      this.name = "Compile.InvalidVersion";
      this.origin = origin;
    }
  },
  UnsupportedVersion: class extends Error {
    origin: string;
    constructor(origin: string, version: string, message?: string) {
      super(
        message ??
          `OpenAPI version ${version} is unsupported in ${origin}. Supported: ${SUPPORTED_DESC}.`,
      );
      this.name = "Compile.UnsupportedVersion";
      this.origin = origin;
    }
  },
  HeyApiFailure: class extends Error {
    origin: string;
    constructor(origin: string, cause: unknown, message?: string) {
      super(message ?? `hey-api rejected ${origin}: ${String(cause)}`);
      this.name = "Compile.HeyApiFailure";
      this.origin = origin;
      // @ts-ignore Error cause is widely supported.
      this.cause = cause;
    }
  },
};

export type PreflightResult = {
  origin: string;
  dialect: "3.0" | "3.1";
  version: string;
};

/** Read a source down to MAX_PREFLIGHT_BYTES, returning bytes + origin string. */
async function read(
  src: string | URL | ReadableStream<Uint8Array>,
): Promise<{ bytes: Uint8Array; origin: string }> {
  if (src instanceof ReadableStream) {
    return { bytes: await readStream(src), origin: "<stdin>" };
  }
  if (src instanceof URL) {
    const origin = src.toString();
    if (src.protocol === "file:") {
      return { bytes: await readFile(src), origin };
    }
    return { bytes: await fetchBytes(src), origin };
  }
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return { bytes: await fetchBytes(new URL(src)), origin: src };
  }
  const path = src.startsWith("file:") ? new URL(src) : src;
  return { bytes: await readFile(path), origin: src };
}

async function fetchBytes(url: URL): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.body) return new Uint8Array();
  // Always cancel the body, even if readStream throws — leaving the
  // HTTP connection un-cancelled would keep it open.
  try {
    return await readStream(res.body);
  } finally {
    try {
      await res.body.cancel();
    } catch { /* ignore — already drained, locked, or aborted */ }
  }
}

async function readFile(path: string | URL): Promise<Uint8Array> {
  const f = await Deno.open(path, { read: true });
  try {
    const buf = new Uint8Array(MAX_PREFLIGHT_BYTES);
    let total = 0;
    while (total < MAX_PREFLIGHT_BYTES) {
      const n = await f.read(buf.subarray(total));
      if (n === null) break;
      total += n;
    }
    return buf.subarray(0, total);
  } finally {
    f.close();
  }
}

async function readStream(s: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = s.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < MAX_PREFLIGHT_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    // Release the lock without cancelling: keeps the underlying stream
    // alive for downstream consumers that may want the remaining bytes
    // (per #107 tech-spec §7 — the spec gap on stream handoff is
    // tracked separately; not destroying the stream here is the
    // minimum-viable behaviour).
    try {
      reader.releaseLock();
    } catch { /* ignore */ }
  }
  const out = new Uint8Array(Math.min(total, MAX_PREFLIGHT_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= out.byteLength) break;
    const take = Math.min(chunk.byteLength, out.byteLength - offset);
    out.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return out;
}

/**
 * Extract the `openapi:` field's RAW value. Tries the JSON form first
 * (string-quoted, after `{` or `,`), then the YAML form (key at
 * line start, optional quotes, value runs to whitespace / quote / `#`).
 *
 * Exported for direct unit testing of the parser without I/O — the
 * effectful `Preflight.check` path tests via fixtures, but `extract`
 * itself is a pure function.
 *
 * Returns:
 *   - `{kind: "missing"}` — no `openapi:` line found
 *   - `{kind: "non-string", raw}` — bare integer (`openapi: 3`)
 *   - `{kind: "string", raw}` — version string
 */
export function extract(text: string):
  | { kind: "missing" }
  | { kind: "non-string"; raw: string }
  | { kind: "string"; raw: string } {
  // JSON form per #107 §3: `^\s*[{,]\s*"openapi"\s*:\s*"<value>"`.
  // Anchored to a logical line start so a stray `{"openapi": ...}`
  // inside a YAML description block can't hijack the result. The `\s*`
  // run between the brace/comma and the `"openapi"` matches across
  // newlines, so multi-line JSON pretty-printing still resolves.
  const json = text.match(/^\s*[{,]\s*"openapi"\s*:\s*"([^"]+)"/m);
  if (json) {
    return { kind: "string", raw: json[1].trim() };
  }
  // YAML form: top-level `openapi: ...` line. Stop at whitespace, quote,
  // or `#` comment per #107 §3.
  const yaml = text.match(/^\s*openapi\s*:\s*(['"]?)([^\s'"#]+)\1/m);
  if (!yaml) return { kind: "missing" };
  const quoted = yaml[1] !== "";
  const raw = yaml[2];
  // YAML scalar: a bare integer parses as a number (not a string).
  // `openapi: 3` is the InvalidVersion case; `openapi: "3"` is a string.
  if (!quoted && /^\d+$/.test(raw)) {
    return { kind: "non-string", raw };
  }
  return { kind: "string", raw };
}

/**
 * Pre-flight check entry point. See module docstring.
 */
export const Preflight = {
  async check(src: string | URL | ReadableStream<Uint8Array>): Promise<PreflightResult> {
    const { bytes, origin } = await read(src);
    // TextDecoder strips a leading UTF-8 BOM by default (ignoreBOM=false).
    const text = new TextDecoder("utf-8").decode(bytes);

    const field = extract(text);
    if (field.kind === "missing") {
      throw new Compile.MissingVersion(origin);
    }
    if (field.kind === "non-string") {
      throw new Compile.InvalidVersion(origin);
    }
    const version = field.raw;
    if (!SUPPORTED_RE.test(version)) {
      throw new Compile.UnsupportedVersion(origin, version);
    }
    const dialect: "3.0" | "3.1" = version.startsWith("3.0") ? "3.0" : "3.1";
    return { origin, dialect, version };
  },
};
