'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string; icon: string; label: string; hint: string;
  action: () => void;
}

interface Props { onCommand: (text: string) => void; }

export default function CommandPalette({ onCommand }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const COMMANDS: Command[] = [
    { id:'weather', icon:'🌤️', label:'Weather', hint:'GPS se mausam', action: () => onCommand('/weather') },
    { id:'news', icon:'📰', label:'India News', hint:'Top headlines', action: () => onCommand('/news') },
    { id:'crypto', icon:'₿', label:'Crypto Prices', hint:'BTC/ETH/SOL', action: () => onCommand('/crypto') },
    { id:'image', icon:'🎨', label:'Image Banao', hint:'/image [prompt]', action: () => onCommand('/image ') },
    { id:'joke', icon:'😂', label:'Joke', hint:'Random joke', action: () => onCommand('/joke') },
    { id:'quote', icon:'💬', label:'Quote', hint:'Motivational', action: () => onCommand('/quote') },
    { id:'iss', icon:'🛸', label:'ISS Location', hint:'Space station', action: () => onCommand('/iss') },
    { id:'nasa', icon:'🚀', label:'NASA Photo', hint:'Space APOD', action: () => onCommand('/nasa') },
    { id:'study', icon:'📚', label:'Study Mode', hint:'Go to study', action: () => router.push('/study') },
    { id:'goals', icon:'🎯', label:'Goals', hint:'Track goals', action: () => router.push('/target') },
    { id:'india', icon:'🇮🇳', label:'India Hub', hint:'India features', action: () => router.push('/india') },
    { id:'settings', icon:'⚙️', label:'Settings', hint:'API keys etc', action: () => router.push('/settings') },
  ];

  const filtered = query
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.hint.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-400 hover:border-blue-500 transition-colors">
      <span>⌘K</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4" onClick={() => setOpen(false)}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <span className="text-gray-400">🔍</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Command ya kuch bhi type karo..."
            className="flex-1 bg-transparent text-gray-200 outline-none text-sm placeholder-gray-500" />
          <kbd className="text-[10px] text-gray-500 border border-gray-700 rounded px-1">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.map((cmd, i) => (
            <button key={cmd.id} onClick={() => { cmd.action(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left">
              <span className="text-xl w-8">{cmd.icon}</span>
              <div>
                <div className="text-sm text-gray-200">{cmd.label}</div>
                <div className="text-xs text-gray-500">{cmd.hint}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-800 text-[10px] text-gray-500">⌘K / Ctrl+K se open karo</div>
      </div>
    </div>
  );
}
