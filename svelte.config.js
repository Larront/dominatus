import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-node builds a standalone server (build/index.js) for the Docker container.
		// See https://svelte.dev/docs/kit/adapter-node for more information.
		adapter: adapter(),

		// Content Security Policy — a browser-enforced allowlist that blocks injected/foreign scripts
		// (the main XSS defence, on top of Svelte's auto-escaping). SvelteKit owns this because it
		// must add a per-response nonce to its own inline boot scripts; an edge/header-only CSP can't
		// do that and would have to fall back to a weak `script-src`. NOTE: CSP is only emitted in the
		// built app (`build`/`preview`/container) — `vite dev` is exempt, so test against a prod build.
		csp: {
			directives: {
				'default-src': ['self'],
				// SvelteKit appends its nonce here automatically, so inline boot scripts run and
				// anything else inline/foreign is blocked. No 'unsafe-inline', no 'unsafe-eval'.
				'script-src': ['self'],
				// `<style>`/`<link>` elements: our own + Google Fonts' stylesheet. SvelteKit may add a
				// nonce here for its inline <style>; when it does, browsers ignore 'unsafe-inline' in
				// THIS directive — which is why the map's `style=""` attributes need style-src-attr below.
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				// The orbital map sets per-element inline style attributes (--tilt/--orbit/colours).
				// A separate attr directive keeps those working without weakening `style-src` elements.
				'style-src-attr': ['unsafe-inline'],
				'font-src': ['self', 'https://fonts.gstatic.com'],
				// 'self' assets, data: URIs (favicon), and blob: (the report scoresheet preview).
				'img-src': ['self', 'data:', 'blob:'],
				'connect-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none'],
				'form-action': ['self']
			}
		},

		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		}
	}
};

export default config;
