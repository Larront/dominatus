/// <reference types="bun" />
// The app runs on the Bun runtime (it uses `bun:sqlite`). This pulls in Bun's ambient types
// (incl. the `bun:sqlite` module) for svelte-check. Run dev/build with the Bun runtime:
// `bun --bun run dev` / `bun --bun run build` — plain `bun run` uses Node on Windows and 500s.
import type { User, Session } from 'better-auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
