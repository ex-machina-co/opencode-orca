---
name: github-read
description: Read-only Git and GitHub CLI operations for repository inspection
---

# GitHub Read Operations

Read-only operations for inspecting repository state, issues, PRs, and projects.

## First: Load Configuration

Before running commands, read `.opencode/github.json` for repository context:

```bash
cat .opencode/github.json
```

Key values you'll need:
- `repository.full_name` - For `--repo` flags (e.g., "owner/repo")
- `project.number` - For project queries
- `project.owner` - Usually "@me" for user projects

## Important: Flag Syntax

**Use `=` syntax for flags with values** to ensure permission patterns match correctly:

```bash
# Correct - permissions will match
gh issue list --repo=owner/repo --state=closed --limit=5

# May fail permission check - avoid this syntax
gh issue list --repo owner/repo --state closed --limit 5
```

This applies to all gh commands with flag arguments.

## Git Operations

### Working Tree State

```bash
# Current status
git status

# Short status
git status -s

# Show what's staged vs unstaged
git diff          # unstaged changes
git diff --staged # staged changes
```

### History & Inspection

```bash
# Recent commits
git log --oneline -20

# Commits on current branch not on main
git log origin/main..HEAD --oneline

# Full commit details
git show <commit>

# Who changed each line
git blame <file>
```

### Branch Information

```bash
# List local branches
git branch

# List all branches (including remote)
git branch -a

# List remote branches only
git branch -r

# Show current branch
git branch --show-current
```

### Remote State

```bash
# Update remote refs (safe - doesn't change working tree)
git fetch origin

# List remotes
git remote -v

# Show remote details
git remote show origin
```

### Comparisons

```bash
# Diff between branches
git diff main..feature-branch

# Commits in feature not in main
git log main..feature-branch --oneline

# Files changed between branches
git diff main..feature-branch --name-only
```

## GitHub CLI Operations

### Issues

```bash
# View issue details
gh issue view <number> --repo=<full_name>

# List open issues
gh issue list --repo=<full_name>

# List issues with filters
gh issue list --repo=<full_name> --assignee=@me
gh issue list --repo=<full_name> --label=bug
gh issue list --repo=<full_name> --state=closed
```

### Pull Requests

```bash
# View PR details
gh pr view <number> --repo=<full_name>

# View PR diff
gh pr diff <number> --repo=<full_name>

# Check CI status
gh pr checks <number> --repo=<full_name>

# List PRs
gh pr list --repo=<full_name>
gh pr list --repo=<full_name> --author=@me
gh pr list --repo=<full_name> --state=merged
```

### Projects

```bash
# List project items (JSON for parsing)
gh project item-list <project_number> --owner=<project_owner> --format=json

# Filter by status with jq
gh project item-list <project_number> --owner=<project_owner> --format=json | \
  jq '[.items[] | select(.status.name == "In Progress")]'

# Find specific issue in project
gh project item-list <project_number> --owner=<project_owner> --format=json | \
  jq '.items[] | select(.content.number == 42)'
```

### Releases & Runs

```bash
# List releases
gh release list --repo=<full_name>

# View release
gh release view <tag> --repo=<full_name>

# List workflow runs
gh run list --repo=<full_name>

# View run details
gh run view <run_id> --repo=<full_name>
```

## Common Patterns

### Pre-PR Review Check

```bash
git fetch origin
git status
git log origin/main..HEAD --oneline
git diff origin/main..HEAD --stat
```

### Check What's Being Worked On

```bash
# From project board
gh project item-list <number> --owner=@me --format=json | \
  jq '[.items[] | select(.status.name == "In Progress") | {title: .title, number: .content.number}]'
```

### Inspect a PR for Review

```bash
gh pr view <number> --repo=<full_name>
gh pr diff <number> --repo=<full_name>
gh pr checks <number> --repo=<full_name>
```

## Write Operations

**This skill covers READ-ONLY operations.**

For any operation that modifies state, delegate to the `github` agent:
- `git commit`, `git push`, `git merge`, `git rebase`
- `gh issue create`, `gh issue edit`, `gh issue close`
- `gh pr create`, `gh pr merge`, `gh pr comment`
- `gh project item-add`, project status updates
- Any `gh api` mutations (POST/PATCH/DELETE)

Example delegation:
```
Delegate to github agent:
> Create issue:
> - Title: "Fix login redirect"
> - Labels: bug
> - Body: "Users are redirected to wrong page after login"
```
