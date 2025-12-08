# Context Management Templates for Claude Code

This directory contains templates and best practices for maintaining context across Claude Code sessions for your large-scale project.

## Overview

These templates help you:
- **Maintain continuity** across coding sessions
- **Document decisions** that inform future work
- **Track progress** on product and technical backlogs
- **Communicate context** to Claude effectively
- **Manage requirements** in an agile, persistent way

## Directory Structure

```
project-root/
├── CURRENT.md                    # Current sprint focus (START HERE)
├── SESSION-CONTEXT.md           # Detailed session log
├── .claude/                     # Claude Code context files
│   ├── project-context.md       # Overall project description
│   └── coding-standards.md      # Coding preferences & standards
├── docs/
│   ├── requirements/
│   │   ├── product-vision.md    # Long-term product vision
│   │   ├── jobs-to-be-done.md   # JTBD framework
│   │   └── user-stories.md      # Detailed user stories
│   ├── technical/
│   │   └── architecture.md      # System architecture
│   └── adr/                     # Architecture Decision Records
│       ├── 000-template.md      # ADR template
│       └── 001-use-nextjs.md    # Example ADR
└── .github/
    └── ISSUE_TEMPLATE/
        ├── feature.md           # Feature request template
        ├── bug.md              # Bug report template
        └── technical-task.md   # Technical task template
```

## Getting Started

### 1. Copy Templates to Your Project

```bash
# Copy all templates to your project root
cp -r /path/to/templates/* /your/project/root/

# Initialize git (if not already)
git init
git add .
git commit -m "Add context management templates"
```

### 2. Customize Project-Specific Files

Update these files with your project details:

**High Priority** (do these first):
- `CURRENT.md` - Set your current sprint goals
- `.claude/project-context.md` - Replace placeholders with your project info
- `docs/requirements/product-vision.md` - Define your product vision

**Medium Priority** (do within first week):
- `docs/requirements/jobs-to-be-done.md` - Add your JTBDs
- `docs/requirements/user-stories.md` - Add your user stories
- `docs/technical/architecture.md` - Document your architecture

**Lower Priority** (ongoing):
- `docs/adr/` - Create ADRs as you make decisions
- `SESSION-CONTEXT.md` - Update after each session

### 3. Set Up GitHub Issues

Your GitHub issue templates are ready to use! When you create a new issue, GitHub will offer these templates:

- **Feature Request** - For user-facing features
- **Bug Report** - For bugs and issues
- **Technical Task** - For internal technical work

Link issues to user stories and JTBDs for traceability.

## Daily Workflow

### Starting a Session

1. **Read CURRENT.md** - Understand current focus
2. **Review SESSION-CONTEXT.md** - See what happened last session
3. **Check GitHub Issues** - Review active work

**Claude Code command**:
```bash
# At start of session, tell Claude:
"Read CURRENT.md and SESSION-CONTEXT.md. Let's continue with Issue #23."
```

### During a Session

1. **Create issues** for new work discovered
2. **Update code** following `.claude/coding-standards.md`
3. **Create ADRs** for architectural decisions
4. **Reference user stories** when implementing features

### Ending a Session

1. **Update SESSION-CONTEXT.md** with:
   - What you accomplished
   - Code changes made
   - Decisions made
   - Next priorities

2. **Update CURRENT.md** if sprint focus changed

3. **Ask Claude** to help you update these files:
   ```bash
   "Help me update SESSION-CONTEXT.md with what we accomplished today"
   ```

## Using Templates Effectively

### CURRENT.md - Your Session Starter

**Purpose**: Single source of truth for current work

**Update**: 
- Daily (as work progresses)
- Weekly (sprint planning)

**Key Sections**:
- This Week's Priorities - What you're actively working on
- Active Work in Progress - Issues in flight
- Blockers & Decisions Needed - What's stuck
- Next Session TODO - Where to start next time

**Pro Tip**: Keep this file at project root so Claude sees it first!

---

### SESSION-CONTEXT.md - Your Detailed Log

**Purpose**: Track detailed progress session-to-session

**Update**: After every coding session (even short ones)

**Key Sections**:
- What We Accomplished - The "done" list
- Code Changes - Files created/modified
- Decisions Made - Why we chose X over Y
- Next Session Priorities - Specific next tasks

**Pro Tip**: Be specific in "Next Session Priorities" so you can pick up immediately next time.

---

### .claude/project-context.md - Project Knowledge

