# Current Focus

**Last Updated**: 2025-12-24

---

## Active Task

<!-- Claude reads this first for quick context restoration -->
**Working on**: Ready for new work (US-002 or new feature)
**Key files**: None currently active
**Blockers**: None

---

## Quick Context

<!-- Essential context for Claude to pick up where we left off -->

### Session State
- **Last action**: Completed US-001 (Rotation Patterns), fixed schedule visibility bug
- **Next step**: Manual testing of Schedule-X calendar in browser, then US-002 or new feature
- **Tests passing**: 283 tests

### Relevant Skill Files
<!-- Update this based on current work -->
- `skills/MVP_SCOPE.md` - Always check to avoid over-engineering
- `skills/CODING_PRINCIPLES.md` - SOLID/DRY/YAGNI patterns

---

## Product Context

**Related User Stories**: US-001 (see `docs/user-stories/US-001-rotation-patterns.md`)

### Key Product Decisions This Sprint
- **Preset patterns first, custom builder later**: 5 preset templates (2-2-3, 2-2-5-5, 3-4-4-3, alternating-weeks, every-weekend)
- **Query-time event generation**: Calculate calendar events on-demand from rotation patterns
- **Calendar days only**: No pickup/dropoff times for MVP
- **Single rotation per family**: MVP prevents overlapping rotations
- **Soft delete only**: Rotations deactivated rather than hard deleted

---

## Technical Context

### Architecture Decisions
- Query-time calendar event generation vs materialization (see US-001)
- Temporal API for date handling (Schedule-X requirement)
- Overlap detection for date ranges in schedule.list

### Key Files Reference
| Domain | Files |
|--------|-------|
| Rotation patterns | `src/lib/db/schema.ts`, `src/lib/trpc/routers/rotation.ts`, `src/lib/utils/rotation-utils.ts` |
| Schedule events | `src/lib/trpc/routers/schedule.ts`, `src/lib/utils/date-range-utils.ts` |
| Calendar UI | `src/components/calendar/schedule-calendar.tsx` |
| Forms | `src/components/forms/rotation-form.tsx` |

---

## Recently Completed

### This Week (2025-12-09)
- **US-001: Create Rotation Patterns (MVP)** - COMPLETE
  - Database schema with rotation_patterns table
  - tRPC router with 4 procedures
  - Calendar integration (purple rotation events vs blue manual events)
  - 42 tests (18 utils + 19 router + 5 schema)

- **Schedule-X Temporal API Migration** - COMPLETE
  - Switched to temporal-polyfill (20KB)
  - All events use Temporal API objects

- **Date Utilities Migration** - COMPLETE
  - Fixed Invalid Date bug from Date.setMonth() mutations
  - 22 unit tests for date utilities

- **Bug Fix: Schedule event visibility** - COMPLETE
  - Fixed overlap logic in schedule.list query
  - 15 unit tests + 6 integration tests

- **Security: esbuild vulnerability** - COMPLETE
  - Upgraded to esbuild 0.27.1

---

## Next Session TODO

### High Priority
1. **Manual Testing**: Test Schedule-X calendar in browser to verify Invalid Date bug fix
2. **Database Migration**: Run `pnpm db:push` to apply rotation_patterns schema

### Future Work
3. **US-002**: Edit existing rotation patterns
4. **US-003**: Custom pattern builder

---

## Notes for Future Sessions

<!-- Gotchas, learnings, or context that helps pick up work -->
- Schedule-X requires Temporal API polyfill - already configured in `src/lib/polyfills/temporal.ts`
- Rotation events are purple (`#8b5cf6`), manual events are blue (`#3b82f6`)
- Date filtering uses overlap logic, not containment - see `date-range-utils.ts`
- ESLint 9 uses flat config format - see `eslint.config.js`
