import { useCallback, useEffect, useRef, useState } from 'react';
import { socket, call, store, playerId, uid, sfx, isMuted, setMuted } from './lib';
import { Modal } from './ui';
import Lobby from './Lobby';
import Game from './Game';
import Results from './Results';
import WordSets from './WordSets';

export default function App() {
  const [s, setS] = useState(null);
  const [online, setOnline] = useState(socket.connected);
  const [toast, setToast] = useState(null);
  const [muted, setM] = useState(isMuted());
  const [showSets, setShowSets] = useState(false);
  const [sets, setSets] = useState(() => store.get('hu.sets', []));
  const seen = useRef(null);
  const sRef = useRef(null);

  const notify = useCallback((msg) => { setToast(msg); setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500); }, []);
  const saveSets = (v) => { setSets(v); store.set('hu.sets', v); };

  useEffect(() => {
    const onState = (st) => {
      const skew = st.now - Date.now();
      sRef.current = { ...st, skew };
      setS({ ...st, skew });
      store.set('hu.room', st.code);
      const max = st.chat.reduce((a, m) => Math.max(a, m.id), 0);
      if (seen.current != null) {
        st.chat.filter((m) => m.id > seen.current && m.fx).forEach((m) => {
          if (m.fx === 'correct') sfx.correct();
          else if (m.fx === 'wrong') sfx.wrong();
          else if (m.fx === 'turn' && m.playerId === st.you) sfx.turn();
          else if (m.fx === 'round' || m.fx === 'roundend') sfx.round();
          else if (m.fx === 'join') sfx.join();
        });
      }
      seen.current = max;
    };
    const onConnect = () => {
      setOnline(true);
      const code = store.get('hu.room', null);
      if (code) call('room:join', { code, name: store.get('hu.name', ''), playerId: playerId() }).then((r) => { if (!r.ok) { store.set('hu.room', null); setS(null); } });
    };
    const onKicked = () => { store.set('hu.room', null); seen.current = null; setS(null); notify('You were removed from the room by the host'); };
    socket.on('state', onState); socket.on('connect', onConnect); socket.on('disconnect', () => setOnline(false)); socket.on('kicked', onKicked);
    if (socket.connected) onConnect();
    return () => { socket.off('state', onState); socket.off('connect', onConnect); socket.off('kicked', onKicked); };
  }, [notify]);

  // Host pushes their saved custom word sets to the server whenever they change.
  const isHost = !!s && s.hostId === s.you;
  useEffect(() => {
    if (isHost && sRef.current?.phase === 'lobby') call('settings:update', { settings: sRef.current.settings, customSets: sets });
  }, [sets, isHost, s?.code, s?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = async () => { await call('room:leave'); store.set('hu.room', null); seen.current = null; setS(null); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-float">🎭</span>
          <span className="font-display text-2xl font-bold tracking-tight">Who<span className="text-fuchsia-400">Am</span>I?</span>
          {!online && <span className="ml-3 text-xs rounded-full bg-amber-500/20 text-amber-300 px-3 py-1">Reconnecting…</span>}
        </div>
        <div className="flex items-center gap-2">
          {s && <CodeBadge code={s.code} notify={notify} />}
          <button className="btn" onClick={() => setShowSets(true)}>📚 Word sets</button>
          <button className="btn" title="Sound" onClick={() => { setMuted(!muted); setM(!muted); }}>{muted ? '🔇' : '🔊'}</button>
          {s && <button className="btn btn-danger" onClick={leave}>Leave</button>}
        </div>
      </header>

      <main className="flex-1 px-8 pb-8 max-w-[1600px] w-full mx-auto">
        {!s && <Landing notify={notify} />}
        {s?.phase === 'lobby' && <Lobby s={s} isHost={isHost} notify={notify} sets={sets} openSets={() => setShowSets(true)} />}
        {(s?.phase === 'playing' || s?.phase === 'roundEnd') && <Game s={s} isHost={isHost} notify={notify} />}
        {s?.phase === 'results' && <Results s={s} isHost={isHost} notify={notify} onLeave={leave} />}
      </main>

      {showSets && (
        <Modal title="📚 My word sets" onClose={() => setShowSets(false)}>
          <WordSets sets={sets} setSets={saveSets} />
        </Modal>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl bg-rose-500 px-5 py-3 font-semibold shadow-xl animate-pop">{toast}</div>}
    </div>
  );
}

function CodeBadge({ code, notify }) {
  return (
    <button className="btn font-mono tracking-widest" onClick={() => { navigator.clipboard?.writeText(code); notify('Room code copied!'); }} title="Copy room code">
      {code} 📋
    </button>
  );
}

function Landing({ notify }) {
  const [name, setName] = useState(store.get('hu.name', ''));
  const [code, setCode] = useState(new URLSearchParams(location.search).get('room')?.toUpperCase() || '');
  const [busy, setBusy] = useState(false);

  const go = async (ev, data) => {
    if (!name.trim()) return notify('Pick a nickname first');
    setBusy(true);
    store.set('hu.name', name.trim());
    const r = await call(ev, { ...data, name: name.trim(), playerId: playerId() });
    setBusy(false);
    if (!r.ok) notify(r.error);
    else history.replaceState(null, '', location.pathname);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
      <div>
        <h1 className="font-display text-7xl font-bold leading-[1.05]">
          Everyone knows <br /> who you are.<br /><span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Except you.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-300 max-w-xl">
          Everyone sees everyone’s secret identity — except their own. Ask yes/no questions, work out who you are, and beat your friends to it.
          No phones on foreheads required.
        </p>
        <div className="mt-8 flex gap-3 flex-wrap text-sm text-slate-300">
          {['2–10 players', 'Custom word lists', 'Real-time rooms', 'Server-enforced secrecy'].map((t) => <span key={t} className="chip cursor-default">{t}</span>)}
        </div>
      </div>

      <div className="card space-y-5 max-w-md w-full justify-self-center lg:justify-self-end">
        <div>
          <label className="text-sm text-slate-400">Your nickname</label>
          <input className="input mt-1" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Captain Quokka" onKeyDown={(e) => e.key === 'Enter' && go('room:create')} />
        </div>
        <button className="btn btn-primary w-full text-lg" disabled={busy} onClick={() => go('room:create')}>✨ Create Game</button>
        <div className="flex items-center gap-3 text-slate-500 text-sm"><div className="h-px flex-1 bg-white/10" />or join friends<div className="h-px flex-1 bg-white/10" /></div>
        <div className="flex gap-2">
          <input className="input font-mono uppercase tracking-[0.3em] text-center" maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" onKeyDown={(e) => e.key === 'Enter' && go('room:join', { code })} />
          <button className="btn btn-green" disabled={busy || code.length < 5} onClick={() => go('room:join', { code })}>Join</button>
        </div>
      </div>
    </div>
  );
}
