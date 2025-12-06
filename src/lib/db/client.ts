import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Create Neon connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create Drizzle instance with schema
export const db = drizzle({ client: pool, schema });

// Export types
export type Database = typeof db;
