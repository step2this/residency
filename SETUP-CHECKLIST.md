# Setup Checklist

Use this checklist to get your context management system up and running.

## Phase 1: Initial Setup (Day 1)

### Core Files
- [ ] Copy all template files to your project root
- [ ] Commit templates to git
- [ ] Update `CURRENT.md` with current sprint information
- [ ] Customize `.claude/project-context.md` with your project details
- [ ] Review `.claude/coding-standards.md` and adjust to your preferences

### GitHub Setup
- [ ] Commit `.github/ISSUE_TEMPLATE/` files
- [ ] Create your first issue using a template to test it
- [ ] Add labels to your repo: `mvp`, `phase-2`, `bug`, `enhancement`, `technical-debt`

## Phase 2: Requirements Documentation (Week 1)

### Product Requirements
- [ ] Read through `docs/requirements/product-vision.md` template
- [ ] Fill in your product vision statement
- [ ] Define your target user personas
- [ ] List MVP features
- [ ] Document success metrics

### Jobs-to-be-Done
- [ ] Review JTBD format in `docs/requirements/jobs-to-be-done.md`
- [ ] Identify 3-5 core JTBDs for your MVP
- [ ] Write them in "When/I can/So that" format
- [ ] Map JTBDs to user stories

### User Stories
- [ ] Review user story format in `docs/requirements/user-stories.md`
- [ ] Write user stories for MVP features
- [ ] Add acceptance criteria to each story
- [ ] Assign status indicators (🎯 MVP, 🚀 Phase 2, etc.)
- [ ] Link stories to GitHub issues

## Phase 3: Technical Documentation (Week 1-2)

### Architecture
- [ ] Review `docs/technical/architecture.md` template
- [ ] Document your system architecture
- [ ] Create/update architecture diagram
- [ ] Document your tech stack choices
- [ ] List deployment environments

### Architecture Decision Records
- [ ] Review ADR template in `docs/adr/000-template.md`
- [ ] Create your first ADR (e.g., framework choice)
- [ ] Document database choice in an ADR
- [ ] Document authentication strategy in an ADR

## Phase 4: Workflow Integration (Ongoing)

### Daily Workflow
- [ ] Start each session by reading `CURRENT.md`
- [ ] Reference relevant user stories during development
- [ ] Create GitHub issues for new work discovered
- [ ] Update `SESSION-CONTEXT.md` at end of each session

### Weekly Workflow
- [ ] Review and update `CURRENT.md` for new sprint
- [ ] Mark completed user stories
- [ ] Update GitHub project board
- [ ] Create ADRs for decisions made this week

### Monthly Workflow
- [ ] Review product vision - still accurate?
- [ ] Update architecture docs if system evolved
- [ ] Review and refine user stories
- [ ] Assess what's working in your workflow, adjust templates

## Phase 5: Optimization (After 1 Month)

### Review Your System
- [ ] Are the templates helping maintain context?
- [ ] Which sections do you actually use vs. ignore?
- [ ] What's missing that you need?
- [ ] What's there that you don't need?

### Customize
- [ ] Remove sections you don't use
- [ ] Add sections that would help
- [ ] Simplify where possible
- [ ] Share learnings with the team (if applicable)

## Optional Enhancements

### For Better Claude Integration
- [ ] Add custom skills to `.claude/` directory if needed
- [ ] Create project-specific prompt templates
- [ ] Document common Claude commands in your workflow

### For Team Collaboration
- [ ] Set up GitHub Projects board
- [ ] Configure GitHub Actions for CI/CD
- [ ] Add CONTRIBUTING.md for team members
- [ ] Set up pull request templates

### For Advanced Requirements Management
- [ ] Consider Linear or Notion for richer product management
- [ ] Set up bi-directional sync with GitHub
- [ ] Add roadmap visualization
- [ ] Create sprint planning templates

## Troubleshooting Checklist

If you're not seeing value:

- [ ] Are you actually reading CURRENT.md at start of sessions?
- [ ] Are you updating SESSION-CONTEXT.md at end of sessions?
- [ ] Are you being specific enough in "Next Session Priorities"?
- [ ] Have you customized templates to your needs?
- [ ] Are you referencing docs when working with Claude?

If templates feel overwhelming:

- [ ] Start with just CURRENT.md and SESSION-CONTEXT.md
- [ ] Add others only when you need them
- [ ] Simplify sections - remove what you don't use
- [ ] Focus on what helps you maintain context

## Success Indicators

You'll know the system is working when:

- ✅ You can pick up exactly where you left off in previous session
- ✅ Claude understands your project without extensive explanation
- ✅ You can find past decisions easily (in ADRs)
- ✅ You know what to work on next (CURRENT.md is clear)
- ✅ You can track progress (user stories, issues)
- ✅ You spend less time explaining context, more time coding

## Resources

- **Quick Start**: See `QUICKSTART.md` for 5-minute setup
- **Detailed Guide**: See `README-TEMPLATES.md` for comprehensive usage
- **Examples**: See `docs/adr/001-use-nextjs.md` for sample ADR

---

**Remember**: These are tools to help you, not rules to follow perfectly. Adapt them to your workflow and needs!
