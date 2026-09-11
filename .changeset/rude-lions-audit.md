---
'api-codegen-runner': patch
---

Fix generation correctness issues and improve reliability:

- `separateTypes` mode no longer wipes the types output directory when `clean: false`; with `clean: true` the types directory is cleared in both type modes, so switching `separateTypes` no longer leaves stale files
- Sanitize JSDoc descriptions (fold newlines, escape `*/`) and skip the comment block when empty; render descriptions unescaped so `<`/`&` stay intact
- Warn when URL path placeholders have no matching path parameter
- Use upstream TS property types as-is for expanded path parameters (refs/arrays no longer collapse to `string`) and honor their `required` flags
- Collect all 2xx responses (including `2XX`) into the response type union
- Preserve `watch` / `watchDebounce` through config validation
- CLI: report the real package version; watch mode now also watches config dependencies and custom templates, triggers regeneration on atomic-save rename events (including on Linux/inotify), re-arms watchers with bounded retries instead of stopping silently, and rebuilds the watch set after pending reruns
- Skip writing files whose content is unchanged to avoid watcher churn; load Prettier lazily and log format failures at debug level
- Vite plugin: only configured template files trigger regeneration; reuse the initial config load
- Parallelize API file generation; render type templates with an empty-object fallback when `globalContext` is unset
- Run tests in CI
