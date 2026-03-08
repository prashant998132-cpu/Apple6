'use client';
import { useState, useEffect } from 'react';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Props { children: React.ReactNode; }

export default function PinLock({ children }: Props) {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'check' | 'set'>('check');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = localStorage.getItem('jarvis_pin_hash');
    const lastUnlock = Number(localStorage.getItem('jarvis_pin_unlock') || '0');
    const elapsed = Date.now() - lastUnlock;
    if (hash && elapsed > 30 * 60 * 1000) setLocked(true); // lock after 30 min
    setLoading(false);
  }, []);

  const unlock = async () => {
    const hash = localStorage.getItem('jarvis_pin_hash');
    if (!hash) return;
    const entered = await sha256(pin);
    if (entered === hash) {
      localStorage.setItem('jarvis_pin_unlock', String(Date.now()));
      setLocked(false); setError('');
    } else {
      setError('❌ Wrong PIN'); setPin('');
    }
  };

  if (loading) return null;
  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-[#0a0b0f] z-50 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-5xl">🔒</div>
      <div className="text-xl font-bold">JARVIS Locked</div>
      <div className="text-sm text-gray-400">PIN daalo</div>
      <div className="flex gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length > i ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`} />
        ))}
      </div>
      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
          <button key={i} onClick={() => {
            if (n === '⌫') setPin(p => p.slice(0,-1));
            else if (n !== '' && pin.length < 4) {
              const np = pin + n;
              setPin(np);
              if (np.length === 4) {
                setPin(np);
                setTimeout(() => unlock(), 100);
              }
            }
          }} className={`w-16 h-16 rounded-2xl text-xl font-bold transition-all ${n === '' ? 'invisible' : 'bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200'}`}>
            {n}
          </button>
        ))}
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
}
