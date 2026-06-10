import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

// Liveness + readiness probe for the container/tunnel. Pings the DB so a
// broken volume mount surfaces as an unhealthy container, not a 200.
export const GET = async () => {
	try {
		db.run(sql`select 1`);
		return json({ status: 'ok' });
	} catch {
		return json({ status: 'error' }, { status: 503 });
	}
};
