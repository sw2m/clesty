# clesty

A clean-room reimplementation of [`specli`](https://pypi.org/project/specli/): an
OpenAPI 3 to CLI client generator.

## Status

**Scaffolding only.** This repo currently contains only the project layout and a
wired-up test harness. No feature code, no OpenAPI parsing, no CLI synthesis.

See open issues for the plan:

- [#1](https://github.com/sw2m/clesty/issues/1) — Establish test suite
- [#2](https://github.com/sw2m/clesty/issues/2) — Extract the functional spec
  from `specli`
- [#3](https://github.com/sw2m/clesty/issues/3) — E2E test spec: OpenAPI 3 to
  CLI client (`specli` as benchmark)

## Runtime

[Deno](https://deno.land/) (latest stable). Install via
`curl -fsSL https://deno.land/install.sh | sh`.

## Common tasks

```sh
deno task test        # run the test suite
deno task fmt         # format
deno task fmt:check   # CI: verify formatting
deno task lint        # lint
deno task check       # typecheck src/ and tests/
```

## Layout

```
src/                  # library + CLI source (currently empty entry point)
tests/
  fixtures/           # OpenAPI documents used by the suite
  support/            # shared test helpers
  smoke_test.ts       # proves the harness loads
.github/workflows/    # CI (fmt, lint, typecheck, test)
deno.json             # tasks, imports, fmt/lint config
```

## License

[MIT](./LICENSE)
