interface SkeletonLoaderProps {
  variant?: 'tracks' | 'grid' | 'hero';
  count?: number;
}

export default function SkeletonLoader({
  variant = 'tracks',
  count = 4,
}: SkeletonLoaderProps) {
  if (variant === 'hero') {
    return (
      <div className="surface-card rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-full sm:w-40 aspect-square rounded-2xl shimmer-skeleton shrink-0" />
        <div className="flex-1 w-full space-y-3">
          <div className="h-3 w-28 rounded-full shimmer-skeleton" />
          <div className="h-7 w-2/3 rounded-xl shimmer-skeleton" />
          <div className="h-4 w-1/2 rounded-lg shimmer-skeleton" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 rounded-2xl shimmer-skeleton" />
            <div className="h-11 w-28 rounded-2xl shimmer-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="surface-card rounded-2xl p-3.5 space-y-3">
            <div className="w-full aspect-square rounded-2xl shimmer-skeleton" />
            <div className="h-4 w-3/4 rounded-lg shimmer-skeleton" />
            <div className="h-3 w-1/2 rounded-lg shimmer-skeleton" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface-card rounded-2xl p-3 flex items-center gap-3.5"
        >
          <div className="w-14 h-14 rounded-2xl shimmer-skeleton shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-48 max-w-[75%] rounded-lg shimmer-skeleton" />
            <div className="h-3 w-36 max-w-[55%] rounded-lg shimmer-skeleton" />
          </div>
          <div className="h-4 w-10 rounded-md shimmer-skeleton hidden sm:block shrink-0" />
        </div>
      ))}
    </div>
  );
}
