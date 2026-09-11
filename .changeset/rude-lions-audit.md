---
'api-codegen-runner': patch
---

Fix generation correctness issues and improve reliability:

- `separateTypes` mode no longer wipes the types output directory when `clean: false`
- Sanitize JSDoc descriptions (fold newlines, escape `*/`) and skip the comment block when empty; render descriptions unescaped so `<`/`&` stay intact
- Warn when URL path placeholders have no matching path parameter
- Use upstream TS property types as-is for expanded path parameters (refs/arrays/enums no longer collapse to `string`)
- Collect all 2xx responses (including `2XX`) into the response type union
- Preserve `watch` / `watchDebounce` through config validation
- CLI: report the real package version; watch mode now also watches config dependencies and custom templates, and re-arms watchers after atomic saves
- CLI: add `init --eject` / `--no-eject` flags for non-interactive environments; `update -c` accepts a custom config path
- Skip writing files whose content is unchanged to avoid watcher churn; load Prettier lazily and log format failures at debug level
- Vite plugin: only configured template files trigger regeneration; reuse the initial config load
- Parallelize API file generation; render type templates with an empty-object fallback when `globalContext` is unset
- Run tests in CI
