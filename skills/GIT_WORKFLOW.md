# Git Workflow & Commit Strategy

## Core Principles

1. **Organize commits by logical boundaries** - Each commit is self-contained
2. **Write descriptive messages** - Future you will thank present you
3. **Never commit secrets** - Use .gitignore and example files
4. **Credit Claude** - Use Co-Authored-By for transparency

## Commit Organization

### Create Separate, Focused Commits

Each commit should represent one logical change:

**Good commit organization:**
```bash
feat: initialize project foundation        # Dependencies, configs
feat: implement database schema           # Complete schema in one commit
feat: implement Clerk authentication      # All auth files together
feat: build tRPC v11 infrastructure       # Complete tRPC setup
feat: add Zod validation schemas          # All schemas together
feat: implement family router             # One router at a time
```

**Why this works:**
- Each commit is self-contained and functional
- Easy to review changes by feature
- Simple to revert if needed
- Clear project evolution in git log

### Group Related Files Together

```bash
# Database layer
git add drizzle.config.ts src/lib/db/
git commit -m "feat: implement database schema with Drizzle ORM"

# Authentication
git add src/middleware.ts src/app/(auth)/ src/app/api/webhooks/clerk/
git commit -m "feat: implement Clerk authentication"

# Single feature
git add src/lib/schedules/ src/components/schedules/
git commit -m "feat: add recurring schedule patterns"
```

## Commit Message Format

Use conventional commits with descriptive bodies:

```
<type>: <short description>

<detailed explanation if needed>

<any breaking changes or notes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring without behavior change
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Tooling, configs, dependencies
- `security:` - Security improvements
- `perf:` - Performance improvements

### Examples

```bash
# Good commit messages
git commit -m "feat: add swap request functionality

- Create swap_requests table
- Add tRPC mutation for requesting swaps
- Add SwapRequestCard component
- Email notification via Clerk

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git commit -m "fix: prevent past events from being swapped

Users were able to request swaps for events that already occurred.
Added validation to check event.startTime > now().

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git commit -m "refactor: extract event validation to utils

Moved validation logic from component to lib/events/utils.ts
for better testability and reusability.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## When to Commit

### ✅ Good Times to Commit

- Finished implementing a complete feature
- Added all files for a specific layer (schema, routes, components)
- Fixed a bug and added tests
- Completed a refactoring
- After running tests and they pass

### ❌ Avoid Committing

- Work-in-progress / broken code
- Half-implemented features
- Commented-out code blocks
- Debug console.logs
- Code that doesn't pass type checking
- Code without tests for critical paths

## Multiple Files Per Commit

Group logically related files:

```bash
# Database changes
git add \
  src/lib/db/schema.ts \
  drizzle/0001_add_swap_requests.sql
git commit -m "feat: add swap requests schema"

# Component with its styles and tests
git add \
  src/components/events/event-card.tsx \
  src/components/events/event-card.test.tsx
git commit -m "feat: create EventCard component"

# Full feature implementation
git add \
  src/lib/trpc/routers/events.ts \
  src/app/api/trpc/\[trpc\]/route.ts \
  src/schemas/events.ts
git commit -m "feat: implement events tRPC router"
```

## Handling Secrets and Sensitive Data

### NEVER Commit These Files

Add to `.gitignore`:
```gitignore
# Environment variables with secrets
.env
.env.local
.env.*.local

# MCP server configs with tokens
.mcp.json

# Clerk config
/.clerk/

# Claude Code cache
/.claude/

# Personal notes
/NOTES.md
/TODO.md
```

### Create Example Templates

```bash
# Create .env.example (commit this)
DATABASE_URL="postgresql://user:pass@xxx.neon.tech/db"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"

# Create .mcp.json.example (commit this)
{
  "mcpServers": {
    "neon": {
      "command": "npx",
      "args": ["-y", "@upstash/mcp-neon"],
      "env": {
        "NEON_API_KEY": "your-key-here"
      }
    }
  }
}
```

