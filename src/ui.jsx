import { useEffect, useState } from 'react';

export function Avatar({ p, size = 44 }) {
  return (
    <div className="grid place-items-center rounded-full shrink-0 select-none" style={{ width: size, height: size, background: p.color + '33', border: `2px solid ${p.color}`, fontSize: size * 0.55 }}>
      {p.avatar}
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className="flex items-center justify-between w-full py-1.5 text-left disabled:opacity-60">
      <span className="text-sm text-slate-200">{label}</span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition ${on ? 'bg-fuchsia-500' : 'bg-white/15'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

export function Modal({ children, onClose, title }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={onClose}>
      <div className="card animate-pop w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col !bg-[#14142b]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button className="btn !px-3 !py-1.5" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Timer({ endsAt, skew, total }) {
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(i); }, []);
  if (!endsAt) return <span className="text-sm text-slate-400">No timer</span>;
  const left = Math.max(0, (endsAt - (Date.now() + skew)) / 1000);
  const pct = Math.min(100, (left / total) * 100);
  return (
    <div className="w-40">
      <div className={`font-display text-3xl font-bold text-right ${left <= 10 ? 'text-rose-400' : ''}`}>{Math.ceil(left)}s</div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full transition-all ${left <= 10 ? 'bg-rose-400' : 'bg-fuchsia-400'}`} style={{ width: pct + '%' }} /></div>
    </div>
  );
}
