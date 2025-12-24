# Create a Git Commit

Guide for creating well-formatted commits following project conventions.

## Load Context
Read `skills/GIT_WORKFLOW.md` for full conventions.

## Pre-Commit Checks

Run these first:
```bash
pnpm typecheck && pnpm lint && pnpm test --run
```

## Check Status

```bash
git status
git diff --staged
```

## Commit Format

```
<type>: <short description>

<detailed explanation if needed>

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code change without behavior change
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Tooling, configs, dependencies
- `security:` - Security improvements
- `perf:` - Performance improvements

## Grouping Files

Group logically related files in one commit:
```bash
# Database layer together
git add src/lib/db/schema.ts src/schemas/

# Component with tests
git add src/components/feature/ src/components/feature/*.test.tsx

# Full feature
git add src/lib/trpc/routers/ src/schemas/ src/components/
```

## Example Commits

```bash
git commit -m "feat: add swap request functionality

- Create swap_requests table
- Add tRPC mutation for requesting swaps
- Add SwapRequestCard component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

```bash
git commit -m "fix: prevent past events from being swapped

Users were able to request swaps for events that already occurred.
Added validation to check event.startTime > now().

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## After Committing

```bash
git log -1  # Verify commit
git show    # Check what was included
```
