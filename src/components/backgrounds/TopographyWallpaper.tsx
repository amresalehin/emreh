import React, { memo } from 'react';

/**
 * TopographyWallpaper
 * Faithfully reproduces the colorful topographic contour elevation map from user Image 3:
 * - Dual summit ridges with hourglass caldera and elongated kidney-shaped caldera
 * - Elevation color strata:
 *   - Valleys / depressions: Deep marine blue, teal & ocean cyan (#004d40, #00838f, #006064)
 *   - Slopes: Emerald green, lime green, bright chartreuse (#2e7d32, #66bb6a, #c0ca33, #d4e157)
 *   - Plateau: Vibrant golden yellow (#fdd835, #fbc02d)
 *   - Higher ridges: Fiery orange, terracotta, coral red (#fb8c00, #f4511e, #e53935)
 *   - Summit caldera centers: Rich purple and deep magenta (#6a1b9a, #8e24aa)
 */
export const TopographyWallpaper: React.FC<{
  className?: string;
  opacity?: number;
  blurred?: boolean;
  variant?: 'light' | 'dark';
}> = memo(({
  className = '',
  opacity,
  blurred = false,
  variant = 'dark'
}) => {
  const isLight = variant === 'light';

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none transition-opacity duration-700 ${className}`}
      style={{ opacity: opacity ?? undefined }}
      aria-hidden="true"
    >
      <div
        className={`w-full h-full ${blurred ? 'blur-xl md:blur-2xl scale-110 transform-gpu' : ''} transition-all duration-500`}
        style={isLight ? { filter: 'brightness(1.55) saturate(0.85) contrast(0.85)' } : undefined}
      >
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1200 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
        <defs>
          <filter id="topoSubtleShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={isLight ? "#ffffff" : "#000000"} floodOpacity={isLight ? 0.3 : 0.25} />
          </filter>
        </defs>

        {/* Level 0: Marine/Pastel Base Layer */}
        <rect width="1200" height="900" fill={isLight ? "#e8faf0" : "#006064"} />

        {/* Level 1: Deep Teal Depressions & Water Basins */}
        <path
          d="M 0,0 L 1200,0 L 1200,900 L 0,900 Z"
          fill="#004D40"
        />
        <path
          d="M 0,150 Q 200,80 450,160 T 900,120 T 1200,180 L 1200,750 Q 950,820 650,740 T 200,820 T 0,780 Z"
          fill="#00796B"
        />

        {/* Level 2: Ocean Cyan Contour Band */}
        <path
          d="M 0,220 Q 220,160 480,220 T 920,180 T 1200,240 L 1200,680 Q 980,740 680,670 T 240,750 T 0,700 Z"
          fill="#00897B"
        />

        {/* Level 3: Forest Jade & Emerald Slopes */}
        <path
          d="M 40,280 Q 250,220 520,280 T 950,240 T 1160,300 Q 1120,620 720,610 T 280,680 T 40,620 Z"
          fill="#2E7D32"
        />
        <path
          d="M 70,320 Q 280,260 550,320 T 980,280 T 1120,340 Q 1080,570 750,560 T 320,620 T 70,560 Z"
          fill="#388E3C"
        />

        {/* Level 4: Bright Emerald & Lime Slopes */}
        <path
          d="M 100,350 Q 300,300 580,350 T 1000,320 T 1080,380 Q 1020,530 770,520 T 350,570 T 100,510 Z"
          fill="#43A047"
        />
        <path
          d="M 130,375 Q 320,335 600,375 T 1010,350 T 1050,405 Q 980,500 780,490 T 370,535 T 130,475 Z"
          fill="#66BB6A"
        />

        {/* Level 5: Chartreuse & Yellow-Green Foothills */}
        <path
          d="M 160,395 Q 340,360 620,395 T 980,380 T 1020,430 Q 950,480 770,470 T 380,510 T 160,450 Z"
          fill="#9CCC65"
        />
        <path
          d="M 190,410 Q 350,380 630,410 T 950,400 T 990,445 Q 920,465 750,455 T 390,490 T 190,435 Z"
          fill="#C0CA33"
        />
        <path
          d="M 210,420 Q 360,395 640,420 T 930,415 T 960,455 Q 890,460 730,450 T 400,475 T 210,430 Z"
          fill="#D4E157"
        />

        {/* Level 6: Golden Yellow Ridge Plateau */}
        <path
          d="M 230,425 Q 370,405 650,425 T 900,425 T 930,460 Q 860,458 710,445 T 410,465 T 230,425 Z"
          fill="#FFEE58"
        />
        <path
          d="M 245,430 Q 380,412 655,430 T 880,430 T 905,462 Q 830,455 695,442 T 420,460 T 245,430 Z"
          fill="#FDD835"
        />

        {/* ========================================================= */}
        {/* SUMMIT 1 (LEFT): Hourglass Peak Ridge (Matching Image 3)   */}
        {/* ========================================================= */}
        <g filter="url(#topoSubtleShadow)">
          {/* Amber / Warm Orange outer contour */}
          <path
            d="M 250,300 C 210,250 330,220 370,260 C 410,300 390,360 360,420 C 330,480 390,550 370,600 C 340,650 240,650 200,600 C 160,550 220,480 200,420 C 180,360 210,310 250,300 Z"
            fill="#FFB300"
          />
          {/* Vivid Fiery Orange contour */}
          <path
            d="M 260,320 C 230,280 320,250 350,280 C 380,315 365,370 340,420 C 315,470 365,530 350,570 C 325,610 245,610 215,570 C 185,530 235,470 215,420 C 195,370 225,330 260,320 Z"
            fill="#FB8C00"
          />
          {/* Terracotta Red contour */}
          <path
            d="M 270,340 C 250,310 310,280 335,305 C 360,335 345,380 325,425 C 305,470 345,515 330,545 C 310,575 250,575 230,545 C 210,515 250,470 230,425 C 210,380 240,350 270,340 Z"
            fill="#F4511E"
          />
          {/* Crimson Red caldera ring */}
          <path
            d="M 278,360 C 265,335 305,315 322,330 C 340,355 330,390 312,430 C 295,470 330,500 315,525 C 298,550 255,550 240,525 C 225,500 260,470 242,430 C 225,390 252,365 278,360 Z"
            fill="#E53935"
          />
          {/* Magenta inner wall */}
          <path
            d="M 282,380 C 275,360 300,345 312,355 C 325,375 318,400 305,435 C 290,470 318,488 305,505 C 292,525 262,525 252,505 C 242,488 268,470 255,435 C 242,400 262,385 282,380 Z"
            fill="#D81B60"
          />
          {/* Purple Peak Summit Core */}
          <path
            d="M 285,400 C 280,385 298,375 305,382 C 312,395 308,410 300,440 C 290,470 308,478 300,490 C 290,505 270,505 262,490 C 255,478 272,470 265,440 C 258,410 272,402 285,400 Z"
            fill="#8E24AA"
          />
          {/* Deep Violet Center Caldera Eye */}
          <ellipse cx="282" cy="440" rx="14" ry="28" fill="#4A148C" />
        </g>

        {/* ========================================================= */}
        {/* SUMMIT 2 (RIGHT): Elongated Kidney Peak (Matching Image 3) */}
        {/* ========================================================= */}
        <g filter="url(#topoSubtleShadow)">
          {/* Amber / Warm Orange outer contour */}
          <path
            d="M 680,280 C 760,200 920,240 960,350 C 990,430 940,530 890,600 C 840,670 720,680 650,620 C 580,560 620,460 630,390 C 640,320 620,310 680,280 Z"
            fill="#FFB300"
          />
          {/* Fiery Orange contour */}
          <path
            d="M 700,310 C 765,240 895,270 930,360 C 955,430 915,510 870,570 C 825,630 730,640 675,590 C 620,540 650,460 660,400 C 670,340 650,335 700,310 Z"
            fill="#FB8C00"
          />
          {/* Terracotta Red contour */}
          <path
            d="M 720,340 C 770,280 870,305 900,375 C 925,430 890,495 850,545 C 810,595 740,605 695,565 C 650,525 675,460 682,410 C 690,360 675,360 720,340 Z"
            fill="#F4511E"
          />
          {/* Crimson Red caldera ring */}
          <path
            d="M 740,365 C 780,315 855,335 878,390 C 898,435 870,480 835,520 C 800,560 750,570 715,540 C 680,510 700,460 705,420 C 710,380 705,380 740,365 Z"
            fill="#E53935"
          />
          {/* Magenta inner ridge */}
          <path
            d="M 760,390 C 790,345 840,365 855,405 C 870,440 848,470 820,500 C 792,530 760,538 735,518 C 710,495 722,460 728,430 C 732,400 732,400 760,390 Z"
            fill="#D81B60"
          />
          {/* Purple Peak Summit Core */}
          <path
            d="M 775,410 C 800,375 832,388 842,420 C 852,448 835,465 812,485 C 790,505 770,510 750,498 C 730,482 740,460 745,438 C 750,418 750,418 775,410 Z"
            fill="#8E24AA"
          />
          {/* Deep Violet Center Caldera Eye */}
          <path
            d="M 788,425 C 808,400 825,410 832,430 C 838,450 825,460 808,472 C 792,485 780,488 765,480 C 752,470 760,455 765,442 C 770,430 770,430 788,425 Z"
            fill="#4A148C"
          />
        </g>

        {/* ========================================================= */}
        {/* Intricate Topographic Contour Isolines (Fine Vector Lines) */}
        {/* ========================================================= */}
        <g stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.28" fill="none">
          <path d="M 0,150 Q 200,80 450,160 T 900,120 T 1200,180" />
          <path d="M 0,220 Q 220,160 480,220 T 920,180 T 1200,240" />
          <path d="M 40,280 Q 250,220 520,280 T 950,240 T 1160,300" />
          <path d="M 70,320 Q 280,260 550,320 T 980,280 T 1120,340" />
          <path d="M 100,350 Q 300,300 580,350 T 1000,320 T 1080,380" />
          <path d="M 130,375 Q 320,335 600,375 T 1010,350 T 1050,405" />
          <path d="M 160,395 Q 340,360 620,395 T 980,380 T 1020,430" />
          <path d="M 190,410 Q 350,380 630,410 T 950,400 T 990,445" />
          <path d="M 210,420 Q 360,395 640,420 T 930,415 T 960,455" />
          <path d="M 230,425 Q 370,405 650,425 T 900,425 T 930,460" />

          {/* Summit 1 isolines */}
          <path d="M 250,300 C 210,250 330,220 370,260 C 410,300 390,360 360,420 C 330,480 390,550 370,600 C 340,650 240,650 200,600 C 160,550 220,480 200,420 C 180,360 210,310 250,300 Z" />
          <path d="M 260,320 C 230,280 320,250 350,280 C 380,315 365,370 340,420 C 315,470 365,530 350,570 C 325,610 245,610 215,570 C 185,530 235,470 215,420 C 195,370 225,330 260,320 Z" />
          <path d="M 270,340 C 250,310 310,280 335,305 C 360,335 345,380 325,425 C 305,470 345,515 330,545 C 310,575 250,575 230,545 C 210,515 250,470 230,425 C 210,380 240,350 270,340 Z" />
          <path d="M 278,360 C 265,335 305,315 322,330 C 340,355 330,390 312,430 C 295,470 330,500 315,525 C 298,550 255,550 240,525 C 225,500 260,470 242,430 C 225,390 252,365 278,360 Z" />

          {/* Summit 2 isolines */}
          <path d="M 680,280 C 760,200 920,240 960,350 C 990,430 940,530 890,600 C 840,670 720,680 650,620 C 580,560 620,460 630,390 C 640,320 620,310 680,280 Z" />
          <path d="M 700,310 C 765,240 895,270 930,360 C 955,430 915,510 870,570 C 825,630 730,640 675,590 C 620,540 650,460 660,400 C 670,340 650,335 700,310 Z" />
          <path d="M 720,340 C 770,280 870,305 900,375 C 925,430 890,495 850,545 C 810,595 740,605 695,565 C 650,525 675,460 682,410 C 690,360 675,360 720,340 Z" />
          <path d="M 740,365 C 780,315 855,335 878,390 C 898,435 870,480 835,520 C 800,560 750,570 715,540 C 680,510 700,460 705,420 C 710,380 705,380 740,365 Z" />
        </g>

        {/* Ambient Topo Mist Overlay */}
        <rect x="0" y="0" width="1200" height="900" fill="rgba(0,0,0,0.08)" />
      </svg>
      </div>
    </div>
  );
});

TopographyWallpaper.displayName = 'TopographyWallpaper';
