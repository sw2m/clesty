# tests

The suite is organised as:

- `fixtures/` — OpenAPI documents (YAML / JSON) the tests load. Add new
  fixtures here as feature coverage grows; keep each one minimal and focused on
  one OpenAPI feature.
- `support/` — shared helpers (e.g. `runner.ts`, which loads a fixture by
  filename). Tests should go through these helpers rather than reading files
  directly so that the harness can grow without touching every test file.
- `*_test.ts` — the tests themselves. Deno discovers anything matching
  `*_test.ts` by default.

## Running

From the repo root:

```sh
deno task test        # all tests
deno test tests/smoke_test.ts   # one file
```

The suite uses `Deno.test()` with the standard `@std/assert` assertions. See
`deno.json` for the import map.
