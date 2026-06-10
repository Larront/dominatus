// Applies pending Drizzle migrations against DATABASE_URL, then exits.
// Run on container startup before the server boots. Uses the programmatic
// migrator (drizzle-orm, a prod dep) so drizzle-kit isn't needed at runtime.
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const client = new Database(url);
client.pragma('journal_mode = WAL');
migrate(drizzle(client), { migrationsFolder: './drizzle' });
client.close();

console.log('Migrations applied.');
