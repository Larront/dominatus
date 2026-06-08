/* Modals: Battle Report (multi-step), Rules, Account */
const { useState } = React;

function ModalShell({ kicker, title, icon, onClose, children, foot, wide }) {
	return (
		<div
			className="modal-wrap"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className={'modal' + (wide ? ' wide' : '')}>
				<span className="modal-corner mc-tl" />
				<span className="modal-corner mc-tr" />
				<span className="modal-corner mc-bl" />
				<span className="modal-corner mc-br" />
				<div className="modal-head">
					<div className="brand-mark" style={{ width: 34, height: 34 }}>
						{icon}
					</div>
					<div className="mh-text">
						<div className="modal-kicker">{kicker}</div>
						<div className="modal-title">{title}</div>
					</div>
					<button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
						<Icon.Close />
					</button>
				</div>
				<div className="modal-body">{children}</div>
				{foot && <div className="modal-foot">{foot}</div>}
			</div>
		</div>
	);
}

/* ---------------- Battle Report flow ---------------- */
function BattleReportModal({ data, presetPlanet, onClose }) {
	const factionList = Object.values(data.factions).filter((f) => f.id !== 'none');
	const [step, setStep] = useState(0);
	const [form, setForm] = useState({
		planet: presetPlanet ? presetPlanet.id : '',
		attacker: 'wardens',
		defender: '',
		size: '2000',
		result: '',
		vpA: '',
		vpB: '',
		loc: '',
		summary: ''
	});
	const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
	const TOTAL = 3;

	const canNext = () => {
		if (step === 0)
			return form.planet && form.attacker && form.defender && form.attacker !== form.defender;
		if (step === 1) return form.result && form.size;
		return true;
	};

	const planet = data.planets.find((p) => p.id === form.planet);

	return (
		<ModalShell
			kicker={'Cycle 0' + data.cycle + ' · ' + data.cycleName}
			title={step === 3 ? 'Report Filed' : 'Submit Battle Report'}
			icon={<Icon.Report />}
			onClose={onClose}
			foot={
				step === 3 ? (
					<React.Fragment>
						<span className="step-count">Ledger updated</span>
						<button className="btn btn-primary" onClick={onClose}>
							Return to system <Icon.Arrow />
						</button>
					</React.Fragment>
				) : (
					<React.Fragment>
						<div style={{ flex: 1 }}>
							<div className="step-count" style={{ marginBottom: 7 }}>
								Step {step + 1} of {TOTAL}
							</div>
							<div className="steps">
								{[0, 1, 2].map((s) => (
									<span
										key={s}
										className={'step-dot' + (s < step ? ' done' : s === step ? ' cur' : '')}
									/>
								))}
							</div>
						</div>
						{step > 0 && (
							<button className="btn" onClick={() => setStep(step - 1)}>
								<Icon.Back /> Back
							</button>
						)}
						{step < 2 ? (
							<button
								className="btn btn-primary"
								disabled={!canNext()}
								style={!canNext() ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
								onClick={() => canNext() && setStep(step + 1)}
							>
								Continue <Icon.Arrow />
							</button>
						) : (
							<button className="btn btn-primary" onClick={() => setStep(3)}>
								<Icon.Check /> File report
							</button>
						)}
					</React.Fragment>
				)
			}
		>
			{step === 0 && (
				<div>
					<div className="field">
						<label className="field-label">Contested World</label>
						<select
							className="select"
							value={form.planet}
							onChange={(e) => set('planet', e.target.value)}
						>
							<option value="">Select a planet…</option>
							{data.planets.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name} — {p.type}
								</option>
							))}
						</select>
					</div>
					<div className="field">
						<label className="field-label">Attacking Warband</label>
						<div className="chip-row">
							{factionList.map((f) => (
								<button
									key={f.id}
									className={'chip' + (form.attacker === f.id ? ' sel' : '')}
									style={{ '--chipcol': f.color }}
									onClick={() => set('attacker', f.id)}
								>
									<span className="dot" style={{ background: f.color }} />
									{f.name}
								</button>
							))}
						</div>
					</div>
					<div className="field" style={{ marginBottom: 0 }}>
						<label className="field-label">Defending Warband</label>
						<div className="chip-row">
							{factionList
								.filter((f) => f.id !== form.attacker)
								.map((f) => (
									<button
										key={f.id}
										className={'chip' + (form.defender === f.id ? ' sel' : '')}
										style={{ '--chipcol': f.color }}
										onClick={() => set('defender', f.id)}
									>
										<span className="dot" style={{ background: f.color }} />
										{f.name}
									</button>
								))}
						</div>
					</div>
				</div>
			)}

			{step === 1 && (
				<div>
					<div className="field">
						<label className="field-label">Engagement Size</label>
						<div className="chip-row">
							{[
								['1000', 'Skirmish'],
								['1500', 'Battle'],
								['2000', 'Onslaught'],
								['2500', 'Cataclysm']
							].map(([v, l]) => (
								<button
									key={v}
									className={'chip' + (form.size === v ? ' sel' : '')}
									onClick={() => set('size', v)}
								>
									{v} pts · {l}
								</button>
							))}
						</div>
					</div>
					<div className="field">
						<label className="field-label">Outcome</label>
						<div className="chip-row">
							{[
								['attacker', 'Attacker won'],
								['defender', 'Defender held'],
								['contested', 'Stalemate']
							].map(([v, l]) => (
								<button
									key={v}
									className={'chip' + (form.result === v ? ' sel' : '')}
									style={{
										'--chipcol':
											v === 'attacker' ? '#ff8a6a' : v === 'defender' ? '#6ad6ff' : '#ffce54'
									}}
									onClick={() => set('result', v)}
								>
									{l}
								</button>
							))}
						</div>
					</div>
					<div className="field-row">
						<div className="field">
							<label className="field-label">Attacker Victory Points</label>
							<input
								className="input"
								type="number"
								min="0"
								placeholder="e.g. 17"
								value={form.vpA}
								onChange={(e) => set('vpA', e.target.value)}
							/>
						</div>
						<div className="field">
							<label className="field-label">Defender Victory Points</label>
							<input
								className="input"
								type="number"
								min="0"
								placeholder="e.g. 12"
								value={form.vpB}
								onChange={(e) => set('vpB', e.target.value)}
							/>
						</div>
					</div>
				</div>
			)}

			{step === 2 && (
				<div>
					<div className="field">
						<label className="field-label">Battle Location</label>
						<input
							className="input"
							placeholder={planet ? 'e.g. Spire Primus, ' + planet.name : 'Theatre / objective'}
							value={form.loc}
							onChange={(e) => set('loc', e.target.value)}
						/>
					</div>
					<div className="field" style={{ marginBottom: 18 }}>
						<label className="field-label">Battle Narrative</label>
						<textarea
							className="textarea"
							placeholder="Recount the engagement for the campaign ledger…"
							value={form.summary}
							onChange={(e) => set('summary', e.target.value)}
						/>
					</div>
					<div className="stat-grid">
						<div className="stat-cell">
							<div className="k">World</div>
							<div className="v">{planet ? planet.name : '—'}</div>
						</div>
						<div className="stat-cell">
							<div className="k">Engagement</div>
							<div className="v">{form.size} pts</div>
						</div>
						<div className="stat-cell">
							<div className="k">Attacker</div>
							<div className="v" style={{ color: data.factions[form.attacker]?.color }}>
								{data.factions[form.attacker]?.name}
							</div>
						</div>
						<div className="stat-cell">
							<div className="k">Defender</div>
							<div className="v" style={{ color: data.factions[form.defender]?.color }}>
								{data.factions[form.defender]?.name || '—'}
							</div>
						</div>
					</div>
				</div>
			)}

			{step === 3 && (
				<div>
					<div className="success-banner">
						<Icon.Check className="sb-icon" style={{ width: 30, height: 30 }} />
						<div>
							<div className="sb-title">Battle report logged</div>
							<div className="sb-sub">
								{planet ? planet.name : 'The world'} control will recalculate at the close of Cycle
								0{data.cycle}.
							</div>
						</div>
					</div>
					<p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 16 }}>
						Your opponent has been notified to confirm the result. Once both commanders ratify the
						report, the shift in control becomes official across the Vorhast theatre.
					</p>
				</div>
			)}
		</ModalShell>
	);
}

