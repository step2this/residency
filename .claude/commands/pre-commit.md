# Pre-Commit Checks

Run all checks before committing to ensure code quality.

## Run Checks

Execute these commands and report results:

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test --run
```

## Review Staged Changes

```bash
# See what will be committed
git diff --staged

# Check for secrets or debug code
git diff --staged | grep -E "(console\.(log|debug)|DEBUG|TODO|FIXME|password|secret|api.?key)" || echo "No obvious issues found"
```

## Checklist

Before approving the commit:
- [ ] TypeScript compiles without errors
- [ ] ESLint passes (no errors)
- [ ] All tests pass
- [ ] No debug console.logs in diff
- [ ] No commented-out code
- [ ] No secrets in diff
- [ ] Commit message follows conventional format

## If All Checks Pass

Suggest a commit message following the format:
```
<type>: <short description>

<detailed explanation if needed>

Co-Authored-By: Claude <model>
```

Types: feat, fix, refactor, docs, test, chore, security, perf
