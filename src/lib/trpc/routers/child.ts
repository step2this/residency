import { router, familyProcedure } from '../init';
import {
  createChildSchema,
  updateChildSchema,
  deleteChildSchema,
} from '@/schemas/child';
import { children, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const childRouter = router({
  // Create a new child
  create: familyProcedure
    .input(createChildSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Format date for Postgres date type (YYYY-MM-DD)
      const dateOfBirth = input.dateOfBirth.toISOString().split('T')[0] as string;

      // Create child
      const [child] = await db.insert(children).values({
        familyId,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth,
      }).returning();

      // Log child creation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'child.create',
        entityType: 'child',
        entityId: child!.id,
        newData: {
          firstName: child!.firstName,
          lastName: child!.lastName,
          dateOfBirth: child!.dateOfBirth,
        },
      });

      return child;
    }),

  // List all children in family
  list: familyProcedure.query(async ({ ctx }) => {
    const { db, familyId } = ctx;

    const familyChildren = await db.query.children.findMany({
      where: eq(children.familyId, familyId),
      orderBy: (children, { asc }) => [asc(children.firstName)],
    });

    return familyChildren;
  }),

  // Update child
  update: familyProcedure
    .input(updateChildSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get existing child
      const existingChild = await db.query.children.findFirst({
        where: eq(children.id, input.id),
      });

      if (!existingChild || existingChild.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Child not found',
        });
      }

      const oldData = {
        firstName: existingChild.firstName,
        lastName: existingChild.lastName,
        dateOfBirth: existingChild.dateOfBirth,
      };

      // Format date if provided
      const dateOfBirth = input.dateOfBirth
        ? (input.dateOfBirth.toISOString().split('T')[0] as string)
        : existingChild.dateOfBirth;

      // Update child
      const [updatedChild] = await db
        .update(children)
        .set({
          firstName: input.firstName ?? existingChild.firstName,
          lastName: input.lastName ?? existingChild.lastName,
          dateOfBirth,
          updatedAt: new Date(),
        })
        .where(eq(children.id, input.id))
        .returning();

      // Log child update
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'child.update',
        entityType: 'child',
        entityId: input.id,
        oldData,
        newData: {
          firstName: updatedChild!.firstName,
          lastName: updatedChild!.lastName,
          dateOfBirth: updatedChild!.dateOfBirth,
        },
      });

      return updatedChild;
    }),

  // Delete child
  delete: familyProcedure
    .input(deleteChildSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get child to delete
      const child = await db.query.children.findFirst({
        where: eq(children.id, input.id),
      });

      if (!child || child.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Child not found',
        });
      }

      // Log child deletion before deleting
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'child.delete',
        entityType: 'child',
        entityId: input.id,
        oldData: {
          firstName: child.firstName,
          lastName: child.lastName,
          dateOfBirth: child.dateOfBirth,
        },
        newData: null,
      });

      // Delete child (cascade will handle related records)
      await db.delete(children).where(eq(children.id, input.id));

      return { success: true };
    }),
});
