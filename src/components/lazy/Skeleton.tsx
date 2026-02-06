/**
 * Skeleton - Loading placeholder components
 * Used as fallbacks for lazy-loaded components
 */

interface SkeletonProps {
  className?: string;
}

export function ModalSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-2xl p-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-32 bg-dark-700 rounded" />
          <div className="h-6 w-6 bg-dark-700 rounded" />
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-dark-700 rounded" />
              <div className="h-10 bg-dark-700 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-dark-700 rounded" />
              <div className="h-10 bg-dark-700 rounded" />
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-dark-700 rounded" />
            <div className="h-10 w-32 bg-dark-700 rounded" />
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="mt-6 pt-4 border-t border-dark-700 flex justify-end">
          <div className="h-10 w-20 bg-dark-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TerminalSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-dark-950 rounded-lg overflow-hidden ${className}`} style={{ minHeight: '200px' }}>
      <div className="animate-pulse p-4 space-y-3">
        {/* Terminal header */}
        <div className="flex items-center gap-2 pb-2 border-b border-dark-800">
          <div className="h-3 w-3 rounded-full bg-red-500/50" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
          <div className="h-3 w-3 rounded-full bg-green-500/50" />
          <div className="h-4 w-24 bg-dark-700 rounded ml-2" />
        </div>
        
        {/* Terminal lines */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 bg-cyan-500/30 rounded" />
            <div className="h-3 w-48 bg-dark-700 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 bg-cyan-500/30 rounded" />
            <div className="h-3 w-64 bg-dark-700 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 bg-cyan-500/30 rounded" />
            <div className="h-3 w-32 bg-dark-700 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 bg-cyan-500/30 rounded" />
            <div className="h-3 w-56 bg-dark-700 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 bg-green-500/50 rounded animate-blink" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-lg p-6 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-24 bg-dark-700 rounded" />
          <div className="h-6 w-6 bg-dark-700 rounded" />
        </div>
        
        {/* Settings items */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-dark-700 rounded" />
                <div className="h-3 w-48 bg-dark-800 rounded" />
              </div>
              <div className="h-6 w-12 bg-dark-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatViewSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex-1 flex flex-col min-h-0 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-800 animate-pulse">
        <div className="h-8 w-48 bg-dark-700 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-dark-700 rounded" />
          <div className="h-8 w-20 bg-dark-700 rounded" />
        </div>
      </div>
      
      {/* Messages skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md space-y-2 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
              <div className="h-4 w-20 bg-dark-700 rounded" />
              <div className="h-24 w-72 bg-dark-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Input skeleton */}
      <div className="px-4 py-3 border-t border-dark-800 animate-pulse">
        <div className="h-12 bg-dark-700 rounded-lg" />
      </div>
    </div>
  );
}

export function PersonaCardSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-dark-800 rounded-lg p-4 animate-pulse ${className}`}>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 bg-dark-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-24 bg-dark-700 rounded" />
          <div className="h-4 w-32 bg-dark-700 rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full bg-dark-700 rounded" />
        <div className="h-3 w-3/4 bg-dark-700 rounded" />
      </div>
    </div>
  );
}

// Generic shimmer effect component
export function Shimmer({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 bg-[length:200%_100%] animate-shimmer ${className}`}
    />
  );
}
