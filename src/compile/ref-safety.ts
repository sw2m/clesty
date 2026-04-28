/**
 * `$ref` pre-flight (closes #241 items 9-11).
 *
 * Walks every string-valued `$ref` in a spec document and refuses any
 * external reference that resolves outside the allowed root. Hash-only
 * refs (`#/components/...`) are local to the document and always
 * allowed.
 *
 * Default allowed root: the spec file's directory. Pass
 * `{ allowRefRoot: <dir> }` to broaden — useful when the spec lives in
 * one repo subtree and shared types live in a sibling directory.
 *
 * The pre-flight uses `Deno.realPath` so symlinks can't smuggle a ref
 * past the boundary check.
 *
 * @module
 */

import * as Yaml from "@std/yaml";
import { dirname, isAbsolute, resolve } from "@std/path";

export class RefEscapesRoot extends Error {
  ref: string;
  root: string;
  constructor(context: string, opts: { ref: string; root: string }) {
    super(
      `${context} ($ref=${JSON.stringify(opts.ref)}, allowed root=${JSON.stringify(opts.root)})`,
    );
    this.name = "RefEscapesRoot";
    this.ref = opts.ref;
    this.root = opts.root;
  }
}

export type CheckOptions = {
  /** Override the default allowed root (the spec file's directory). */
  allowRefRoot?: string;
};

/** Recursively collect every string `$ref` value from a parsed doc. */
function collect(node: unknown, out: string[]): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collect(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key === "$ref" && typeof value === "string") {
      out.push(value);
      continue;
    }
    collect(value, out);
  }
}

/** Resolve a directory to its canonical, symlink-free form. */
async function canonical(path: string): Promise<string> {
  try {
    return await Deno.realPath(path);
  } catch {
    // Path may not exist yet (broken ref, deliberately bad fixture). Fall
    // back to lexical normalization — `resolve` is enough for the boundary
    // check since we only need to compare prefixes against `root`.
    return resolve(path);
  }
}

/**
 * Check that every external `$ref` in `specPath` resolves within the
 * allowed root. Throws `RefEscapesRoot` on the first violation, naming
 * the offending pointer.
 */
export async function checkRefSafety(specPath: string, opts: CheckOptions = {}): Promise<void> {
  const text = await Deno.readTextFile(specPath);
  const doc = Yaml.parse(text);

  const refs: string[] = [];
  collect(doc, refs);

  const specDir = dirname(specPath);
  const rootRaw = opts.allowRefRoot ?? specDir;
  const root = await canonical(rootRaw);

  for (const ref of refs) {
    if (ref.startsWith("#")) continue; // local pointer, always allowed
    const fileSegment = ref.split("#", 1)[0];
    const target = isAbsolute(fileSegment) ? fileSegment : resolve(specDir, fileSegment);
    const resolved = await canonical(target);
    if (resolved !== root && !resolved.startsWith(root + "/")) {
      throw new RefEscapesRoot(
        `$ref escapes the allowed root`,
        { ref, root },
      );
    }
  }
}
