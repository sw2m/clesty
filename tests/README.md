# tests

The suite is organised as:

- `fixtures/` — OpenAPI documents (YAML / JSON) the tests load. Add new
  fixtures here as feature coverage grows; keep each one minimal and focused on
  one OpenAPI feature.
- `*_test.ts` — the tests themselves. Deno discovers anything matching
  `*_test.ts` by default. Tests use `@std/assert` for assertions, `@std/yaml`
  for fixture loading, and `@std/path` for path resolution — see `deno.json`
  for the import map.

## Running

From the repo root:

```sh
deno task test                  # all tests
deno test tests/smoke_test.ts   # one file
```
