# Current Focus

**Last Updated**: 2025-12-08

---

## Current Priority

- **Next**: Ready for US-002 or new feature work

---

## Active Work in Progress

| Story | Title | Status | Notes |
|-------|-------|--------|-------|
| - | - | - | Ready for new work |

---

## Product Context

**Related User Stories**: US-001 (see `docs/user-stories/US-001-rotation-patterns.md`)

**Key Product Decisions This Sprint**:
- **Preset patterns first, custom builder later**: Starting with 5 preset templates (2-2-3, 2-2-5-5, 3-4-4-3, alternating-weeks, every-weekend) to validate technical implementation before building custom pattern UI
- **Query-time event generation**: Calculate calendar events on-demand from rotation patterns rather than materializing them in database (simpler, more flexible for MVP)
- **Calendar days only**: No pickup/dropoff times for MVP - just assign full calendar days to parents
- **Single rotation per family**: MVP prevents overlapping rotations; future stories will handle transitions and multiple concurrent rotations
- **Soft delete only**: Rotations are deactivated rather than hard deleted to preserve audit trail

---

## Technical Context

**Architecture Decisions**:
- Query-time calendar event generation vs materialization (see US-001)
- Rotation pattern storage approach

**Current Tech Focus**:
- New `rotation_patterns` table with enum for pattern types
- tRPC router for rotation CRUD operations
- Utility functions for pattern-to-calendar conversion
- React form component with react-hook-form + Zod
- Schedule-X calendar integration

**Key Files Being Modified**:
- `/src/lib/db/schema.ts` - Adding rotation_patterns table and relations
- `/src/schemas/rotation.ts` - Zod validation schemas for rotation operations
- `/src/lib/trpc/routers/rotation.ts` - tRPC procedures (create, list, delete, getCalendarEvents)
- `/src/lib/utils/rotation-utils.ts` - Pattern configs and event generation logic
- `/src/components/forms/rotation-form.tsx` - UI form for creating rotations
- `/src/components/calendar/schedule-calendar.tsx` - Calendar integration

---

## Blockers & Decisions Needed

- [ ] None currently - all decisions for US-001 MVP have been made

---

## Recently Completed (Last 7 Days)

- ✅ **US-001: Create Rotation Patterns (MVP)** - COMPLETE
  - ✅ Database schema with rotation_patterns table and enum types
  - ✅ Zod validation schemas for rotation operations
  - ✅ tRPC router with 4 procedures (create, list, getCalendarEvents, delete)
  - ✅ Utility functions for pattern configs and calendar event generation
  - ✅ Rotation form component with pattern preview
  - ✅ Rotations management page with create/delete
  - ✅ Calendar integration showing rotation events (purple) vs manual events (blue)
  - ✅ All unit tests passing (42 tests: 18 utils + 19 router + 5 schema)
  - ✅ Integration tests with overlap validation
  - ✅ Code review optimizations applied (N+1 query fix, date-fns, optimistic updates)
  - ✅ TypeScript compilation clean

---

## Next Session TODO

**US-001 is complete!** Ready for next user story or feature work.

### Potential Next Steps:
1. **Manual Testing**: Test rotation patterns in development with real data
2. **Database Migration**: Run `pnpm db:push` to apply schema to Neon production database
3. **US-002**: Edit existing rotation patterns
4. **US-003**: Custom pattern builder
5. **Documentation**: Add usage guide or update README

### Key Files from US-001:
- `/src/lib/db/schema.ts` - rotation_patterns table
- `/src/lib/trpc/routers/rotation.ts` - CRUD operations
- `/src/lib/utils/rotation-utils.ts` - Pattern configs and event generation
- `/src/components/rotation/` - Rotation UI components
- `/src/app/(dashboard)/dashboard/rotations/page.tsx` - Rotations management page
