import { ReactNode } from 'react';

export type EmptyIllustrationType = 'music' | 'search' | 'playlist' | 'heart' | 'queue' | 'social';

interface EmptyStateProps {
  illustration?: EmptyIllustrationType;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

function IllustrationSvg({ type }: { type: EmptyIllustrationType }) {
  if (type === 'search') {
    return (
      <svg viewBox="0 0 96 96" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="42" fill="rgba(0,229,255,0.06)" stroke="rgba(245,245,250,0.08)" />
        <circle cx="43" cy="43" r="18" stroke="var(--accent)" strokeWidth="2.5" />
        <path d="M56 56L70 70" stroke="var(--accent2)" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M36 43C36 39.134 39.134 36 43 36"
          stroke="var(--accent2)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'heart') {
    return (
      <svg viewBox="0 0 96 96" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="42" fill="rgba(255,79,216,0.07)" stroke="rgba(245,245,250,0.08)" />
        <path
          d="M48 67C48 67 25 53.5 25 38.5C25 31.6 30.6 26 37.5 26C41.8 26 45.7 28.2 48 31.6C50.3 28.2 54.2 26 58.5 26C65.4 26 71 31.6 71 38.5C71 53.5 48 67 48 67Z"
          stroke="var(--accent2)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M35 37.5C35 34.5 37.2 32.5 39.8 32" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'queue' || type === 'playlist') {
    return (
      <svg viewBox="0 0 96 96" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="42" fill="rgba(0,229,255,0.06)" stroke="rgba(245,245,250,0.08)" />
        <rect x="26" y="31" width="32" height="5" rx="2.5" fill="var(--accent)" fillOpacity="0.85" />
        <rect x="26" y="44" width="26" height="5" rx="2.5" fill="rgba(245,245,250,0.35)" />
        <rect x="26" y="57" width="20" height="5" rx="2.5" fill="rgba(245,245,250,0.22)" />
        <circle cx="64" cy="58" r="9" stroke="var(--accent2)" strokeWidth="2.5" />
        <path d="M62 54.5L67.5 58L62 61.5V54.5Z" fill="var(--accent2)" />
      </svg>
    );
  }

  if (type === 'social') {
    return (
      <svg viewBox="0 0 96 96" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="42" fill="rgba(0,229,255,0.06)" stroke="rgba(245,245,250,0.08)" />
        <circle cx="40" cy="40" r="8" stroke="var(--accent)" strokeWidth="2.4" />
        <path d="M27 62C27 54.8 32.8 50 40 50C47.2 50 53 54.8 53 62" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="60" cy="43" r="6" stroke="var(--accent2)" strokeWidth="2.2" />
        <path d="M56 61C57.5 56 61.5 53 66 53C69.5 53 72.5 55 74 58" stroke="var(--accent2)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 96" className="w-20 h-20 mx-auto" fill="none" aria-hidden="true">
      <circle cx="48" cy="48" r="42" fill="rgba(0,229,255,0.06)" stroke="rgba(245,245,250,0.08)" />
      <circle cx="48" cy="48" r="21" stroke="var(--accent)" strokeWidth="2.4" strokeOpacity="0.9" />
      <circle cx="48" cy="48" r="13" stroke="var(--accent2)" strokeWidth="1.6" strokeDasharray="4 4" />
      <circle cx="48" cy="48" r="5" fill="var(--accent)" />
      <path d="M31 27C36 23 42 21 48 21" stroke="var(--accent2)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function EmptyState({
  illustration = 'music',
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="surface-card rounded-3xl p-8 md:p-10 text-center space-y-4">
      <IllustrationSvg type={illustration} />
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-bold text-[#F5F5FA]">{title}</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