/* ---------------- Rules ---------------- */
function RulesModal({ data, onClose }) {
	const [active, setActive] = useState('01');
	return (
		<ModalShell
			kicker="Campaign Charter"
			title="Rules of the Vorhast Conflict"
			icon={<Icon.Rules />}
			onClose={onClose}
			wide
			foot={
				<React.Fragment>
					<span className="step-count">Arbiter: Lord-Marshal Caine</span>
					<button className="btn btn-primary" onClick={onClose}>
						Understood
					</button>
				</React.Fragment>
			}
		>
			<div className="rules-toc">
				{data.rules.map((r) => (
					<button
						key={r.n}
						className={'chip' + (active === r.n ? ' sel' : '')}
						onClick={() => {
							setActive(r.n);
							const el = document.getElementById('rule-' + r.n);
							if (el) el.parentElement.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
						}}
					>
						{r.n} · {r.title}
					</button>
				))}
			</div>
			{data.rules.map((r) => (
				<div className="rule-block" id={'rule-' + r.n} key={r.n}>
					<h3>
						<span className="rn">{r.n}</span>
						{r.title}
					</h3>
					<p>{r.body}</p>
					<ul>
						{r.points.map((pt, i) => (
							<li key={i}>{pt}</li>
						))}
					</ul>
				</div>
			))}
		</ModalShell>
	);
}