**Purpose**: Help Claude understand your project holistically

**Update**: 
- Initially when setting up
- When product direction changes
- When adding new major features

**Key Sections**:
- Problem Statement - What you're solving
- Target Users - Who you're building for
- Core Value Propositions - Why it matters
- Technical Overview - How it's built

**Pro Tip**: Claude reads this automatically - keep it up to date!

---

### .claude/coding-standards.md - Code Preferences

**Purpose**: Ensure consistent code generation from Claude

**Update**:
- Initially based on your preferences
- When you establish new patterns
- When you adopt new libraries

**Key Sections**:
- TypeScript conventions
- React patterns
- Testing approach
- Error handling
- API design

**Pro Tip**: Be opinionated! This helps Claude match your style.

---

### docs/requirements/jobs-to-be-done.md - The "Why"

**Purpose**: Capture the fundamental jobs users are hiring your product to do

**Update**:
- During product discovery
- After user interviews
- When pivoting features

**Key Sections**:
- Each JTBD with context
- Related user stories
- Success criteria

**Pro Tip**: When prioritizing features, ask "Which job does this help with?"

---

### docs/requirements/user-stories.md - The "What"

**Purpose**: Translate JTBDs into specific features

**Update**:
- During sprint planning
- When refining backlog
- After product decisions

**Key Sections**:
- User stories organized by JTBD
- Acceptance criteria
- Technical notes
- Status indicators

**Pro Tip**: Reference story IDs (e.g., US-1.1) in GitHub issues and commits.

---

### docs/adr/ - Decision Records

**Purpose**: Document significant architectural decisions

**When to Create an ADR**:
- Choosing technologies (frameworks, databases, libraries)
- Significant architectural patterns
- API design approaches
- Security implementations
- Performance optimizations with trade-offs

**Structure**:
1. Context - What problem are we solving?
2. Decision - What did we decide?
3. Rationale - Why this over alternatives?
4. Consequences - What are the impacts?

**Pro Tip**: Create ADRs BEFORE implementing, not after. They help clarify thinking.

---

### GitHub Issue Templates

**Purpose**: Standardize how work is described and tracked

**Feature Template** - Use for:
- New user-facing features
- Enhancements to existing features
- Link to user stories and JTBDs

**Bug Template** - Use for:
- Bugs and defects
- Performance issues
- UX problems

**Technical Task Template** - Use for:
- Refactoring
- Infrastructure work
- Technical debt
- Setup and configuration

**Pro Tip**: Label issues (e.g., `mvp`, `phase-2`, `technical-debt`) for easy filtering.

---

## Best Practices

### 1. Keep CURRENT.md Lean

- ✅ Focus on active work (this week/sprint)
- ✅ 3-5 priorities max
- ❌ Don't let it become a dumping ground
- ❌ Don't include completed work (move to SESSION-CONTEXT.md)

### 2. Be Specific in Next Steps

Bad: "Continue working on calendar feature"
Good: "Implement timezone handling in CalendarView.tsx using date-fns-tz"

### 3. Link Everything

- Reference user stories in GitHub issues
- Reference issues in commits (`git commit -m "feat: add calendar view (US-1.1) #23"`)
- Link ADRs to related issues
- Cross-reference documentation

### 4. Update After, Not During

Don't interrupt flow to update docs. Focus on coding, then:
- End of session: Update SESSION-CONTEXT.md
- End of week: Update CURRENT.md
- After decision: Create ADR

### 5. Use Templates as Starting Points

Templates are guides, not rigid rules. Adapt them to your needs:
- Remove sections that don't apply
- Add sections that help your workflow
- Simplify for smaller projects

### 6. Commit Context Files

```bash
# Commit context changes regularly
git add CURRENT.md SESSION-CONTEXT.md docs/
git commit -m "docs: update session context and current sprint"
```

This ensures Claude has the latest context even in new environments.

---

## Working with Claude Code

### Effective Prompts for Context

**Start of Session**:
```
"Read CURRENT.md and SESSION-CONTEXT.md, then let's continue with Issue #23. 
First, show me what files we modified last session."
```

**During Development**:
```
"Implement US-1.1 (calendar view) following the coding standards in 
.claude/coding-standards.md. Use shadcn/ui components."
```

**Making Decisions**:
```
"We need to decide between REST and GraphQL for our API. 
Help me create an ADR documenting this decision."
```

**End of Session**:
```
"Help me update SESSION-CONTEXT.md. We completed Issue #23 (calendar view), 
modified CalendarView.tsx and added tests. Next session we should tackle 
timezone handling."
```

