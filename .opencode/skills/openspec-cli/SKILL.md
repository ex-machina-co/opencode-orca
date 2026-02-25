---
name: openspec-cli
description: How to invoke the openspec CLI. Load this BEFORE running any openspec commands.
---

# OpenSpec CLI Invocation

All `openspec` CLI commands MUST be prefixed with `bunx`.

The `openspec` package is a devDependency — it is not on the system PATH.

```bash
# Correct
bunx openspec status
bunx openspec new change "my-change"

# Wrong — will fail
openspec status
openspec new change "my-change"
```
