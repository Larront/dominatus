/* Main app shell */
const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
	theme: 'amber',
	accent: '__theme__',
	motion: true,
	density: 'regular'
}; /*EDITMODE-END*/

const THEME_ACCENTS = {
	amber: '#ffb000',
	phosphor: '#46e08a',
	blood: '#e2483d'
};

function App() {
	const data = window.CAMPAIGN;
	const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
	const [selectedId, setSelectedId] = useState(null);
	const [modal, setModal] = useState(null); // 'report' | 'rules' | 'account'
	const [reportPlanet, setReportPlanet] = useState(null);

	const selected = data.planets.find((p) => p.id === selectedId);
	const anyOverlay = !!selected || !!modal;

	// accent override
	const accentStyle = t.accent && t.accent !== '__theme__' ? { '--accent': t.accent } : {};

	const openReport = (planet) => {
		setReportPlanet(planet || null);
		setSelectedId(null);
		setModal('report');
	};

	return (
		<div className="app" data-theme={t.theme} style={accentStyle}>
			<header className="topbar">
				<div className="brand">
					<span className="brand-mark">
						<Icon.Sigil />
					</span>
					<span className="brand-text">
						<span className="brand-sys">{data.subtitle}</span>
						<span className="brand-sub">{data.name} System Theatre</span>
					</span>
				</div>
				<div className="topbar-spacer" />
				<div className="cycle-pill">
					<span className="cycle-dot" />
					Cycle <b>0{data.cycle}</b> · {data.cycleName} · {data.cycleDeadline}
				</div>
				<div className="topbar-actions">
					<button className="btn" onClick={() => setModal('rules')}>
						<Icon.Rules />
						<span className="btn-label-hide">Rules</span>
					</button>
					<button className="btn" onClick={() => setModal('account')}>
						<Icon.User />
						<span className="btn-label-hide">Account</span>
					</button>
					<button className="btn btn-primary" onClick={() => openReport(null)}>
						<Icon.Report />
						<span className="btn-label-hide">Battle Report</span>
					</button>
				</div>
			</header>

			<OrbitalMap
				data={data}
				moving={t.motion}
				dimmed={anyOverlay}
				selectedId={selectedId}
				onSelect={setSelectedId}
			/>

			{selected && (
				<PlanetDetail
					planet={selected}
					data={data}
					onClose={() => setSelectedId(null)}
					onReport={openReport}
				/>
			)}

			{modal === 'report' && (
				<BattleReportModal data={data} presetPlanet={reportPlanet} onClose={() => setModal(null)} />
			)}
			{modal === 'rules' && <RulesModal data={data} onClose={() => setModal(null)} />}
			{modal === 'account' && <AccountModal data={data} onClose={() => setModal(null)} />}

			<TweaksPanel title="Tweaks">
				<TweakSection label="Visual Theme" />
				<TweakSelect
					label="Theme"
					value={t.theme}
					options={[
						{ value: 'amber', label: 'Amber Cogitator' },
						{ value: 'phosphor', label: 'Phosphor (green)' },
						{ value: 'blood', label: 'Blood Pact (red)' }
					]}
					onChange={(v) => setTweak({ theme: v, accent: '__theme__' })}
				/>
				<TweakColor
					label="Accent"
					value={t.accent === '__theme__' ? THEME_ACCENTS[t.theme] : t.accent}
					options={['#ffb000', '#46e08a', '#e2483d', '#57d6ff', '#d8d2c0', '#b48cff']}
					onChange={(v) => setTweak('accent', v)}
				/>
				<TweakSection label="Cogitator" />
				<TweakToggle
					label="Orbital drift"
					value={t.motion}
					onChange={(v) => setTweak('motion', v)}
				/>
			</TweaksPanel>
		</div>
	);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
