import React, { memo } from 'react';

/**
 * LowPolyWallpaper
 * Faithfully reproduces the crystalline low-poly geometric polygon artwork from user Image 1:
 * - Upper right & top: warm amber, golden orange, coral red facets
 * - Middle & upper-left: vibrant cyan, turquoise, electric azure facets
 * - Center & lower-mid: deep cobalt, indigo, royal violet facets
 * - Bottom & lower edges: vivid hot pink, magenta, warm coral facets
 */
export const LowPolyWallpaper: React.FC<{
  className?: string;
  opacity?: number;
  blurred?: boolean;
  blurAmount?: string;
  variant?: 'light' | 'dark';
}> = memo(({
  className = '',
  opacity,
  blurred = false,
  blurAmount = '32px',
  variant = 'dark'
}) => {
  const isLight = variant === 'light';
  const filterStyle = isLight
    ? `${blurred ? `blur(${blurAmount}) ` : ''}brightness(1.55) saturate(0.85) contrast(0.85)`
    : blurred
    ? `blur(${blurAmount})`
    : undefined;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none transition-opacity duration-700 ${className}`}
      style={{
        opacity: opacity ?? undefined,
        filter: filterStyle,
        transform: blurred ? 'scale(1.12)' : undefined,
        transformOrigin: 'center center'
      }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1000 1300"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle soft shimmer gradients for ambient depth */}
          <linearGradient id="facetShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isLight ? "0.2" : "0.08"} />
            <stop offset="50%" stopColor="#ffffff" stopOpacity={isLight ? "0.1" : "0"} />
            <stop offset="100%" stopColor={isLight ? "#ffffff" : "#000000"} stopOpacity={isLight ? "0.15" : "0.12"} />
          </linearGradient>
        </defs>

        {/* --- Top Region: Fiery Orange, Amber, Coral Pink --- */}
        <polygon points="0,0 260,0 120,120" fill="#E65100" />
        <polygon points="260,0 520,0 380,95" fill="#F57C00" />
        <polygon points="520,0 780,0 640,70" fill="#FFA726" />
        <polygon points="780,0 1000,0 880,105" fill="#FFB74D" />
        <polygon points="1000,0 1000,160 880,105" fill="#FFA726" />

        <polygon points="0,0 120,120 0,190" fill="#D84315" />
        <polygon points="120,120 260,0 380,95" fill="#EF6C00" />
        <polygon points="260,0 380,95 520,0" fill="#FB8C00" />
        <polygon points="380,95 520,0 640,70" fill="#FFA726" />
        <polygon points="520,0 640,70 780,0" fill="#FFB74D" />
        <polygon points="640,70 780,0 880,105" fill="#FFA726" />
        <polygon points="880,105 1000,160 860,240" fill="#FB8C00" />

        {/* --- Upper-Mid Transition: Coral Red to Hot Pink to Amber --- */}
        <polygon points="120,120 0,190 140,240" fill="#C2185B" />
        <polygon points="120,120 380,95 270,220" fill="#E53935" />
        <polygon points="120,120 140,240 270,220" fill="#D81B60" />
        <polygon points="380,95 640,70 480,210" fill="#F4511E" />
        <polygon points="380,95 270,220 480,210" fill="#FB8C00" />
        <polygon points="640,70 880,105 760,205" fill="#FFA000" />
        <polygon points="640,70 480,210 760,205" fill="#FF7043" />
        <polygon points="880,105 860,240 760,205" fill="#FF8A65" />
        <polygon points="860,240 1000,160 1000,320" fill="#FF5722" />
        <polygon points="860,240 1000,320 890,360" fill="#E64A19" />

        {/* --- Middle Left: Bright Cyan, Turquoise, Aqua Azure --- */}
        <polygon points="0,190 140,240 0,340" fill="#00ACC1" />
        <polygon points="140,240 0,340 110,410" fill="#00BCD4" />
        <polygon points="140,240 270,220 220,350" fill="#03A9F4" />
        <polygon points="140,240 110,410 220,350" fill="#26C6DA" />
        <polygon points="0,340 110,410 0,510" fill="#0097A7" />
        <polygon points="110,410 0,510 130,570" fill="#00838F" />
        <polygon points="110,410 220,350 360,390" fill="#4DD0E1" />
        <polygon points="110,410 130,570 300,530" fill="#00BCD4" />
        <polygon points="220,350 360,390 300,530" fill="#29B6F6" />

        <polygon points="270,220 480,210 430,340" fill="#80DEEA" />
        <polygon points="270,220 220,350 430,340" fill="#4DD0E1" />
        <polygon points="480,210 760,205 640,330" fill="#FF4081" />
        <polygon points="480,210 430,340 640,330" fill="#00E5FF" />
        <polygon points="760,205 860,240 780,350" fill="#F06292" />
        <polygon points="760,205 640,330 780,350" fill="#E91E63" />
        <polygon points="860,240 890,360 780,350" fill="#EC407A" />
        <polygon points="890,360 1000,320 1000,470" fill="#D81B60" />
        <polygon points="890,360 780,350 920,440" fill="#C2185B" />
        <polygon points="890,360 920,440 1000,470" fill="#AD1457" />

        {/* --- Center Region: Electric Azure, Cerulean, Royal Blue --- */}
        <polygon points="360,390 430,340 570,440" fill="#00B0FF" />
        <polygon points="430,340 640,330 570,440" fill="#0288D1" />
        <polygon points="640,330 780,350 740,470" fill="#5C6BC0" />
        <polygon points="640,330 570,440 740,470" fill="#3F51B5" />
        <polygon points="780,350 920,440 740,470" fill="#8E24AA" />
        <polygon points="920,440 1000,470 940,580" fill="#6A1B9A" />
        <polygon points="920,440 740,470 850,560" fill="#7B1FA2" />
        <polygon points="920,440 850,560 940,580" fill="#4A148C" />

        <polygon points="360,390 570,440 480,550" fill="#2979FF" />
        <polygon points="360,390 300,530 480,550" fill="#0091EA" />
        <polygon points="570,440 740,470 660,570" fill="#3D5AFE" />
        <polygon points="570,440 480,550 660,570" fill="#304FFE" />
        <polygon points="740,470 850,560 660,570" fill="#536DFE" />
        <polygon points="850,560 940,580 870,680" fill="#311B92" />
        <polygon points="850,560 660,570 790,690" fill="#4527A0" />
        <polygon points="850,560 790,690 870,680" fill="#283593" />
        <polygon points="940,580 1000,470 1000,660" fill="#4A148C" />
        <polygon points="940,580 1000,660 870,680" fill="#1A237E" />

        {/* --- Lower Mid: Vibrant Cobalt, Electric Violet, Royal Purple --- */}
        <polygon points="0,510 130,570 0,690" fill="#006064" />
        <polygon points="130,570 0,690 120,740" fill="#01579B" />
        <polygon points="130,570 300,530 240,680" fill="#0277BD" />
        <polygon points="130,570 120,740 240,680" fill="#0D47A1" />
        <polygon points="300,530 480,550 380,690" fill="#1565C0" />
        <polygon points="300,530 240,680 380,690" fill="#1976D2" />
        <polygon points="480,550 660,570 540,700" fill="#283593" />
        <polygon points="480,550 380,690 540,700" fill="#1E88E5" />
        <polygon points="660,570 790,690 680,790" fill="#304FFE" />
        <polygon points="660,570 540,700 680,790" fill="#3D5AFE" />
        <polygon points="790,690 870,680 820,810" fill="#283593" />
        <polygon points="790,690 680,790 820,810" fill="#3F51B5" />
        <polygon points="870,680 1000,660 1000,810" fill="#1A237E" />
        <polygon points="870,680 1000,810 820,810" fill="#0D47A1" />

        {/* --- Lower Region: Deep Violet, Electric Blue, Magenta Base --- */}
        <polygon points="0,690 120,740 0,870" fill="#0D47A1" />
        <polygon points="120,740 0,870 140,920" fill="#1A237E" />
        <polygon points="120,740 240,680 270,830" fill="#283593" />
        <polygon points="120,740 140,920 270,830" fill="#311B92" />
        <polygon points="240,680 380,690 270,830" fill="#304FFE" />
        <polygon points="380,690 540,700 440,840" fill="#3D5AFE" />
        <polygon points="380,690 270,830 440,840" fill="#2979FF" />
        <polygon points="540,700 680,790 580,910" fill="#536DFE" />
        <polygon points="540,700 440,840 580,910" fill="#3F51B5" />
        <polygon points="680,790 820,810 740,930" fill="#3D5AFE" />
        <polygon points="680,790 580,910 740,930" fill="#304FFE" />
        <polygon points="820,810 1000,810 910,930" fill="#283593" />
        <polygon points="820,810 740,930 910,930" fill="#1E88E5" />
        <polygon points="1000,810 1000,960 910,930" fill="#1565C0" />

        {/* --- Bottom-most Region: Hot Magenta, Coral Pink, Warm Sunset Flare --- */}
        <polygon points="0,870 140,920 0,1050" fill="#4A148C" />
        <polygon points="140,920 0,1050 110,1110" fill="#6A1B9A" />
        <polygon points="140,920 270,830 260,990" fill="#7B1FA2" />
        <polygon points="140,920 110,1110 260,990" fill="#8E24AA" />
        <polygon points="270,830 440,840 370,990" fill="#651FFF" />
        <polygon points="270,830 260,990 370,990" fill="#7C4DFF" />
        <polygon points="440,840 580,910 490,1030" fill="#3D5AFE" />
        <polygon points="440,840 370,990 490,1030" fill="#536DFE" />
        <polygon points="580,910 740,930 670,1040" fill="#2979FF" />
        <polygon points="580,910 490,1030 670,1040" fill="#3D5AFE" />
        <polygon points="740,930 910,930 830,1050" fill="#1E88E5" />
        <polygon points="740,930 670,1040 830,1050" fill="#283593" />
        <polygon points="910,930 1000,960 960,1080" fill="#1565C0" />
        <polygon points="910,930 830,1050 960,1080" fill="#0D47A1" />
        <polygon points="1000,960 1000,1130 960,1080" fill="#0A387E" />

        {/* Bottom Horizon Flashes (Coral Pink, Orange & Hot Magenta matching bottom of Image 1) */}
        <polygon points="0,1050 110,1110 0,1300" fill="#D81B60" />
        <polygon points="110,1110 0,1300 130,1300" fill="#E91E63" />
        <polygon points="110,1110 260,990 280,1160" fill="#C2185B" />
        <polygon points="110,1110 130,1300 280,1160" fill="#AD1457" />
        <polygon points="260,990 370,990 390,1140" fill="#FF4081" />
        <polygon points="260,990 280,1160 390,1140" fill="#F50057" />
        <polygon points="280,1160 130,1300 350,1300" fill="#E040FB" />
        <polygon points="280,1160 350,1300 390,1140" fill="#FF1744" />
        <polygon points="370,990 490,1030 520,1150" fill="#FF7043" />
        <polygon points="370,990 390,1140 520,1150" fill="#FF5722" />
        <polygon points="390,1140 350,1300 540,1300" fill="#FF5252" />
        <polygon points="390,1140 520,1150 540,1300" fill="#FF7043" />
        <polygon points="490,1030 670,1040 630,1170" fill="#FF8A65" />
        <polygon points="490,1030 520,1150 630,1170" fill="#FFA726" />
        <polygon points="520,1150 540,1300 710,1300" fill="#FF9800" />
        <polygon points="520,1150 630,1170 710,1300" fill="#FB8C00" />
        <polygon points="670,1040 830,1050 780,1180" fill="#5C6BC0" />
        <polygon points="670,1040 630,1170 780,1180" fill="#7986CB" />
        <polygon points="630,1170 710,1300 860,1300" fill="#3F51B5" />
        <polygon points="630,1170 780,1180 860,1300" fill="#304FFE" />
        <polygon points="830,1050 960,1080 920,1210" fill="#283593" />
        <polygon points="830,1050 780,1180 920,1210" fill="#1A237E" />
        <polygon points="780,1180 860,1300 970,1300" fill="#1565C0" />
        <polygon points="780,1180 920,1210 970,1300" fill="#0D47A1" />
        <polygon points="960,1080 1000,1130 1000,1300" fill="#0A387E" />
        <polygon points="960,1080 920,1210 1000,1300" fill="#082A60" />
        <polygon points="920,1210 970,1300 1000,1300" fill="#051B3E" />

        {/* Global Shimmer Overlay */}
        <rect x="0" y="0" width="1000" height="1300" fill="url(#facetShimmer)" />
      </svg>
    </div>
  );
});

LowPolyWallpaper.displayName = 'LowPolyWallpaper';
