---
'api-codegen-runner': minor
---

Add non-interactive CLI support:

- `init --eject` / `init --no-eject` skip the template-ejection prompt, so `init` is safe to run in CI and scripts (without a flag, non-TTY environments now skip the prompt instead of hanging)
- `update -c, --config <path>` accepts a custom config path, matching `generate`
