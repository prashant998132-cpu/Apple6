'use client';
import { useState } from 'react';

interface Props { onClose: () => void; }

export default function CompressPopup({ onClose }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState<'short' | 'medium' | 'tiny'>('short');
  const [loading, setLoading] = useState(false);

  const compress = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const prompts = {
      tiny: 'Compress this text to 1-2 sentences max. Hindi ya English mein:',
      short: 'Compress to a short paragraph. Key points only. Hinglish mein:',
      medium: 'Summarize with all important points in bullet format. Hinglish mein:',
    };
    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${prompts[mode]}\n\n${text}` }],
          system: 'You compress/summarize text. Be concise.',
          mode: 'flash',
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let out = ''; let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value);
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) { out += d.text; setResult(out); } } catch {}
        }
      }
    } catch { setResult('Error — baad mein try karo'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-900 border-t border-gray-700 w-full rounded-t-3xl p-4 pb-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold">✂️ Compress Text</div>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div className="flex gap-2 mb-3">
          {[['tiny','🔴 Tiny'],['short','🟡 Short'],['medium','🟢 Medium']].map(([id,label]) => (
            <button key={id} onClick={() => setMode(id as any)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${mode === id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-700 text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Yahan text paste karo..."
          className="w-full h-24 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 outline-none resize-none mb-3" />
        <button onClick={compress} disabled={!text.trim() || loading}
          className="w-full py-3 bg-blue-600 disabled:bg-gray-700 rounded-xl text-sm font-medium mb-3">
          {loading ? '✂️ Compressing...' : '✂️ Compress Karo'}
        </button>
        {result && (
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1 flex justify-between">
              <span>Result</span>
              <button onClick={() => navigator.clipboard.writeText(result)} className="text-blue-400">Copy</button>
            </div>
            <div className="text-sm text-gray-200 whitespace-pre-wrap">{result}</div>
          </div>
        )}
      </div>
    </div>
  );
}
