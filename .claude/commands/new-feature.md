# Plan a New Feature

Before implementing, gather context and plan the approach.

## Step 1: Load Context
Read these skill files to understand project constraints:
- `skills/MVP_SCOPE.md` - Ensure we're not over-engineering
- `skills/CODING_PRINCIPLES.md` - Follow SOLID/DRY/YAGNI
- `skills/UI_PATTERNS.md` - Component architecture patterns

## Step 2: Understand the Request
If the user hasn't provided details, ask clarifying questions:
- What problem does this feature solve?
- Who is the primary user?
- What's the minimal viable implementation?

## Step 3: Enter Plan Mode
Use the EnterPlanMode tool to:
1. Explore relevant parts of the codebase
2. Identify files that need modification
3. Design the implementation approach
4. Create a step-by-step plan
5. Get user approval before coding

## Step 4: Implementation
After plan approval:
1. Create a todo list with specific tasks
2. Implement incrementally, testing as you go
3. Run `pnpm typecheck && pnpm test` frequently
4. Commit after each logical unit of work

Remember: MVP first. Don't add features beyond what was requested.
