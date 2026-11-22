import { useMemo } from 'react';
import { call } from './lib';
import { Avatar } from './ui';

const COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee'];

export default function Results({ s, isHost, notify, onLeave }) {
  const { standings, awards, log } = s.results;
  const confetti = useMemo(() => Array.from({ length: 45 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 4, c: COLORS[i % COLORS.length] })), []);
  const podium = standings.slice(0, 3);
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  const heights = { 0: 'h-40', 1: 'h-56', 2: 'h-28' };

  return (
    <div className="space-y-6 animate-slideUp">
      {confetti.map((c, i) => <span key={i} className="confetti" style={{ left: c.left + '%', animationDelay: c.delay + 's', background: c.c }} />)}
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold">🏆 {standings[0]?.name} wins!</h1>
        <p className="text-slate-400 mt-2">Final scores after {s.settings.rounds} round{s.settings.rounds > 1 ? 's' : ''}</p>
      </div>

      <div className="flex items-end justify-center gap-4">
        {order.map((p) => {
          const place = standings.indexOf(p);
          return (
            <div key={p.id} className="text-center animate-pop">
              <Avatar p={p} size={place === 0 ? 84 : 64} />
              <div className="font-semibold mt-1">{p.name}</div>
              <div className={`mt-2 w-40 rounded-t-3xl grid place-items-center ${heights[place]}`} style={{ background: p.color + '33', border: `2px solid ${p.color}` }}>
                <div><div className="text-4xl">{['🥇', '🥈', '🥉'][place]}</div><div className="font-display text-3xl font-bold">{p.score}</div></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold mb-3">Leaderboard</h3>
          <div className="space-y-2">
            {standings.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-2">
                <span className="w-6 text-slate-400">{i + 1}</span><Avatar p={p} size={34} />
                <span className="flex-1 font-semibold truncate">{p.name}</span>
                <span className="text-xs text-slate-400">{p.solved} solved</span>
                <span className="font-display text-xl font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-3">Awards</h3>
          {awards.length === 0 && <p className="text-slate-400 text-sm">No awards this time!</p>}
          <div className="space-y-3">
            {awards.map((a) => (
              <div key={a.title} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3">
                <span className="text-3xl">{a.emoji}</span>
                <div><div className="font-semibold">{a.title}</div><div className="text-sm text-slate-400">{a.avatar} {a.name} — {a.value} {a.desc}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card max-h-96 overflow-y-auto">
          <h3 className="text-xl font-bold mb-3">All identities</h3>
          <div className="space-y-1.5 text-sm">
            {log.map((l, i) => (
              <div key={i} className="flex justify-between gap-2 rounded-xl bg-black/20 px-3 py-1.5">
                <span className="text-slate-400">R{l.round} · {l.avatar} {l.name}</span>
                <span className={l.solved ? 'text-emerald-300' : 'text-rose-300'}>{l.solved ? '✓' : '✗'} {l.word}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {isHost
          ? <button className="btn btn-primary text-lg px-8" onClick={() => call('game:rematch').then((r) => !r.ok && notify(r.error))}>🔁 Rematch</button>
          : <span className="text-slate-400 py-3">Waiting for the host to start a rematch…</span>}
        <button className="btn" onClick={onLeave}>Leave room</button>
      </div>
    </div>
  );
}
