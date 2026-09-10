import { GlassTheme, LuminanceMode } from '../types';

export type ViewVariant =
  | 'journal'
  | 'spotify'
  | 'youtube'
  | 'browser'
  | 'notes'
  | 'map'
  | 'photo'
  | 'bookmarks'
  | 'default';

/**
 * Returns dynamic container/card styling classes according to GlassTheme and LuminanceMode.
 * In Light Liquid Glass: Uses distinct background saturation and higher-contrast borders
 * to clearly differentiate leaflets from the page background without losing liquid transparency.
 */
export function getLeafletCardClass(
  theme: GlassTheme = 'liquid-glass',
  luminance: LuminanceMode = 'dark',
  variant: ViewVariant = 'default'
): string {
  const isLiquid = theme === 'liquid-glass';
  const isLight = luminance === 'light';

  if (isLight && isLiquid) {
    // Light Liquid Glass:
    // Distinct saturation (saturate 190%, contrast 108%), 84%-92% opacity,
    // crisp 1.5px slate border (higher contrast than faint white) + specular meniscus rim
    let variantBorder = 'border-slate-300/90 hover:border-slate-400';
    let variantShadow = 'shadow-[0_12px_32px_-6px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';

    switch (variant) {
      case 'journal':
        variantBorder = 'border-rose-300/80 hover:border-rose-400';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(225,29,72,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
      case 'spotify':
        variantBorder = 'border-emerald-400/80 hover:border-emerald-500';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(16,185,129,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
      case 'youtube':
        variantBorder = 'border-rose-400/80 hover:border-rose-500';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(239,68,68,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
      case 'notes':
        variantBorder = 'border-amber-400/80 hover:border-amber-500';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(217,119,6,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
      case 'browser':
      case 'bookmarks':
        variantBorder = 'border-sky-400/80 hover:border-sky-500';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(2,132,199,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
      case 'map':
        variantBorder = 'border-teal-400/80 hover:border-teal-500';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(13,148,136,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
      case 'photo':
        variantBorder = 'border-indigo-300/80 hover:border-indigo-400';
        variantShadow = 'shadow-[0_12px_32px_-6px_rgba(99,102,241,0.14),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1.5px_2px_0_#ffffff]';
        break;
    }

    return `liquid-glass-surface bg-gradient-to-br from-white/94 via-white/88 to-white/82 backdrop-blur-2xl backdrop-saturate-[1.9] backdrop-contrast-[1.08] border-[1.5px] ${variantBorder} ${variantShadow} transition-all duration-200`;
  }

  if (isLight && !isLiquid) {
    // Light Solid Glass:
    // Pure, architectural, high opacity surface with crisp stone/neutral hairline border
    return 'solid-glass-surface bg-white/96 backdrop-blur-xl border border-stone-200 shadow-xs hover:border-stone-300 transition-all duration-150';
  }

  if (!isLight && isLiquid) {
    // Dark Liquid Glass:
    // Obsidian deep surface with cyan/azure refraction and translucent luminous border
    return 'liquid-glass-surface bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent bg-[#0c1626]/80 backdrop-blur-2xl backdrop-saturate-[2.2] border border-white/15 shadow-[0_14px_36px_-6px_rgba(0,0,0,0.6),inset_0_1.5px_2px_0_rgba(255,255,255,0.2)] hover:border-white/25 transition-all duration-200';
  }

  // Dark Solid Glass:
  return 'solid-glass-surface bg-[#14151a]/95 backdrop-blur-xl border border-stone-800 shadow-xs hover:border-stone-700 transition-all duration-150';
}

/**
 * Returns dynamic typography weights and high-contrast color classes.
 * Light Liquid Glass elevates weight to bold/semibold to guarantee effortless reading
 * against dynamic, saturated glass refractions.
 */
export function getTypographyStyles(
  theme: GlassTheme = 'liquid-glass',
  luminance: LuminanceMode = 'dark'
) {
  const isLiquid = theme === 'liquid-glass';
  const isLight = luminance === 'light';

  if (isLight && isLiquid) {
    return {
      title: 'font-extrabold text-[#050811] tracking-tight',
      heading: 'font-bold text-[#070b14]',
      body: 'font-semibold text-[#0f172a]',
      secondary: 'font-medium text-[#334155]',
      muted: 'font-medium text-[#475569]',
      mono: 'font-mono font-semibold text-[#1e293b]',
      badge: 'font-bold text-[#050811] bg-slate-900/10 border border-slate-900/15'
    };
  }

  if (isLight && !isLiquid) {
    return {
      title: 'font-bold text-stone-900 tracking-tight',
      heading: 'font-semibold text-stone-900',
      body: 'font-normal text-stone-800',
      secondary: 'font-normal text-stone-600',
      muted: 'font-normal text-stone-500',
      mono: 'font-mono font-medium text-stone-700',
      badge: 'font-medium text-stone-800 bg-stone-100 border border-stone-200'
    };
  }

  if (!isLight && isLiquid) {
    return {
      title: 'font-bold text-white tracking-tight',
      heading: 'font-semibold text-white',
      body: 'font-medium text-slate-100',
      secondary: 'font-normal text-slate-300',
      muted: 'font-normal text-slate-400',
      mono: 'font-mono font-medium text-slate-300',
      badge: 'font-semibold text-white bg-white/10 border border-white/15'
    };
  }

  // Dark Solid Glass
  return {
    title: 'font-semibold text-stone-100 tracking-tight',
    heading: 'font-medium text-stone-100',
    body: 'font-normal text-stone-200',
    secondary: 'font-normal text-stone-400',
    muted: 'font-normal text-stone-500',
    mono: 'font-mono text-stone-300',
    badge: 'font-medium text-stone-300 bg-stone-800 border border-stone-700'
  };
}

/**
 * Returns dynamic header bar styling (e.g. sticky section heads, toolbar headers)
 */
export function getHeaderBarClass(
  theme: GlassTheme = 'liquid-glass',
  luminance: LuminanceMode = 'dark'
): string {
  const isLiquid = theme === 'liquid-glass';
  const isLight = luminance === 'light';

  if (isLight && isLiquid) {
    return 'bg-white/92 backdrop-blur-2xl backdrop-saturate-[1.8] border-[1.5px] border-slate-300/90 shadow-[0_4px_16px_rgba(15,23,42,0.06),inset_0_1.5px_2px_#ffffff]';
  }
  if (isLight && !isLiquid) {
    return 'bg-white/95 backdrop-blur-xl border border-stone-200 shadow-xs';
  }
  if (!isLight && isLiquid) {
    return 'bg-[#0f172a]/90 backdrop-blur-2xl border border-white/15 shadow-sm';
  }
  return 'bg-[#16181f]/95 backdrop-blur-xl border border-stone-800 shadow-xs';
}
