import { Compass, Home, Library, Settings, SlidersHorizontal, Users } from 'lucide-react';
import { ScreenId } from '../types';

interface TopBarProps {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  onToggleAudioDrawer: () => void;
}

const NAV_LINKS: { id: ScreenId; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'search', label: 'Search', Icon: Compass },
  { id: 'library', label: 'Library', Icon: Library },
  { id: 'social', label: 'Social', Icon: Users },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function TopBar({
  currentScreen,
  setCurrentScreen,
  onToggleAudioDrawer,
}: TopBarProps) {
  return (
    <header className="border-b border-[#F5F5FA]/10 bg-[var(--canvas-bg)]/95 md:sticky md:top-0 md:z-30 md:backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => setCurrentScreen('home')}
          className="font-display text-lg font-extrabold tracking-tight text-[#F5F5FA] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-2xl px-1.5 py-1 flex items-center gap-2"
        >
          <span>iCEE Streams</span>
        </button>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_LINKS.map(({ id, label, Icon }) => {
            const active = currentScreen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentScreen(id)}
                className={`py-1.5 whitespace-nowrap shrink-0 transition-all duration-200 border-b-2 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active
                    ? 'text-[#F5F5FA] border-[var(--accent)]'
                    : 'text-slate-400 border-transparent hover:text-[#F5F5FA]'
                }`}
              >
                <Icon
                  key={active ? `${id}-active` : `${id}-idle`}
                  size={15}
                  strokeWidth={active ? 2.2 : 1.75}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.22 : 0}
                  className={active ? 'accent-text icon-glow animate-tab-bounce' : ''}
                />
                <span className="label-caps text-[11px]">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleAudioDrawer}
            className="min-h-[40px] px-4 py-2 rounded-2xl surface-card hover:border-[var(--accent-border)] text-xs font-medium text-[#F5F5FA] flex items-center gap-2 whitespace-nowrap shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <SlidersHorizontal size={15} className="accent-text icon-glow" />
            <span className="label-caps text-[10px]">Audio & Queue</span>
          </button>
        </div>
      </div>
    </header>
  );
}
