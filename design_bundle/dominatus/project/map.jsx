/* Orbital map — system overview */
const { useState, useEffect, useMemo, useRef } = React;

function Starfield() {
	const stars = useMemo(() => {
		const arr = [];
		for (let i = 0; i < 140; i++) {
			const s = Math.random() < 0.85 ? 1 : 2;
			arr.push({
				x: Math.random() * 100,
				y: Math.random() * 100,
				s,
				tw: (2.5 + Math.random() * 5).toFixed(1),
				delay: (Math.random() * 5).toFixed(1)
			});
		}
		return arr;
	}, []);
	return (
		<div className="starfield">
			{stars.map((st, i) => (
				<span
					key={i}
					className="star"
					style={{
						left: st.x + '%',
						top: st.y + '%',
						width: st.s + 'px',
						height: st.s + 'px',
						'--tw': st.tw + 's',
						animationDelay: st.delay + 's'
					}}
				/>
			))}
		</div>
	);
}

function Planet({ p, factions, moving, paused, onSelect }) {
	const f = factions[p.owner];
	const fcol = p.contested ? '#ffce54' : f.color;
	const diameter = p.orbit * 100; // % of system box -> orbiter is this wide
	const delay = -(p.angle / 360) * p.dur; // start each planet at its own angle
	const canvasRef = useRef(null);
	useEffect(() => {
		if (!canvasRef.current || !window.PixelPlanet) return;
		const planet = new window.PixelPlanet(canvasRef.current, p.render, { resolution: 100 });
		return () => planet.dispose();
	}, []);
	return (
		<div
			className={'orbiter' + (moving ? ' moving' : '') + (paused ? ' paused' : '')}
			style={{
				width: diameter + '%',
				height: diameter + '%',
				'--dur': p.dur + 's',
				...(moving
					? { animationDelay: delay + 's' }
					: { transform: `translate(-50%,-50%) rotate(${p.angle}deg)` })
			}}
		>
			<div
				className="planet-anchor"
				style={
					moving
						? { animationDelay: delay + 's' }
						: { transform: `translate(-50%,-50%) rotate(${-p.angle}deg)` }
				}
			>
				<button
					className={'planet' + (p.contested ? ' contested' : '')}
					style={{ '--pcol': p.biome, '--fcol': fcol, '--fcol-soft': fcol + '55' }}
					onClick={() => onSelect(p.id)}
					aria-label={p.name}
				>
					<canvas
						ref={canvasRef}
						className="planet-canvas"
						style={{ width: p.size + 'px', height: p.size + 'px' }}
					></canvas>
					<span className="planet-tag">
						<span className="planet-name">{p.name}</span>
						{p.contested ? (
							<span className="contested-flag">◈ Contested</span>
						) : (
							<span className="planet-owner">
								<span className="owner-dot" />
								{f.short}
							</span>
						)}
					</span>
				</button>
			</div>
		</div>
	);
}

function Legend({ standings }) {
	const [open, setOpen] = useState(true);
	return (
		<div className={'legend' + (open ? '' : ' collapsed')}>
			<button className="legend-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
				<span className="legend-title">Warband Standings</span>
				<span className="legend-chev">
					<Icon.Chevron />
				</span>
			</button>
			{open && (
				<div className="legend-body">
					<div className="legend-cols">
						<span>Warband</span>
						<span>Worlds</span>
					</div>
					{standings.map((f) => (
						<div className="standing-row" key={f.id}>
							<span className="standing-swatch" style={{ background: f.color, color: f.color }} />
							<span className={'standing-name' + (f.you ? ' you' : '')}>{f.name}</span>
							<span className="standing-count">{f.held}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function Sun({ name }) {
	const ref = useRef(null);
	useEffect(() => {
		if (!ref.current || !window.PixelPlanet) return;
		const s = new window.PixelPlanet(ref.current, 'star', { resolution: 200 });
		return () => s.dispose();
	}, []);
	return (
		<React.Fragment>
			<canvas ref={ref} className="sun-canvas"></canvas>
			<div className="sun-label">{name} ★ Primary</div>
		</React.Fragment>
	);
}

function OrbitalMap({ data, moving, dimmed, selectedId, onSelect }) {
	const [hover, setHover] = useState(false);
	const paused = hover || dimmed;
	// orbit ring sizes
	return (
		<div className="stage">
			<div
				className={'system' + (dimmed ? ' dimmed' : '')}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			>
				{data.planets.map((p) => (
					<div
						key={'ring-' + p.id}
						className={'orbit-ring' + (selectedId === p.id ? ' active-ring' : '')}
						style={{ width: p.orbit * 100 + '%', height: p.orbit * 100 + '%' }}
					/>
				))}
				<div className="scanner" />
				<Sun name={data.name} />
				{data.planets.map((p) => (
					<Planet
						key={p.id}
						p={p}
						factions={data.factions}
						moving={moving}
						paused={paused}
						onSelect={onSelect}
					/>
				))}
			</div>
			<Legend standings={data.standings} />
			<div className="map-hint">
				<Icon.Crosshair style={{ width: 13, height: 13 }} /> Select a world for intel
			</div>
		</div>
	);
}

window.OrbitalMap = OrbitalMap;
window.Starfield = Starfield;
