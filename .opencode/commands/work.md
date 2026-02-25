---
description: Pick up an issue and start working on it
---

## /work Command

Pick up an issue and mark it as in progress.

### Input
- Description or issue number (optional): $ARGUMENTS

### Phase 1: Delegate to @product-manager

Delegate the entire workflow to the `product-manager` agent with the following context:

**If `$ARGUMENTS` is provided:**
> Pick up the issue matching: "$ARGUMENTS"
>
> Search for a matching issue, move it to "In Progress", and assign it to the current user.

**If `$ARGUMENTS` is empty:**
> Show my assigned issues from the Backlog and In Progress pipelines.
> Let me pick one, then move it to "In Progress" and assign it to me.

### Phase 2: Report

The PM agent will report back with:
```
Picked up #<ISSUE_NUMBER> — <ISSUE_TITLE>

  Status: In Progress
  Assigned: @<username>
```

Or if no matching issue was found:
```
No matching issue found for "<ARGUMENTS>".
```
