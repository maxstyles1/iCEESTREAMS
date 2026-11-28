interface EqualizerBarsProps {
  active: boolean;
  className?: string;
}

export default function EqualizerBars({ active, className = '' }: EqualizerBarsProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-end gap-[2.5px] h-3.5 shrink-0 ${className}`}
    >
      <span
        className={`w-[3px] h-full rounded-full bg-[var(--accent)] eq-bar eq-bar-1 ${
          active ? '' : 'eq-paused'
        }`}
      />
      <span
        className={`w-[3px] h-full rounded-full bg-[var(--accent2)] eq-bar eq-bar-2 ${
          active ? '' : 'eq-paused'
        }`}
      />
      <span
        className={`w-[3px] h-full rounded-full bg-[var(--accent)] eq-bar eq-bar-3 ${
          active ? '' : 'eq-paused'
        }`}
      />
      <span
        className={`w-[3px] h-full rounded-full bg-[var(--accent2)] eq-bar eq-bar-4 ${
          active ? '' : 'eq-paused'
        }`}
      />
    </span>
  );
}
