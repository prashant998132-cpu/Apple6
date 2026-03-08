'use client';
import { useState } from 'react';

export default function ThinkBubble({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);
  if (!thinking) return null;
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
        <span className="animate-pulse">🧠</span>
        <span>Soch raha tha...</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 p-3 bg-gray-900/50 border border-gray-700/30 rounded-xl text-xs text-gray-400 leading-relaxed max-h-40 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}