/* ---------------- Account ---------------- */
function AccountModal({ data, onClose }) {
	const p = data.player;
	const f = data.factions[p.faction];
	return (
		<ModalShell
			kicker="Commander Dossier"
			title={p.commander}
			icon={<Icon.User />}
			onClose={onClose}
			foot={
				<React.Fragment>
					<span className="step-count">{p.warband}</span>
					<button className="btn btn-primary" onClick={onClose}>
						Close dossier
					</button>
				</React.Fragment>
			}
		>
			<div className="account-head">
				<div className="crest" style={{ '--crestcol': f.color }}>
					{f.short}
				</div>
				<div>
					<div className="modal-kicker" style={{ color: f.color }}>
						{f.name}
					</div>
					<div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--text)' }}>
						{p.warband}
					</div>
				</div>
			</div>
			<div className="stat-grid" style={{ marginBottom: 24 }}>
				<div className="stat-cell">
					<div className="k">Campaign Points</div>
					<div className="v accent">{p.points}</div>
				</div>
				<div className="stat-cell">
					<div className="k">Battle Record</div>
					<div className="v">
						{p.record.wins}–{p.record.losses}–{p.record.draws}
					</div>
				</div>
				<div className="stat-cell">
					<div className="k">Worlds Held</div>
					<div className="v">{data.standings.find((s) => s.id === p.faction)?.held}</div>
				</div>
				<div className="stat-cell">
					<div className="k">Worlds Contested</div>
					<div className="v">{data.standings.find((s) => s.id === p.faction)?.contesting}</div>
				</div>
			</div>
			<div className="section-label" style={{ marginBottom: 12 }}>
				Registered Detachments
			</div>
			{p.roster.map((r, i) => (
				<div className="roster-row" key={i}>
					<span className="rname">{r.name}</span>
					<span className="rmeta">{r.meta}</span>
				</div>
			))}
		</ModalShell>
	);
}

window.BattleReportModal = BattleReportModal;
window.RulesModal = RulesModal;
window.AccountModal = AccountModal;
