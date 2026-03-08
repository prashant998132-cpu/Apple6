'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { href: '/',        icon: '💬', label: 'Chat' },
  { href: '/tools',   icon: '🧰', label: 'Tools' },
  { href: '/vault',   icon: '🗄️', label: 'Vault' },
  { href: '/study',   icon: '📚', label: 'Study' },
  { href: '/target',  icon: '🎯', label: 'Goals' },
  { href: '/settings',icon: '⚙️', label: 'More' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(tab => {
        const active = path === tab.href;
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[52px] relative ${active ? 'text-blue-400' : 'text-gray-500'}`}>
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="text-[9px] font-medium">{tab.label}</span>
            {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-400 rounded-full" />}
          </Link>
        );
      })}
    </nav>
  );
}
