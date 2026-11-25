import { Compass, Home, Library, Settings, Users } from 'lucide-react';
import { ScreenId } from '../types';

interface BottomNavProps {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
}

const NAV_ITEMS: { id: ScreenId; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'search', label: 'Search', Icon: Compass },
  { id: 'library', label: 'Library', Icon: Library },
  { id: 'social', label: 'Social', Icon: Users },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav({ currentScreen, setCurrentScreen }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--canvas-bg)]/95 backdrop-blur-md border-t border-white/10 h-16 px-2 grid grid-cols-5 items-center"
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const active = currentScreen === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setCurrentScreen(id)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              active ? 'accent-text' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap shrink-0">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
