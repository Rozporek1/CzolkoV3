import { call } from './lib';
import { Avatar, Toggle } from './ui';

const TURN_OPTIONS = [[0, 'No timer'], [30, '30 seconds'], [60, '1 minute'], [90, '90 seconds'], [120, '2 minutes'], [180, '3 minutes'], [300, '5 minutes']];

export default function Lobby({ s, isHost, notify, sets, openSets }) {
  const st = s.settings;
  const update = (patch) => call('settings:update', { settings: { ...st, ...patch }, customSets: sets }).then((r) => !r.ok && notify(r.error));
  const toggleIn = (key, id) => update({ [key]: st[key].includes(id) ? st[key].filter((x) => x !== id) : [...st[key], id] });
  const start = () => call('game:start').then((r) => !r.ok && notify(r.error));
  const invite = `${location.origin}/?room=${s.code}`;
  const copy = (t, m) => { navigator.clipboard?.writeText(t); notify(m); };
  const ro = !isHost;

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 animate-slideUp">
      <div className="space-y-6">
        <div className="card text-center">
          <div className="text-sm text-slate-400">Room code</div>
          <div className="font-mono text-6xl font-bold tracking-[0.25em] my-2 bg-gradient-to-r from-fuchsia-300 to-cyan-200 bg-clip-text text-transparent">{s.code}</div>
          <div className="flex gap-2 justify-center">
            <button className="btn" onClick={() => copy(s.code, 'Code copied!')}>📋 Copy code</button>
            <button className="btn" onClick={() => copy(invite, 'Invite link copied!')}>🔗 Copy invite link</button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-2xl font-bold">Players</h2>
            <span className="text-slate-400 text-sm">{s.players.length} / {st.maxPlayers}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {s.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl p-3 bg-black/20 border animate-pop" style={{ borderColor: p.color + '66' }}>
                <Avatar p={p} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.name} {p.id === s.you && <span className="text-xs text-slate-400">(you)</span>}</div>
                  <div className="text-xs text-slate-400">{p.id === s.hostId ? '👑 Host' : 'Player'} · <span className={p.connected ? 'text-emerald-400' : 'text-amber-400'}>{p.connected ? 'online' : 'offline'}</span></div>
                </div>
                {isHost && p.id !== s.you && <button className="btn !px-2.5 !py-1 text-xs btn-danger" onClick={() => call('room:kick', { id: p.id })}>Remove</button>}
              </div>
            ))}
          </div>
          {s.players.length < 2 && <p className="mt-4 text-sm text-slate-400">Share the code above — you need at least 2 players.</p>}
        </div>

        {s.history.length > 0 && (
          <div className="card">
            <h3 className="text-xl font-bold mb-3">🏆 Game history</h3>
            <div className="space-y-2">
              {[...s.history].reverse().map((h) => (
                <div key={h.n} className="flex justify-between text-sm rounded-xl bg-black/20 px-3 py-2">
                  <span>Game {h.n} · winner <b>{h.winner}</b></span>
                  <span className="text-slate-400">{h.standings.map((x) => `${x.name} ${x.score}`).join(' · ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-6 h-fit">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Game settings</h2>
          {ro && <span className="text-xs text-slate-400">Only the host can change these</span>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Rounds">
            <select className="input" disabled={ro} value={st.rounds} onChange={(e) => update({ rounds: +e.target.value })}>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </Field>
          <Field label="Time per action">
            <select className="input" disabled={ro} value={st.turnSeconds} onChange={(e) => update({ turnSeconds: +e.target.value })}>{TURN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Max players">
            <select className="input" disabled={ro} value={st.maxPlayers} onChange={(e) => update({ maxPlayers: +e.target.value })}>{Array.from({ length: 9 }, (_, i) => i + 2).map((n) => <option key={n} value={n} disabled={n < s.players.length}>{n}</option>)}</select>
          </Field>
        </div>

        <div>
          <div className="text-sm text-slate-400 mb-2">Categories (pick one or more)</div>
          <div className="flex flex-wrap gap-2">
            {s.cats.map((c) => (
              <button key={c.id} disabled={ro} className={`chip ${st.categories.includes(c.id) ? 'chip-on' : ''}`} onClick={() => toggleIn('categories', c.id)}>{c.emoji} {c.name}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Custom word sets {isHost ? '(yours)' : '(host’s)'}</div>
            {isHost && <button className="text-sm text-fuchsia-300 hover:underline" onClick={openSets}>Manage…</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.customSummary.length === 0 && <span className="text-sm text-slate-500">{isHost ? 'None yet — create one with “Word sets”.' : 'No custom sets.'}</span>}
            {s.customSummary.map((c) => (
              <button key={c.id} disabled={ro} className={`chip ${st.customIds.includes(c.id) ? 'chip-on' : ''}`} onClick={() => toggleIn('customIds', c.id)}>✏️ {c.name} · {c.count}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-black/20 px-4 py-2 divide-y divide-white/5">
          <Toggle disabled={ro} on={st.allowSkip} onChange={(v) => update({ allowSkip: v })} label="Allow skipping a question or a guess" />
          <Toggle disabled={ro} on={st.showCategory} onChange={(v) => update({ showCategory: v })} label="Show category hint to the guesser" />
        </div>

        {isHost
          ? <button className="btn btn-primary w-full text-xl py-4" disabled={s.players.length < 2} onClick={start}>🚀 Start game</button>
          : <div className="text-center text-slate-400 py-3">Waiting for the host to start…</div>}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => <label className="block"><span className="text-sm text-slate-400">{label}</span><div className="mt-1">{children}</div></label>;