### If You Accidentally Commit Secrets

```bash
# Remove file from all commits in history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up refs
git for-each-ref --format='%(refname)' refs/original/ | \
  xargs -n 1 git update-ref -d

# Garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remote
git push origin --force --all
git push origin --force --tags
```

**Then:**
1. Rotate all exposed credentials immediately
2. Update .gitignore to prevent recurrence
3. Add .example files as templates

## Branch Strategy

### Main Branch

- Always keep `main` in working state
- All commits should be production-ready
- Never commit directly to main (use PRs in team settings)

### Feature Branches

```bash
# Create feature branch
git checkout -b feat/swap-requests

# Make commits
git commit -m "feat: add swap request schema"
git commit -m "feat: implement swap tRPC mutations"
git commit -m "feat: add SwapRequestCard component"

# Merge when complete
git checkout main
git merge feat/swap-requests
git branch -d feat/swap-requests
```

### Naming Conventions

```
feat/description      # New feature
fix/description       # Bug fix
refactor/description  # Code improvement
docs/description      # Documentation
test/description      # Test additions
```

## Viewing History

```bash
# Clean, readable log
git log --oneline --graph --decorate

# See what changed in a commit
git show <commit-hash>

# See files changed
git diff HEAD~1

# Find when a bug was introduced
git bisect start
```

## Undoing Changes

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo specific file
git checkout HEAD -- path/to/file

# Create a revert commit
git revert <commit-hash>
```

## Working with Remote

```bash
# Set up remote
git remote add origin git@github.com:username/repo.git

# Push changes
git push origin main

# Pull changes
git pull origin main

# Force push (use cautiously)
git push origin main --force
```

## Pre-Commit Checklist

Before committing:
- [ ] Run `pnpm typecheck` - must pass
- [ ] Run `pnpm lint` - fix any errors
- [ ] Run `pnpm test` - all tests green
- [ ] Remove debug console.logs
- [ ] Remove commented-out code
- [ ] Verify no secrets in diff (`git diff --staged`)
- [ ] Commit message follows conventional format
- [ ] Added Co-Authored-By if Claude assisted

## Post-Commit Checklist

After committing:
- [ ] Verify commit with `git log -1`
- [ ] Check what was included with `git show`
- [ ] Push to remote if ready
- [ ] Consider if this commit should trigger a deployment

## Common Workflows

### Starting a New Feature

```bash
git checkout -b feat/calendar-view
# Work on feature...
git add src/components/calendar/
git commit -m "feat: implement calendar view component"
pnpm typecheck && pnpm test
git push origin feat/calendar-view
```

### Fixing a Bug

```bash
git checkout -b fix/swap-validation
# Fix the bug...
git add src/lib/events/utils.ts src/lib/events/utils.test.ts
git commit -m "fix: prevent swapping past events

Added validation in canSwapEvent() to check
event.startTime > now()

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin fix/swap-validation
```

### Refactoring

```bash
git checkout -b refactor/extract-validation
# Move code around...
git add src/lib/validation/ src/schemas/
git commit -m "refactor: consolidate validation schemas

Moved all Zod schemas to src/schemas/ for
better organization and reusability

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin refactor/extract-validation
```

## Git Configuration

### Recommended Settings

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Better diffs
git config --global diff.algorithm histogram

# Auto-correct typos
git config --global help.autocorrect 1

# Color output
git config --global color.ui auto

# Default branch name
git config --global init.defaultBranch main
```

### SSH Key Setup

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
```

## Tips

- **Commit often, perfect later** - Use `git rebase -i` to clean up commits before pushing
- **Write commit messages for future you** - You'll thank yourself in 6 months
- **Keep commits focused** - One logical change per commit
- **Test before committing** - Broken commits break git bisect
- **Use .gitignore** - Don't commit build artifacts, dependencies, or secrets
- **Credit collaborators** - Use Co-Authored-By for pair programming or AI assistance
