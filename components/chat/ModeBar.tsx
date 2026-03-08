'use client';
import { useState } from 'react';
import { PersonalityMode } from '@/lib/intelligence';

interface Props {
  mode: string; onModeChange: (m: any) => void;
  personality: string; onPersonalityChange: (p: string) => void;
}

const MODES = [
  { id: 'auto', icon: '🤖', label: 'Auto', color: 'blue' },
  { id: 'flash', icon: '⚡', label: 'Flash', color: 'yellow' },
  { id: 'think', icon: '🧠', label: 'Think', color: 'purple' },
  { id: 'deep', icon: '🔬', label: 'Deep', color: 'green' },
];

const PERSONALITIES: { id: PersonalityMode; icon: string; label: string }[] = [
  { id: 'default', icon: '🤖', label: 'JARVIS' },
  { id: 'fun', icon: '🎉', label: 'Fun' },
  { id: 'serious', icon: '💼', label: 'Serious' },
  { id: 'motivational', icon: '💪', label: 'Motivate' },
  { id: 'sarcastic', icon: '😏', label: 'Sarcastic' },
  { id: 'roast', icon: '🔥', label: 'Roast' },
  { id: 'philosopher', icon: '🧘', label: 'Philosopher' },
  { id: 'teacher', icon: '📚', label: 'Teacher' },
];

export default function ModeBar({ mode, onModeChange, personality, onPersonalityChange }: Props) {
  const [showPersonality, setShowPersonality] = useState(false);

  return (
    <div className="px-3 py-1.5 border-b border-gray-800/30 flex-shrink-0">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* Think modes */}
        {MODES.map(m => (
          <button key={m.id} onClick={() => onModeChange(m.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${mode === m.id ? `bg-${m.color}-600/30 text-${m.color}-400 border border-${m.color}-500/40` : 'text-gray-500 hover:text-gray-300'}`}>
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}

        <div className="w-px h-4 bg-gray-700 flex-shrink-0 mx-0.5" />

        {/* Personality toggle */}
        <button onClick={() => setShowPersonality(s => !s)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-white border border-gray-700/50 flex-shrink-0">
          {PERSONALITIES.find(p => p.id === personality)?.icon || '🤖'}
          <span>{PERSONALITIES.find(p => p.id === personality)?.label || 'JARVIS'}</span>
          <span className="text-[8px]">▾</span>
        </button>

        {/* Personality popup */}
        {showPersonality && (
          <div className="absolute left-3 top-[90px] z-40 bg-gray-900 border border-gray-700 rounded-2xl p-2 flex flex-wrap gap-1.5 max-w-[280px] shadow-2xl">
            {PERSONALITIES.map(p => (
              <button key={p.id} onClick={() => { onPersonalityChange(p.id); setShowPersonality(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all ${personality === p.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
