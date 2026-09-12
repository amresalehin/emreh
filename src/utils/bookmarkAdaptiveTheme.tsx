import React from 'react';

export interface BookmarkThemePalette {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  badgeBg: string;
  borderClass: string;
  buttonGradient: string;
  headerGlass: string;
  sidebarGlass: string;
  containerBgClass: string;
  glowOrbs: React.ReactNode;
}

export function getBookmarkAdaptiveTheme(
  activeSubview: string,
  mediaType?: string,
  activeDomain?: string
): BookmarkThemePalette {
  const subview = (activeSubview || '').toLowerCase();
  const domain = (activeDomain || '').toLowerCase();
  const media = (mediaType || '').toLowerCase();

  // 1. Pinterest (Vibrant Crimson Red)
  if (subview === 'pinterest' || domain.includes('pinterest') || domain.includes('pin.it')) {
    return {
      id: 'pinterest',
      name: 'Pinterest Crimson Red',
      primaryColor: '#E60023',
      secondaryColor: '#FF1744',
      accentColor: '#FF5252',
      badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      borderClass: 'border-red-500/25',
      buttonGradient: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/25 text-white shadow-[0_4px_25px_rgba(230,0,35,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/25 shadow-[4px_0_25px_rgba(230,0,35,0.18)]',
      containerBgClass: 'dynamic-bg-bookmarks-pinterest text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-[#E60023]/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-rose-600/40 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-red-500/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 2. mymind (Signature Radiant Warm Orange)
  if (subview === 'mymind' || domain.includes('mymind')) {
    return {
      id: 'mymind',
      name: 'mymind Radiant Orange',
      primaryColor: '#FF7700',
      secondaryColor: '#F97316',
      accentColor: '#FB923C',
      badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
      borderClass: 'border-orange-500/25',
      buttonGradient: 'from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-orange-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-orange-500/25 text-white shadow-[0_4px_25px_rgba(255,119,0,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-orange-500/25 shadow-[4px_0_25px_rgba(255,119,0,0.18)]',
      containerBgClass: 'dynamic-bg-bookmarks-mymind text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-[#FF7700]/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-amber-500/40 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-orange-600/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 3. YouTube or Video Media Content
  if (subview === 'youtube' || domain.includes('youtube') || domain.includes('youtu.be') || media === 'video') {
    return {
      id: 'youtube',
      name: 'YouTube Crimson Red',
      primaryColor: '#FF0000',
      secondaryColor: '#DC2626',
      accentColor: '#F87171',
      badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      borderClass: 'border-red-500/25',
      buttonGradient: 'from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-red-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/25 text-white shadow-[0_4px_25px_rgba(255,0,0,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/25 shadow-[4px_0_25px_rgba(255,0,0,0.18)]',
      containerBgClass: 'dynamic-bg-bookmarks-pinterest text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-red-600/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-rose-600/40 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-red-500/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 4. Spotify or Audio Media Content
  if (subview === 'spotify' || domain.includes('spotify') || media === 'audio') {
    return {
      id: 'spotify',
      name: 'Spotify Green',
      primaryColor: '#1DB954',
      secondaryColor: '#10B981',
      accentColor: '#34D399',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      borderClass: 'border-emerald-500/25',
      buttonGradient: 'from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/25 text-white shadow-[0_4px_25px_rgba(29,185,84,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/25 shadow-[4px_0_25px_rgba(29,185,84,0.18)]',
      containerBgClass: 'dynamic-bg-spotify text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-[#1DB954]/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-emerald-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-teal-500/35 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 5. GitHub / Developer Code Content
  if (subview === 'github' || domain.includes('github') || domain.includes('gitlab') || media === 'code') {
    return {
      id: 'github',
      name: 'GitHub Violet & Obsidian',
      primaryColor: '#8B5CF6',
      secondaryColor: '#6366F1',
      accentColor: '#A78BFA',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      borderClass: 'border-purple-500/25',
      buttonGradient: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-purple-500/25 text-white shadow-[0_4px_25px_rgba(139,92,246,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-purple-500/25 shadow-[4px_0_25px_rgba(139,92,246,0.18)]',
      containerBgClass: 'dynamic-bg-bookmarks-github text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-purple-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-indigo-600/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-fuchsia-600/30 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 6. Linkding (Sea Green / Jade)
  if (subview === 'linkding') {
    return {
      id: 'linkding',
      name: 'Linkding Sea Green',
      primaryColor: '#059669',
      secondaryColor: '#10B981',
      accentColor: '#2DD4BF',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      borderClass: 'border-emerald-500/25',
      buttonGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/25 text-white shadow-[0_4px_25px_rgba(5,150,105,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/25 shadow-[4px_0_25px_rgba(5,150,105,0.18)]',
      containerBgClass: 'dynamic-bg-spotify text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-emerald-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-teal-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-green-500/30 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 7. Pocket (Coral Red)
  if (subview === 'pocket') {
    return {
      id: 'pocket',
      name: 'Pocket Coral Red',
      primaryColor: '#EF4056',
      secondaryColor: '#F87171',
      accentColor: '#FB7185',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      borderClass: 'border-rose-500/25',
      buttonGradient: 'from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 shadow-rose-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-rose-500/25 text-white shadow-[0_4px_25px_rgba(239,64,86,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-rose-500/25 shadow-[4px_0_25px_rgba(239,64,86,0.18)]',
      containerBgClass: 'dynamic-bg-photos text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-rose-500/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-red-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-amber-500/30 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 8. Raindrop (Cerulean Blue)
  if (subview === 'raindrop') {
    return {
      id: 'raindrop',
      name: 'Raindrop Cerulean Blue',
      primaryColor: '#0089FF',
      secondaryColor: '#38BDF8',
      accentColor: '#0284C7',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      borderClass: 'border-blue-500/25',
      buttonGradient: 'from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-blue-500/25',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/25 text-white shadow-[0_4px_25px_rgba(0,137,255,0.18)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/25 shadow-[4px_0_25px_rgba(0,137,255,0.18)]',
      containerBgClass: 'dynamic-bg-box text-gray-900 dark:text-gray-100',
      glowOrbs: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-blue-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-sky-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-indigo-500/30 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    };
  }

  // 9. DEFAULT / INITIAL: Pink & Sea Green (User explicitly requested: "the book mark will be intially on a pink and sea green")
  return {
    id: 'pink_seagreen',
    name: 'Pink & Sea Green',
    primaryColor: '#EC4899',
    secondaryColor: '#10B981',
    accentColor: '#2DD4BF',
    badgeBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
    borderClass: 'border-pink-500/25 dark:border-pink-500/30',
    buttonGradient: 'from-pink-500 via-rose-500 to-teal-500 hover:from-pink-400 hover:via-rose-400 hover:to-teal-400 shadow-pink-500/25',
    headerGlass: 'bg-black/25 backdrop-blur-2xl border-pink-500/25 text-white shadow-[0_4px_25px_rgba(236,72,153,0.18)]',
    sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-teal-500/25 shadow-[4px_0_25px_rgba(16,185,129,0.18)]',
    containerBgClass: 'dynamic-bg-bookmarks-pink-seagreen text-gray-900 dark:text-gray-100',
    glowOrbs: (
      <>
        {/* Hot Pink Orb */}
        <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-pink-500/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
        {/* Sea Green / Emerald Orb */}
        <div className="absolute top-1/3 -right-32 w-[580px] h-[580px] rounded-full bg-emerald-500/40 blur-[140px] pointer-events-none animate-orb-drift-2" />
        {/* Mint Seafoam Orb */}
        <div className="absolute -bottom-40 left-1/3 w-[580px] h-[580px] rounded-full bg-teal-400/35 blur-[130px] pointer-events-none animate-orb-drift-3" />
        {/* Coral Rose Orb */}
        <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] rounded-full bg-rose-400/30 blur-[120px] pointer-events-none animate-orb-drift-1" />
      </>
    )
  };
}
