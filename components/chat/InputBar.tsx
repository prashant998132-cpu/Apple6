'use client';
import { useRef, useState, useEffect } from 'react';

interface Props {
  value: string; onChange: (v: string) => void;
  onSend: (text?: string) => void; loading: boolean;
  onStop: () => void; onCompress: () => void;
}

export default function InputBar({ value, onChange, onSend, loading, onStop, onCompress }: Props) {
  const [listening, setListening] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      onChange(t);
    };
    rec.onend = () => { setListening(false); setTimeout(() => onSend(), 300); };
    rec.onerror = () => setListening(false);
    rec.start(); setListening(true);
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
  };

  return (
    <div className="px-3 pb-3 pt-1 relative">
      {/* Attach popup */}
      {showAttach && (
        <div className="absolute bottom-full left-3 mb-2 bg-gray-900 border border-gray-700 rounded-2xl p-2 flex gap-2 z-10">
          {[['📷','Camera'], ['🖼️','Photo'], ['📄','PDF'], ['✂️','Compress']].map(([icon, label]) => (
            <button key={label} onClick={() => {
              setShowAttach(false);
              if (label === 'Compress') { onCompress(); return; }
              document.getElementById(`file-${label.toLowerCase()}`)?.click();
            }} className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-gray-800 rounded-xl transition-colors">
              <span className="text-2xl">{icon}</span>
              <span className="text-[10px] text-gray-400">{label}</span>
            </button>
          ))}
        </div>
      )}

      <input id="file-photo" type="file" className="hidden" accept="image/*" />
      <input id="file-pdf" type="file" className="hidden" accept="application/pdf" />
      <input id="file-camera" type="file" className="hidden" accept="image/*" capture="environment" />

      <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-3 py-2">
        <button onClick={() => setShowAttach(s => !s)}
          className="text-gray-400 hover:text-blue-400 pb-0.5 flex-shrink-0 transition-colors text-xl">
          {showAttach ? '✕' : '➕'}
        </button>

        <textarea ref={textareaRef} value={value}
          onChange={e => { onChange(e.target.value); setShowAttach(false); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Kuch bhi pucho... (Shift+Enter = new line)"
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none text-sm leading-5"
          style={{ minHeight: '24px', maxHeight: '120px' }} rows={1} />

        <button onClick={startVoice}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${listening ? 'bg-red-500 animate-pulse' : 'text-gray-400 hover:text-blue-400'}`}>
          🎤
        </button>

        {loading ? (
          <button onClick={onStop} className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white">⏹</button>
        ) : (
          <button onClick={() => onSend()} disabled={!value.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 disabled:bg-gray-700 flex items-center justify-center text-white text-sm font-bold transition-colors">↑</button>
        )}
      </div>
    </div>
  );
}
