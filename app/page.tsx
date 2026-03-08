'use client';
import React, { Component, useEffect, useState } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';

// Matrix boot animation
function MatrixBoot({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
    if (!canvas) { onDone(); return; }
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'JARVIS01アイウエオカキクケコ∑∆∇∂∫';
    const fontSize = 12;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = Array(cols).fill(1);
    let frame = 0;

    const messages = ['INITIALIZING JARVIS...', 'LOADING AI MODELS...', 'READY ✓'];
    let msgIdx = 0;

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(10,11,15,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3b82f6';
      ctx.font = `${fontSize}px monospace`;

      drops.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });

      // Boot message
      if (frame % 30 === 0 && msgIdx < messages.length) {
        ctx.fillStyle = 'rgba(10,11,15,0.8)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(messages[msgIdx], canvas.width / 2, canvas.height / 2);
        msgIdx++;
      }
      frame++;
      if (frame > 90) { clearInterval(interval); onDone(); }
    }, 33);

    return () => clearInterval(interval);
  }, []);

  return <canvas id="matrix-canvas" />;
}

// Error boundary
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <div className="text-lg font-bold">Kuch galat ho gaya</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 rounded-xl text-sm">Reload karo</button>
      </div>
    );
    return this.props.children;
  }
}

export default function Home() {
  const [booted, setBooted] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {!booted && <MatrixBoot onDone={() => setBooted(true)} />}
      {booted && (
        <ErrorBoundary>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold">J</div>
              <div>
                <div className="text-sm font-bold leading-none">JARVIS</div>
                <div className="text-[10px] text-green-400 leading-none">● Online</div>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="/settings" className="text-gray-400 hover:text-white text-xl">⚙️</a>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
