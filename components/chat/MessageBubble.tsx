'use client';
import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from './ChatInterface';

interface Props {
  message: Message;
  onLike: (liked: boolean) => void;
  onSpeak: () => void;
  onCopy: () => void;
  onPin: () => void;
}

export default function MessageBubble({ message: msg, onLike, onSpeak, onCopy, onPin }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const isUser = msg.role === 'user';

  // Swipe gesture
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 60) setSwipeX(dx * 0.3);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    setSwipeX(0);
    if (Math.abs(dx) > 60) {
      // Swipe right = like, left = copy
      if (dx > 60) onLike(true);
      else if (dx < -60) onCopy();
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group fade-in`}
      style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}>
      <div
        className={`relative max-w-[88%] rounded-2xl px-3 py-2 ${
          isUser ? 'bg-blue-600 text-white rounded-br-sm' :
          msg.pinned ? 'bg-gray-800/80 text-gray-100 rounded-bl-sm border border-amber-500/40' :
          'bg-gray-800/80 text-gray-100 rounded-bl-sm border border-gray-700/50'
        }`}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={() => setShowActions(s => !s)}
        onContextMenu={e => { e.preventDefault(); setShowActions(true); }}
      >
        {msg.pinned && <div className="text-[10px] text-amber-400 mb-1">📌 Pinned</div>}

        {/* Image */}
        {msg.type === 'image' && msg.imageUrl && (
          <div className="mb-2">
            <img src={msg.imageUrl} alt={msg.content} className="rounded-xl max-w-full cursor-pointer"
              style={{ maxHeight: '300px', objectFit: 'cover' }}
              onClick={() => window.open(msg.imageUrl, '_blank')} loading="lazy" />
          </div>
        )}

        {/* Text */}
        <div className={`text-sm leading-relaxed ${isUser ? '' : 'prose prose-sm prose-invert max-w-none'}`}>
          {isUser ? (
            <span className="user-select-text">{msg.content}</span>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              code({ node, inline, className, children, ...props }: any) {
                const lang = /language-(\w+)/.exec(className||'')?.[1];
                return inline ? (
                  <code className="bg-gray-700 px-1 py-0.5 rounded text-blue-300 text-xs font-mono">{children}</code>
                ) : (
                  <div className="relative my-2">
                    {lang && <div className="text-gray-500 text-[10px] px-3 pt-2 bg-gray-900 rounded-t-xl">{lang}</div>}
                    <pre className={`bg-gray-900 p-3 overflow-x-auto text-xs ${lang ? 'rounded-b-xl' : 'rounded-xl'}`}>
                      <code className="text-green-300 font-mono">{children}</code>
                    </pre>
                    <button onClick={() => navigator.clipboard.writeText(String(children))}
                      className="absolute top-1 right-2 text-[10px] text-gray-500 hover:text-white">Copy</button>
                  </div>
                );
              },
              table: ({children}) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
              th: ({children}) => <th className="border border-gray-600 px-2 py-1 bg-gray-700 text-left text-xs">{children}</th>,
              td: ({children}) => <td className="border border-gray-600 px-2 py-1 text-xs">{children}</td>,
              a: ({href, children}) => <a href={href} target="_blank" rel="noopener" className="text-blue-400 underline" onClick={e => e.stopPropagation()}>{children}</a>,
            }}>
              {msg.content || '▋'}
            </ReactMarkdown>
          )}
        </div>

        {/* Meta */}
        <div className={`flex items-center justify-between mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
          <span className="text-[10px]">
            {new Date(msg.ts).toLocaleTimeString('hi-IN', {hour:'2-digit', minute:'2-digit'})}
          </span>
          <span className="text-[10px]">
            {msg.mode === 'flash' ? '⚡' : msg.mode === 'think' ? '🧠' : msg.mode === 'deep' ? '🔬' : ''}
            {msg.liked === true ? ' 👍' : msg.liked === false ? ' 👎' : ''}
            {msg.pinned ? ' 📌' : ''}
          </span>
        </div>

        {/* Action bar */}
        {showActions && !isUser && (
          <div className="absolute -bottom-9 left-0 flex gap-0.5 bg-gray-900 border border-gray-700 rounded-full px-1.5 py-1 z-10 shadow-xl">
            {[
              ['📋', onCopy, 'Copy'],
              ['🔊', onSpeak, 'Speak'],
              ['👍', () => onLike(true), 'Like'],
              ['👎', () => onLike(false), 'Dislike'],
              ['📌', onPin, msg.pinned ? 'Unpin' : 'Pin'],
            ].map(([icon, action, label]) => (
              <button key={String(label)} onClick={(e) => { e.stopPropagation(); (action as Function)(); setShowActions(false); }}
                className={`p-1.5 rounded-full hover:bg-gray-700 text-sm transition-colors ${
                  (label === 'Like' && msg.liked === true) ? 'text-green-400' :
                  (label === 'Dislike' && msg.liked === false) ? 'text-red-400' :
                  (label === 'Pin' || label === 'Unpin') && msg.pinned ? 'text-amber-400' : 'text-gray-300'
                }`} title={String(label)}>
                {icon as string}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
