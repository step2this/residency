import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { type WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET environment variable');
  }

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook signature
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle the webhook events
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get primary email
    const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

    if (!primaryEmail) {
      return new Response('Error: No primary email found', { status: 400 });
    }

    // Insert user into database
    await db.insert(users).values({
      id,
      email: primaryEmail.email_address,
      firstName: first_name ?? null,
      lastName: last_name ?? null,
    });

    console.log(`User created: ${id}`);
  } else if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get primary email
    const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

    if (!primaryEmail) {
      return new Response('Error: No primary email found', { status: 400 });
    }

    // Update user in database
    await db
      .update(users)
      .set({
        email: primaryEmail.email_address,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    console.log(`User updated: ${id}`);
  } else if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (!id) {
      return new Response('Error: No user ID provided', { status: 400 });
    }

    // Delete user from database (cascade will handle related records)
    await db.delete(users).where(eq(users.id, id));

    console.log(`User deleted: ${id}`);
  }

  return new Response('Webhook processed successfully', { status: 200 });
}
