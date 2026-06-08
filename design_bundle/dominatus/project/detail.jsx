/* Planet detail drawer */
const { useRef, useEffect } = React;

function ControlSplit({ split, factions }) {
	const entries = Object.entries(split)
		.filter(([, v]) => v > 0)
		.sort((a, b) => b[1] - a[1]);
	return (
		<div>
			<div className="split-bar">
				{entries.map(([fid, v]) => (
					<div
						key={fid}
						className="split-seg"
						style={{ flex: v, background: factions[fid].color }}
						title={`${factions[fid].name} ${v}%`}
					/>
				))}
			</div>
			<div className="split-legend">
				{entries.map(([fid, v]) => (
					<span className="split-key" key={fid}>
						<span className="dot" style={{ background: factions[fid].color }} />
						{factions[fid].name} <b style={{ color: 'var(--text)', marginLeft: 2 }}>{v}%</b>
					</span>
				))}
			</div>
		</div>
	);
}

function Battle({ b, factions }) {
	const a = factions[b.attacker],
		d = factions[b.defender];
	const resClass =
		b.result === 'attacker'
			? 'res-attacker'
			: b.result === 'defender'
				? 'res-defender'
				: 'res-contested';
	const resLabel =
		b.result === 'attacker'
			? 'Attacker won'
			: b.result === 'defender'
				? 'Defender held'
				: 'Stalemate';
	return (
		<div className="battle">
			<div className="battle-turn">
				<div className="t-num">{b.turn}</div>
				<div className="t-lbl">Cycle</div>
			</div>
			<div className="battle-main">
				<div className="battle-head">
					<span className="vs-team">
						<span className="dot" style={{ background: a.color }} />
						{a.short}
					</span>
					<span className="vs-x">VS</span>
					<span className="vs-team">
						<span className="dot" style={{ background: d.color }} />
						{d.short}
					</span>
					<span className={'battle-result ' + resClass}>{resLabel}</span>
				</div>
				<div className="battle-sub">{b.summary}</div>
				<div className="battle-meta">
					{b.loc} · {b.points} pts · VP {b.pts_a}–{b.pts_b}
				</div>
			</div>
		</div>
	);
}

function PlanetDetail({ planet, data, onClose, onReport }) {
	const f = data.factions[planet.owner];
	const globeRef = useRef(null);
	useEffect(() => {
		if (!globeRef.current || !window.PixelPlanet) return;
		const pl = new window.PixelPlanet(globeRef.current, planet.render, { resolution: 100 });
		return () => pl.dispose();
	}, [planet.id]);
	return (
		<React.Fragment>
			<div className="scrim" onClick={onClose} />
			<aside className="drawer" role="dialog" aria-label={planet.name + ' intel'}>
				<div className="drawer-scroll">
					<div
						className="drawer-hero"
						style={{ '--fcol': f.color, '--fcol-soft': f.color + '33', '--pcol': planet.biome }}
					>
						<button
							className="btn btn-icon btn-ghost drawer-close"
							onClick={onClose}
							aria-label="Close"
						>
							<Icon.Close />
						</button>
						<div className="drawer-planet-visual">
							<canvas ref={globeRef} className="drawer-globe"></canvas>
							<div>
								<div className="drawer-kicker">
									{planet.contested ? '◈ Contested World' : 'Held by ' + f.name}
								</div>
								<h2 className="drawer-title">{planet.name}</h2>
								<div className="drawer-type">
									{planet.type} · Strategic value: {planet.value}
								</div>
							</div>
						</div>
						<p className="drawer-desc">{planet.desc}</p>
					</div>

					<div className="section" style={{ '--fcol': f.color }}>
						<div className="section-label">Theatre Control</div>
						<div className="control-meta">
							<span className="owner-big" style={{ color: f.color }}>
								{planet.contested ? 'No clear hold' : f.name}
							</span>
							<span className="owner-pct">
								{planet.split[planet.owner] || Math.max(...Object.values(planet.split))}% control
							</span>
						</div>
						<ControlSplit split={planet.split} factions={data.factions} />
					</div>

					<div className="section">
						<div className="section-label">System Intel</div>
						<div className="stat-grid">
							<div className="stat-cell">
								<div className="k">Classification</div>
								<div className="v">{planet.type}</div>
							</div>
							<div className="stat-cell">
								<div className="k">Strategic Value</div>
								<div className="v accent">{planet.value}</div>
							</div>
							<div className="stat-cell">
								<div className="k">Garrison</div>
								<div className="v">{planet.garrison}</div>
							</div>
							<div className="stat-cell">
								<div className="k">Supply Status</div>
								<div className="v">{planet.supply}</div>
							</div>
						</div>
					</div>

					<div className="section">
						<div className="section-label">Battle Record · {planet.battles.length} logged</div>
						{planet.battles.map((b, i) => (
							<Battle key={i} b={b} factions={data.factions} />
						))}
					</div>
				</div>
				<div className="drawer-foot">
					<button className="btn btn-primary" onClick={() => onReport(planet)}>
						<Icon.Report /> Submit battle report
					</button>
				</div>
			</aside>
		</React.Fragment>
	);
}

window.PlanetDetail = PlanetDetail;