### Tips for Better Claude Collaboration

1. **Reference Files**: Tell Claude which files to read
   - "Read .claude/coding-standards.md before implementing"
   - "Check docs/requirements/user-stories.md for US-1.1"

2. **Provide Context**: Link to relevant docs
   - "This implements JTBD-1 from docs/requirements/jobs-to-be-done.md"

3. **Ask for ADRs**: When making decisions
   - "Create an ADR for choosing DynamoDB over PostgreSQL"

4. **Request Updates**: For context files
   - "Add this decision to CURRENT.md under 'Key Product Decisions'"

5. **Review Together**: Ask Claude to review context
   - "Review SESSION-CONTEXT.md and suggest what's missing"

---

## Troubleshooting

### "I'm losing context between sessions"

**Solution**: Make sure you're:
1. Updating SESSION-CONTEXT.md at end of each session
2. Being specific about "Next Session Priorities"
3. Committing context files to git
4. Starting sessions by reading CURRENT.md

### "There's too much documentation"

**Solution**: Start with just:
- CURRENT.md
- SESSION-CONTEXT.md
- .claude/project-context.md

Add others as you need them.

### "Claude isn't following my coding standards"

**Solution**:
1. Make sure .claude/coding-standards.md is specific (not vague)
2. Explicitly tell Claude: "Follow .claude/coding-standards.md"
3. Provide examples in the standards file
4. Give feedback when Claude deviates

### "My user stories don't match reality"

**Solution**: User stories evolve!
- Mark stories as ✅ Done or 🚧 In Progress
- Update acceptance criteria as you learn
- Don't be afraid to split or merge stories
- Review and refine during sprint planning

---

## Example Workflow

Here's a complete workflow example:

**Monday Morning - Sprint Start**

```bash
# 1. Review and update CURRENT.md
vim CURRENT.md
# Set sprint goal: "Implement calendar view (JTBD-1)"
# List priorities: US-1.1, US-1.2, US-1.3

# 2. Create GitHub issue from template
# Title: "[FEATURE] Calendar View Component"
# Link to US-1.1

# 3. Start Claude Code session
claude-code
> "Read CURRENT.md. Let's start implementing US-1.1. 
First read .claude/coding-standards.md and docs/requirements/user-stories.md"
```

**During Week - Daily Work**

```bash
# Each day:
# 1. Start with context
> "Read SESSION-CONTEXT.md. Continue where we left off."

# 2. Work on features
# 3. Create ADRs for decisions
# 4. Update issues with progress

# End of day:
> "Help me update SESSION-CONTEXT.md with today's progress"
```

**Friday Afternoon - Sprint End**

```bash
# 1. Update CURRENT.md
# Mark completed work, set next week's priorities

# 2. Update user stories
# Mark US-1.1 as ✅ Done
# Update US-1.2 status to 🚧 In Progress

# 3. Commit everything
git add .
git commit -m "docs: end of sprint 3, calendar view complete"

# 4. Plan next sprint in CURRENT.md
```

---

## Customization Ideas

### For Larger Teams

Add to CURRENT.md:
- Team member assignments
- Pull request links
- Daily standup notes

### For Solo Projects

Simplify:
- Skip formal sprint planning
- Combine CURRENT.md and SESSION-CONTEXT.md
- Lighter-weight ADRs

### For Open Source

Add:
- CONTRIBUTING.md (how others can contribute)
- ROADMAP.md (public feature roadmap)
- More detailed README with setup instructions

---

## Resources

- [Jobs-to-be-Done Framework](https://jtbd.info/)
- [User Story Mapping](https://www.jpattonassociates.com/user-story-mapping/)
- [Architecture Decision Records](https://adr.github.io/)
- [GitHub Issues Best Practices](https://docs.github.com/en/issues)
- [Agile Product Management](https://www.scrum.org/resources/what-is-a-product-backlog)

---

## Getting Help

If you're stuck:

1. **Ask Claude**: "How should I use [template]?"
2. **Review Examples**: Look at the example ADR (001-use-nextjs.md)
3. **Start Simple**: Use just CURRENT.md and SESSION-CONTEXT.md first
4. **Iterate**: Add complexity only when you need it

---

**Remember**: These templates are tools to help you, not burdens. Use what helps, skip what doesn't. The goal is to maintain continuity and make your future self's life easier!

Happy coding! 🚀
