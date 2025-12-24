# Code Review

Review code against project principles and patterns.

## Load Review Context
Read these files to understand standards:
- `skills/CODING_PRINCIPLES.md` - SOLID, DRY, YAGNI
- `skills/UI_PATTERNS.md` - Component patterns
- `skills/TESTING.md` - Testing philosophy
- `skills/MVP_SCOPE.md` - Anti-over-engineering

## Review Checklist

### Architecture
- [ ] Single Responsibility: Each function/component does ONE thing
- [ ] Logic separated from presentation
- [ ] No business logic in JSX
- [ ] Server Components by default, `'use client'` only when needed

### Code Quality
- [ ] No repeated logic (DRY)
- [ ] No premature abstractions (YAGNI)
- [ ] Types inferred from source (Drizzle/Zod)
- [ ] No magic numbers or strings
- [ ] Functions < 50 lines, files < 300 lines

### Testing
- [ ] Tests focus on behavior, not implementation
- [ ] No mocks or spies (use real dependencies)
- [ ] Critical paths covered
- [ ] Descriptive test names

### Database
- [ ] Queries use relational API (not raw SQL)
- [ ] No N+1 queries
- [ ] Transactions for related operations
- [ ] ISO strings for dates (consistent format)

### Security
- [ ] Input validation with Zod
- [ ] No secrets in code
- [ ] Family membership checked for data access

## Output Format
Provide feedback as:
1. **Issues** - Problems that should be fixed
2. **Suggestions** - Improvements to consider
3. **Praise** - What's done well (briefly)
