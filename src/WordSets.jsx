import { useState } from 'react';
import { uid } from './lib';

export default function WordSets({ sets, setSets }) {
  const [sel, setSel] = useState(sets[0]?.id ?? null);
  const [input, setInput] = useState('');
  const cur = sets.find((x) => x.id === sel);
  const upd = (id, fn) => setSets(sets.map((x) => (x.id === id ? fn(x) : x)));

  const create = () => { const id = uid(); setSets([...sets, { id, name: `My set ${sets.length + 1}`, words: [] }]); setSel(id); };
  const remove = () => { if (!confirm(`Delete "${cur.name}"?`)) return; const rest = sets.filter((x) => x.id !== sel); setSets(rest); setSel(rest[0]?.id ?? null); };
  const addWords = () => {
    const incoming = input.split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean);
    if (!incoming.length) return;
    upd(cur.id, (x) => {
      const have = new Set(x.words.map((w) => w.toLowerCase()));
      const fresh = incoming.filter((w) => { const k = w.toLowerCase(); if (have.has(k)) return false; have.add(k); return true; });
      return { ...x, words: [...x.words, ...fresh].slice(0, 500) };
    });
    setInput('');
  };

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-5 min-h-0 flex-1 overflow-hidden">
      <div className="space-y-2 overflow-y-auto">
        <button className="btn btn-primary w-full" onClick={create}>＋ New set</button>
        {sets.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={`w-full text-left rounded-2xl px-4 py-3 border transition ${x.id === sel ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            <div className="font-semibold truncate">{x.name}</div><div className="text-xs text-slate-400">{x.words.length} words</div>
          </button>
        ))}
        {sets.length === 0 && <p className="text-sm text-slate-400">Create your first custom category — e.g. “Inside jokes”, “Our coworkers”.</p>}
        <p className="text-xs text-slate-500 pt-2">Saved in this browser. The host’s sets are available when they create a room.</p>
      </div>

      {cur ? (
        <div className="flex flex-col min-h-0">
          <div className="flex gap-2 mb-3">
            <input className="input font-semibold" maxLength={40} value={cur.name} onChange={(e) => upd(cur.id, (x) => ({ ...x, name: e.target.value }))} />
            <button className="btn btn-danger" onClick={remove}>🗑 Delete set</button>
          </div>
          <div className="flex gap-2 mb-3">
            <textarea className="input !rounded-2xl h-20 resize-none" placeholder="Add words — one per line, or separate with commas. Paste a whole list!" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !input.includes('\n')) { e.preventDefault(); addWords(); } }} />
            <button className="btn btn-green" onClick={addWords}>Add</button>
          </div>
          <div className="text-xs text-slate-400 mb-2">{cur.words.length} / 500 words · need at least as many words as players</div>
          <div className="overflow-y-auto grid sm:grid-cols-2 gap-2 pr-1">
            {cur.words.map((w, i) => (
              <Row key={w + i} word={w} onSave={(v) => upd(cur.id, (x) => ({ ...x, words: x.words.map((y, j) => (j === i ? v : y)).filter(Boolean) }))} onDelete={() => upd(cur.id, (x) => ({ ...x, words: x.words.filter((_, j) => j !== i) }))} />
            ))}
          </div>
        </div>
      ) : <div className="grid place-items-center text-slate-400">Select or create a set</div>}
    </div>
  );
}

function Row({ word, onSave, onDelete }) {
  const [edit, setEdit] = useState(false); const [v, setV] = useState(word);
  const save = () => { setEdit(false); const t = v.trim().slice(0, 60); if (t !== word) onSave(t); };
  return (
    <div className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-1.5">
      {edit
        ? <input autoFocus className="input !py-1" value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && save()} />
        : <span className="flex-1 truncate">{word}</span>}
      {!edit && <button className="opacity-60 hover:opacity-100" title="Edit" onClick={() => { setV(word); setEdit(true); }}>✏️</button>}
      <button className="opacity-60 hover:opacity-100" title="Delete" onClick={onDelete}>🗑</button>
    </div>
  );
}
