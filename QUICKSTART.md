# Quick Start Guide

Get up and running with these context management templates in 5 minutes.

## Step 1: Copy to Your Project (1 minute)

```bash
# Navigate to your project root
cd /path/to/your/project

# Copy all template files
cp -r /path/to/context-templates/* .

# Commit to git
git add .
git commit -m "Add context management templates"
```

## Step 2: Customize CURRENT.md (2 minutes)

Open `CURRENT.md` and fill in:

1. **Last Updated** date
2. **Sprint** information (number and dates)
3. **Sprint Goal** - What are you trying to accomplish this sprint?
4. **This Week's Priorities** - Your top 3 tasks
5. **Related JTBDs/User Stories** - Which requirements are you working on?

Example:
```markdown
**Last Updated**: 2024-12-08
**Sprint**: Sprint 1 (Dec 8 - Dec 22)
**Sprint Goal**: Set up project infrastructure and create basic calendar view

## This Week's Priorities
1. **Project Setup** - Issue #1: Initialize Next.js project with TypeScript
2. **Authentication** - Issue #2: Set up AWS Cognito or Clerk
3. **Database** - Issue #3: Create DynamoDB tables and schemas
```

## Step 3: Customize .claude/project-context.md (2 minutes)

Open `.claude/project-context.md` and update:

1. **Project Name** - Your app name
2. **Elevator Pitch** - One sentence description
3. **Problem Statement** - What problem you're solving
4. **Target Users** - Replace example personas with your users
5. **Technical Overview** - Your actual tech stack

Don't worry about being perfect - you can refine this over time!

## Step 4: Start Using It Today

### In Your Next Claude Code Session:

```bash
# Start session
"Read CURRENT.md and .claude/project-context.md. Let's set up the Next.js project 
following the coding standards in .claude/coding-standards.md"
```

### At End of Session:

```bash
"Help me update SESSION-CONTEXT.md with what we accomplished today:
- Initialized Next.js 15 project
- Set up Tailwind CSS
- Created basic directory structure
Next session: Set up authentication"
```

That's it! You're ready to maintain context across sessions.

## Quick Reference

**Daily Workflow**:
1. Start: Read CURRENT.md
2. Work: Reference .claude/coding-standards.md
3. End: Update SESSION-CONTEXT.md

**Weekly Tasks**:
- Update CURRENT.md with new sprint goals
- Mark completed user stories
- Create ADRs for any major decisions

**As Needed**:
- Create GitHub issues using templates
- Write ADRs for architectural decisions
- Update user stories as requirements evolve

## What to Do Next

After using the templates for a week:

1. **Review** - Are the templates helping? What's not working?
2. **Customize** - Adapt templates to your workflow
3. **Expand** - Add requirements docs (JTBDs, user stories)
4. **Share** - If working with a team, get their input

---

For detailed usage, see [README-TEMPLATES.md](./README-TEMPLATES.md)
