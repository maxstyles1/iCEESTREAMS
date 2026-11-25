import { SlidersHorizontal } from 'lucide-react';
import { ScreenId } from '../types';

interface TopBarProps {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  onToggleAudioDrawer: () => void;
}

const NAV_LINKS: { id: ScreenId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'library', label: 'Library' },
  { id: 'social', label: 'Social' },
  { id: 'settings', label: 'Settings' },
];

export default function TopBar({
  currentScreen,
  setCurrentScreen,
  onToggleAudioDrawer,
}: TopBarProps) {
  return (
    <header className="border-b border-white/10 bg-[var(--canvas-bg)]/95 md:sticky md:top-0 md:z-30 md:backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => setCurrentScreen('home')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg px-1"
        >
          iCEE Streams
        </button>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_LINKS.map((link) => {
            const active = currentScreen === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setCurrentScreen(link.id)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  active
                    ? 'text-white border-[var(--accent)]'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleAudioDrawer}
            className="min-h-[40px] px-4 py-2 rounded-xl surface-card hover:bg-white/5 text-xs font-medium text-white flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <SlidersHorizontal size={15} className="accent-text" />
            <span>Audio & Queue</span>
          </button>
        </div>
      </div>
    </header>
  );
}
