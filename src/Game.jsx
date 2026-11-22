import { useEffect, useRef, useState } from 'react';
import { call } from './lib';
import { Avatar, Timer } from './ui';

const ANS = { yes: ['✅', 'Yes'], no: ['❌', 'No'], maybe: ['🤔', 'Maybe'], idk: ['🤷', "I don't know"] };
const STEPS = [['ask', '1 · Ask your question'], ['answer', '2 · Answers'], ['guess', '3 · Make your guess']];

export default function Game({ s, isHost, notify }) {
  const turn = s.turn;
  const turnP = s.players.find((p) => p.id === turn?.playerId);
  const mine = !!turn && turn.playerId === s.you;
  const step = turn?.step;
  const locked = !!turn?.locked;
  const roundEnd = s.phase === 'roundEnd';
  const act = (ev, data) => call(ev, data).then((r) => { if (!r.ok) notify(r.error); return r; });

  const others = s.players.filter((p) => p.connected && p.id !== turn?.playerId);
  const q = s.chat.find((m) => m.id === turn?.qId);
  const answered = others.filter((o) => q?.answers?.[o.id]).length;

  let hint = '';
  if (locked) hint = 'Wrong guess — next player…';
  else if (step === 'ask') hint = mine ? 'Ask ONE yes/no question about your identity.' : `${turnP?.name} is thinking of a question…`;
  else if (step === 'answer') hint = mine ? `Waiting for answers (${answered}/${others.length})…` : `Answer ${turnP?.name}'s question (${answered}/${others.length} answered)`;
  else if (step === 'guess') hint = mine ? 'You get exactly ONE guess. Make it count!' : `${turnP?.name} is making their one guess…`;

  return (
    <div className="grid xl:grid-cols-[1fr_400px] gap-6">
      <div className="space-y-5">
        <div className="card flex items-center justify-between gap-6 animate-slideUp">
          <div className="flex items-center gap-4 min-w-0">
            {roundEnd ? <span className="text-5xl">{s.roundWinner ? '🏆' : '🏁'}</span> : turnP && <Avatar p={turnP} size={64} />}
            <div className="min-w-0">
              <div className="text-sm text-slate-400">Round {s.round} of {s.settings.rounds}{turn && ` · Turn #${turn.number}`}</div>
              <div className="font-display text-3xl font-bold truncate">
                {roundEnd ? (s.roundWinner ? `${s.roundWinner.name} wins the round! 🎉` : 'Nobody guessed it') : mine ? "It's YOUR turn" : `${turnP?.name ?? '…'}'s turn`}
              </div>
              {roundEnd ? (
                <div className="text-sm text-slate-300">{s.roundWinner ? `+${s.roundWinner.pts} points · they were ${s.roundWinner.word}` : 'Everyone is revealed.'} Next round starts shortly…</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {STEPS.map(([k, l]) => (
                      <span key={k} className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${step === k && !locked ? 'bg-fuchsia-500 border-fuchsia-300 text-white' : 'border-white/10 text-slate-500'}`}>{l}</span>
                    ))}
                  </div>
                  <div className="text-sm text-slate-300 mt-1.5">{hint}</div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {roundEnd
              ? isHost && <button className="btn btn-primary" onClick={() => act('game:continue')}>Continue ⏭️</button>
              : <Timer endsAt={turn?.endsAt} skew={s.skew} total={s.settings.turnSeconds} />}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
          {s.players.map((p) => <PlayerCard key={p.id} p={p} me={p.id === s.you} active={p.id === turn?.playerId} winner={roundEnd && s.roundWinner?.id === p.id} />)}
        </div>

        {!roundEnd && (
          <div className="card flex flex-wrap items-center gap-3">
            {s.settings.allowSkip && mine && !locked && (step === 'ask' || step === 'guess') && (
              <button className="btn" onClick={() => act('game:skip')}>⏭️ Skip {step === 'ask' ? 'question' : 'guess'}</button>
            )}
            {isHost && turn && !locked && !mine && <button className="btn" onClick={() => act('game:next')}>⏩ Pass turn (host)</button>}
            <span className="text-sm text-slate-400 ml-auto">Round winner earns 11 − turns taken (min 1) points</span>
          </div>
        )}
      </div>

      <Chat s={s} mine={mine} step={step} locked={locked} act={act} roundEnd={roundEnd} />
    </div>
  );
}

function PlayerCard({ p, me, active, winner }) {
  const hidden = me && !p.word;
  return (
    <div
      className={`relative rounded-3xl p-4 border-2 transition-all duration-300 bg-white/5 ${active ? 'animate-glow scale-[1.03]' : ''} ${p.connected ? '' : 'opacity-50'}`}
      style={{ borderColor: active || winner ? p.color : p.color + '44', '--glow': p.color + '88' }}
    >
      {active && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold rounded-full px-3 py-0.5 text-ink" style={{ background: p.color }}>ACTIVE</div>}
      {winner && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold rounded-full px-3 py-0.5 bg-amber-300 text-ink">🏆 WINNER</div>}
      <div className="flex items-center gap-2">
        <Avatar p={p} size={36} />
        <div className="min-w-0 flex-1"><div className="font-semibold truncate">{p.name}{me && ' (you)'}</div><div className="text-xs text-slate-400">{p.score} pts {!p.connected && '· offline'}</div></div>
      </div>
      <div className="mt-3 min-h-[96px] grid place-items-center text-center rounded-2xl bg-black/30 px-2 py-3">
        {hidden ? (
          <div><div className="text-4xl">❓</div><div className="text-sm text-slate-400 mt-1">Who are you?</div></div>
        ) : (
          <div className="animate-pop">
            <div className="font-display text-2xl xl:text-3xl font-bold leading-tight break-words" style={{ color: p.color }}>{p.word}</div>
          </div>
        )}
      </div>
      {p.cat && <div className="mt-2 text-center text-xs text-slate-400">{p.cat}</div>}
    </div>
  );
}

function Chat({ s, mine, step, locked, act, roundEnd }) {
  const [ask, setAsk] = useState(''); const [guess, setGuess] = useState(''); const [say, setSay] = useState('');
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [s.chat.length]);
  const by = (id) => s.players.find((p) => p.id === id);
  const submit = (e, ev, val, set) => { e.preventDefault(); if (!val.trim()) return; set(''); act(ev, { text: val }); };
  const openQ = s.turn?.step === 'answer' && !s.turn.locked ? s.turn.qId : null;

  return (
    <div className="card flex flex-col xl:sticky xl:top-4 h-[calc(100vh-7rem)] !p-4">
      <h3 className="text-xl font-bold mb-2">💬 Questions & chat</h3>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {s.chat.map((m) => {
          const p = by(m.playerId);
          if (m.kind === 'system') return <div key={m.id} className={`text-center text-xs py-1 animate-slideUp ${m.fx === 'correct' ? 'text-emerald-300 font-semibold text-sm' : 'text-slate-400'}`}>{m.text}</div>;
          const own = m.playerId === s.you;
          return (
            <div key={m.id} className={`animate-slideUp flex flex-col ${own ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-slate-400 mb-0.5">{p?.avatar} {p?.name ?? 'Player'}</div>
              <div className="max-w-[92%] rounded-2xl px-3 py-2 text-sm" style={{ background: (p?.color ?? '#888') + '26', border: `1px solid ${p?.color ?? '#888'}55` }}>
                {m.kind === 'question' && <span className="text-xs uppercase tracking-wide opacity-70">Question · </span>}
                {m.kind === 'guess' && <span className="text-xs uppercase tracking-wide opacity-70">Guess ❌ · </span>}
                {m.text}
                {m.kind === 'question' && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.keys(ANS).map((k) => {
                      const n = Object.values(m.answers).filter((a) => a === k).length;
                      const chosen = m.answers[s.you] === k;
                      const canAnswer = !own && m.id === openQ;
                      if (!canAnswer && !n) return null;
                      return (
                        <button key={k} disabled={!canAnswer} onClick={() => act('game:answer', { msgId: m.id, answer: k })} className={`chip !py-0.5 !px-2 text-xs ${chosen ? 'chip-on' : ''} disabled:cursor-default`}>
                          {ANS[k][0]} {ANS[k][1]}{n ? ` · ${n}` : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {!roundEnd && (
        <div className="pt-3 space-y-2 border-t border-white/10 mt-2">
          {mine && !locked && step === 'ask' && (
            <form className="flex gap-2" onSubmit={(e) => submit(e, 'game:ask', ask, setAsk)}>
              <input className="input" maxLength={200} placeholder='Your ONE question… "Am I a real person?"' value={ask} onChange={(e) => setAsk(e.target.value)} autoFocus />
              <button className="btn btn-primary">Ask</button>
            </form>
          )}
          {mine && !locked && step === 'guess' && (
            <form className="flex gap-2" onSubmit={(e) => submit(e, 'game:guess', guess, setGuess)}>
              <input className="input" maxLength={80} placeholder="Your ONE guess: who are you?" value={guess} onChange={(e) => setGuess(e.target.value)} autoFocus />
              <button className="btn btn-green">Guess!</button>
            </form>
          )}
          {mine && (locked || step === 'answer') && <div className="text-center text-sm text-slate-400 py-2">{locked ? 'Next player coming up…' : 'Waiting for everyone to answer…'}</div>}
          {!mine && (
            <form className="flex gap-2" onSubmit={(e) => submit(e, 'chat:send', say, setSay)}>
              <input className="input" maxLength={200} placeholder="Chat or give a hint…" value={say} onChange={(e) => setSay(e.target.value)} />
              <button className="btn">Send</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
