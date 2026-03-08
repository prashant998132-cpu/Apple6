'use client';
import { Message } from './ChatInterface';

const CHIPS: Record<string, string[]> = {
  weather: ['Kal ka forecast?', 'Weekly weather?', 'Rain aayegi?'],
  crypto: ['Bitcoin trend?', 'Buy karna chahiye?', 'Ethereum price?'],
  image: ['Alag style mein?', 'Dark version?', 'Aur generate karo'],
  code: ['Explain karo', 'Optimize karo', 'Test likhdo'],
  news: ['Aur khabar?', 'Details batao', 'Source?'],
  default: ['Aur detail mein?', 'Example do', 'Translate karo', 'Summary do'],
};

function detectCategory(content: string): string {
  const t = content.toLowerCase();
  if (t.match(/°c|mausam|humidity|forecast|rain/)) return 'weather';
  if (t.match(/btc|eth|sol|\₹.*inr|crypto/)) return 'crypto';
  if (t.match(/image\.|png|jpg|generate|pollinations/)) return 'image';
  if (t.match(/```|function|const|def |class |import /)) return 'code';
  if (t.match(/news|khabar|headline/)) return 'news';
  return 'default';
}

interface Props {
  lastMessage: Message;
  onSelect: (text: string) => void;
}

export default function FollowUpChips({ lastMessage, onSelect }: Props) {
  if (lastMessage.role !== 'assistant' || !lastMessage.content) return null;
  const category = detectCategory(lastMessage.content);
  const chips = CHIPS[category] || CHIPS.default;

  return (
    <div className="flex gap-2 flex-wrap px-1 pb-1">
      {chips.map(chip => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/20 transition-colors whitespace-nowrap"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
