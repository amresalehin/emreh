import React, { memo } from 'react';

/**
 * ChromeBlurredBackground
 * Faithfully reproduces the Google Chrome 4-color swirled backdrop from user Image 2:
 * - Chrome Yellow (#FBBC05) on the upper left
 * - Chrome Red (#EA4335) on the upper center / right
 * - Chrome Green (#34A853) on the lower left
 * - Chrome Blue (#4285F4) on the lower right & center
 * Rendered with soft organic blur filters and animated breathing drift.
 */
export const ChromeBlurredBackground: React.FC<{ className?: string; opacity?: number }> = memo(({
  className = '',
  opacity
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      style={{ opacity: opacity ?? undefined }}
      aria-hidden="true"
    >
      {/* 1. Large Swirling Chrome Yellow Arc (#FBBC05) - Upper Left */}
      <div
        className="absolute -top-24 -left-24 w-[680px] h-[680px] rounded-full blur-[110px] animate-orb-drift-1"
        style={{
          backgroundColor: '#FBBC05',
          opacity: 0.65
        }}
      />

      {/* 2. Large Swirling Chrome Red Arc (#EA4335) - Upper Center & Right */}
      <div
        className="absolute -top-20 right-1/4 w-[640px] h-[640px] rounded-full blur-[120px] animate-orb-drift-2"
        style={{
          backgroundColor: '#EA4335',
          opacity: 0.60
        }}
      />

      {/* 3. Large Swirling Chrome Green Arc (#34A853) - Lower Left & Bottom */}
      <div
        className="absolute -bottom-28 left-1/12 w-[620px] h-[620px] rounded-full blur-[115px] animate-orb-drift-3"
        style={{
          backgroundColor: '#34A853',
          opacity: 0.58
        }}
      />

      {/* 4. Large Swirling Chrome Blue Arc (#4285F4) - Right & Center-Right */}
      <div
        className="absolute top-1/4 -right-20 w-[720px] h-[720px] rounded-full blur-[125px] animate-orb-drift-1"
        style={{
          backgroundColor: '#4285F4',
          opacity: 0.68
        }}
      />

      {/* Chrome White/Clear Center Core Ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full blur-[80px] bg-white/20 dark:bg-black/20 pointer-events-none"
      />

      {/* Smooth Frosted Diffuser Mesh Layer */}
      <div className="absolute inset-0 backdrop-blur-[35px] bg-white/25 dark:bg-black/40" />
    </div>
  );
});

ChromeBlurredBackground.displayName = 'ChromeBlurredBackground';
