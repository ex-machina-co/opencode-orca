---
model: claude-sonnet-4-20250514
---

# Commit Changes

Streamline the git commit process with automated staging, change analysis, and intelligent commit message generation.
Never run `fetch` or `main` when doing this, as they blow away `main` aggressively. ALWAYS USE TODOS!

Please follow these steps:

1. **Check for changes**: Run `git status` to detect staged and unstaged changes
   - If no changes exist, inform user and exit
   - If unstaged changes exist, stage all changes with `git add .`
2. **Ensure repository state**: Verify you are synced with the latest remote changes
   - Before doing anything else, stash all changes (everything should be staged)
     1. `git add .`
     2. `git stash`
   - Update `main` local branch to match the remote with `git pull origin main`
   - Reapply stashed changes with `git stash pop` (if this fails or there are conflicts, abort and inform user)
3. **Analyze changes**: Show the current state for review
   - Run `git status` to display staged files
   - Run `git diff --staged` to show actual changes being committed
   - Display a summary of files and change types
4. **Generate commit message**: Create an appropriate commit message
   - Analyze staged changes to determine commit type (feat, fix, docs, refactor, etc.)
   - Generate descriptive message following conventional commit format
   - Present message to user for approval or editing
   - Never include Claude Code attribution in commit messages
5. **Execute commit**: Create the commit with approved message
   - If the changes are complex and cover multiple domains, ask the user to confirm before proceeding
   - If the changes are fairly focused, proceed with the commit without confirmation
   - If user rejects the message, allow editing or aborting the commit
   - Run `git commit` with the final message
   - Let pre-commit hooks handle formatting and linting automatically
   - If pre-commit hooks modify files, retry the commit to include hook changes
   - If pre-commit hooks cause a failure:
     - attempt to fix the issues and try the commit again
     - DO NOT RUN `git commit --amend` BECAUSE THE PRE-COMMIT HOOKS STOP THE COMMIT
6. **Post-commit actions**: Complete the workflow
   - Display commit hash and summary
   - Run `git push` and confirm success

This command ensures a smooth, validated commit process while leveraging existing pre-commit hooks for code quality.
