'use client';
import { useState } from 'react';

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'History', 'Geography', 'Economics', 'English', 'Computer Science', 'General Knowledge'];

export default function StudyPage() {
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState<'mcq' | 'flashcard' | 'explain' | 'formula'>('mcq');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const generate = async () => {
    if (!subject) return;
    setLoading(true); setResult('');
    const prompts: Record<string, string> = {
      mcq: `${subject} ke liye 5 MCQ questions banao. Format: Q1. [question]\nA) B) C) D) options\nAnswer: [correct]\nExplanation: [brief Hindi/English]`,
      flashcard: `${subject} ke liye 5 important flashcards banao. Format: CARD 1:\nFront: [concept]\nBack: [definition/formula]`,
      explain: `${subject} ke ek important concept ko explain karo. Simple language, examples ke saath. Hinglish mein.`,
      formula: `${subject} ke sabse important formulas/facts list karo. Clean format mein.`,
    };

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompts[mode] }],
          system: 'You are a helpful study assistant. Reply in Hinglish (Hindi + English mix). Be concise and educational.',
          mode: 'think',
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try { const p = JSON.parse(data); if (p.text) { text += p.text; setResult(text); } } catch {}
        }
      }
    } catch (e) {
      setResult('Error aaya. Internet check karo ya baad mein try karo.');
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <h1 className="text-xl font-bold mb-4">📚 Study Mode</h1>

      {/* Subject selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => setSubject(s)}
            className={`py-2 px-3 rounded-xl text-sm text-left border transition-all ${subject === s ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800/50 text-gray-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Mode */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {[['mcq','📝 MCQ'],['flashcard','🃏 Cards'],['explain','💡 Explain'],['formula','∑ Formulas']].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${mode === id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <button onClick={generate} disabled={!subject || loading}
        className="w-full py-3 rounded-xl bg-blue-600 disabled:bg-gray-700 text-white font-medium mb-4 text-sm">
        {loading ? '🤔 Generating...' : `Generate ${mode.toUpperCase()}`}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
          <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{result}</pre>
        </div>
      )}
    </div>
  );
}
