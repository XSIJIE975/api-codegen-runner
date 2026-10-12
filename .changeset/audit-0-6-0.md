---
'api-codegen-runner': minor
---

## 0.6.0 — Codebase audit fixes & CLI improvements

### Generation correctness

- `separateTypes` mode no longer wipes the types output directory when `clean: false`; with `clean: true` the types directory is cleared in both type modes, so switching `separateTypes` no longer leaves stale files
- Sanitize JSDoc descriptions (fold newlines, escape `*/`) and skip the comment block when empty; render descriptions unescaped so `<`/`&` stay intact; omit empty JSDoc blocks and unused type imports
- Use upstream TS property types as-is for expanded path parameters (refs/arrays no longer collapse to `string`) and honor their `required` flags
- Collect all 2xx responses (including `2XX`) into the response type union
- Warn when URL path placeholders have no matching path parameter
- Parallelize API file generation; render type templates with an empty-object fallback when `globalContext` is unset
- Skip writing files whose content is unchanged to avoid watcher churn; load Prettier lazily and log format failures at debug level

### CLI

- `--version` reports the real package version
- Watch mode: also watches config dependencies and custom templates, triggers regeneration on atomic-save rename events (including Linux/inotify), re-arms stopped watchers with bounded retries instead of stopping silently, and rebuilds the watch set after pending reruns
- `init --eject` / `init --no-eject` skip the template-ejection prompt, so `init` is safe to run in CI and scripts (without a flag, non-TTY environments now skip the prompt instead of hanging)
- `update -c, --config <path>` accepts a custom config path, matching `generate`

### Vite plugin

- Only configured template files trigger regeneration; the initial config load is reused

### Other

- Preserve `watch` / `watchDebounce` through config validation
- Correct the documented `methodNameCase` default to PascalCase; add a domain glossary (`CONTEXT.md`)
- Add tests covering transformer fixes, generator integration and validator; run tests in CI
