/* Shared inline SVG icons */
const Icon = {
	Planet: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
			<circle cx="12" cy="12" r="6.5" />
			<ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-20 12 12)" />
		</svg>
	),
	Report: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
			<path d="M6 3h9l4 4v14H6z" />
			<path d="M14 3v5h5" />
			<path d="M9 13h7M9 16.5h5" />
		</svg>
	),
	Rules: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
			<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
			<path d="M5 4v13a3 3 0 0 1 3-3h10" />
		</svg>
	),
	User: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
			<circle cx="12" cy="8" r="4" />
			<path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
		</svg>
	),
	Close: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
			<path d="M6 6l12 12M18 6L6 18" />
		</svg>
	),
	Arrow: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
			<path d="M5 12h14M13 6l6 6-6 6" />
		</svg>
	),
	Back: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
			<path d="M19 12H5M11 6l-6 6 6 6" />
		</svg>
	),
	Crosshair: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
			<circle cx="12" cy="12" r="7" />
			<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
			<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	),
	Check: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
			<path d="M20 6L9 17l-5-5" />
		</svg>
	),
	Chevron: (p) => (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
			<path d="M6 9l6 6 6-6" />
		</svg>
	),
	Sigil: (p) => (
		<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
			<circle cx="20" cy="20" r="17" opacity="0.4" />
			<circle cx="20" cy="20" r="11" />
			<circle cx="20" cy="20" r="3" fill="currentColor" stroke="none" />
			<path d="M20 1v8M20 31v8M1 20h8M31 20h8" />
			<path d="M20 9 L24 20 L20 31 L16 20 Z" opacity="0.8" />
		</svg>
	)
};
window.Icon = Icon;
