import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, ArrowRight } from 'lucide-react';

interface EmrehWelcomeCardProps {
  onClose?: () => void;
}

const WELCOME_STORAGE_KEY = 'emreh_welcomed';

export const EmrehWelcomeCard: React.FC<EmrehWelcomeCardProps> = ({
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const hasWelcomed = window.localStorage.getItem(WELCOME_STORAGE_KEY);

      if (!hasWelcomed) {
        const timer = window.setTimeout(() => setIsOpen(true), 450);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setIsOpen(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    } catch {
      // Continue even when localStorage is unavailable.
    }

    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Emreh"
    >
      {/* Immersive backdrop */}
      <button
        type="button"
        aria-label="Close welcome card"
        onClick={handleClose}
        className="absolute inset-0 cursor-default bg-black/[0.52] backdrop-blur-[10px] animate-in fade-in duration-500"
      />

      {/* Wide landscape welcome canvas */}
      <div
        className="
          relative
          w-full
          max-w-[920px]
          overflow-hidden
          rounded-[30px]
          ring-1 ring-white/[0.06]
          bg-[#141312]/[0.985]
          text-white
          shadow-[0_40px_120px_rgba(0,0,0,0.65)]
          backdrop-blur-2xl
          animate-in
          fade-in
          zoom-in-[0.97]
          duration-500
        "
        onClick={(event) => event.stopPropagation()}
      >
        {/* Deep ambient atmosphere */}
        <div className="pointer-events-none absolute -left-40 -top-36 h-[520px] w-[520px] rounded-full bg-[#d4a373]/[0.08] blur-[120px]" />
        <div className="pointer-events-none absolute -right-28 -bottom-40 h-[500px] w-[500px] rounded-full bg-[#b8afd0]/[0.08] blur-[120px]" />
        <div className="pointer-events-none absolute left-[34%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-[#d8d1bd]/[0.03] blur-[110px]" />

        {/* Top edge glow */}
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a373]/[0.2] to-transparent" />

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.025] text-[#8f9995] transition-all hover:bg-white/[0.07] hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative grid grid-cols-1 md:grid-cols-[0.95fr_1.35fr]">
          {/* Visual side */}
          <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden border-b border-white/[0.06] px-8 py-10 md:min-h-[470px] md:border-b-0 md:border-r md:px-12">
            {/* Fine radial wash */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(212,163,115,0.08),transparent_38%),radial-gradient(circle_at_20%_90%,rgba(189,178,211,0.06),transparent_36%)]" />

            <div className="relative flex flex-col items-center">
              <div className="relative">
                {/* Soft halo */}
                <div className="absolute -inset-7 rounded-full bg-gradient-to-br from-[#d4a373]/[0.12] via-transparent to-[#ddd9eb]/[0.08] blur-2xl" />

                {/* Icon */}
                <div className="relative h-[178px] w-[178px] rounded-full bg-gradient-to-br from-[#e0a96d] via-[#d4a373] to-[#ead9df] p-[2px] shadow-[0_16px_55px_rgba(212,163,115,0.14)]">
                  <div className="h-full w-full overflow-hidden rounded-full border border-white/[0.10] bg-[#0e0d0c]">
                    <img
                      src={`${import.meta.env.BASE_URL}app-icon.svg`}
                      alt="Emreh"
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.endsWith('emreh-logo.jpg')) {
                          target.src = `${import.meta.env.BASE_URL}emreh-logo.jpg`;
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-7 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-[27px] font-serif font-medium tracking-tight text-[#f1f3f1]">
                    Emreh
                  </h1>
                  <CheckCircle2 className="h-[18px] w-[18px] text-[#d4a373]" />
                </div>

                <div dir="rtl" lang="fa" className="mt-2 text-[19px] font-serif tracking-wide text-[#d4a373]">
                  اِمْرِه
                </div>
              </div>

              <div className="mt-7 flex items-center gap-2 font-sans text-xs uppercase tracking-wide text-neutral-400">
                <span className="h-px w-8 bg-white/[0.10]" />
                <span>A quiet place for your life</span>
                <span className="h-px w-8 bg-white/[0.10]" />
              </div>
            </div>
          </div>

          {/* Information side */}
          <div className="flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-10 md:px-12 lg:px-14">
            <div>
              <p className="font-sans text-xs tracking-wide uppercase text-neutral-400">
                Welcome to your space
              </p>

              <h2 className="mt-3 max-w-[520px] font-serif text-[30px] font-medium leading-[1.12] text-[#f0f2ef] sm:text-[36px]">
                A companion for the journey.
              </h2>

              <p className="mt-4 max-w-[520px] font-serif italic text-[14px] leading-[1.8] text-neutral-300 sm:text-[15px]">
                Emreh brings the pieces of your life together — quietly,
                personally, and in one intimate place.
              </p>
            </div>

            {/* Meaning panels */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl ring-1 ring-white/[0.05] bg-white/[0.02] shadow-[0_4px_24px_rgba(0,0,0,0.35)] px-5 py-4">
                <div dir="rtl" lang="fa" className="text-[21px] font-serif text-[#e0a96d]">
                  همراه
                </div>
                <div className="mt-1 font-serif text-sm text-[#d0d7d4]">Companion</div>
                <div className="mt-1 font-sans text-[10px] uppercase tracking-wider text-neutral-400">Persian</div>
              </div>

              <div className="rounded-2xl ring-1 ring-white/[0.05] bg-white/[0.02] shadow-[0_4px_24px_rgba(0,0,0,0.35)] px-5 py-4">
                <div className="text-[16px] font-serif font-medium tracking-[0.01em] text-[#e0a96d]">
                  amran- · ämrä
                </div>
                <div className="mt-1 font-serif text-sm text-[#d0d7d4]">Beloved</div>
                <div className="mt-1 font-sans text-[10px] uppercase tracking-wider text-neutral-400">Turkic</div>
              </div>
            </div>

            <p className="mt-5 max-w-[520px] font-serif italic text-xs leading-[1.7] text-neutral-400">
              A companion who walks beside you, and someone deeply loved.
            </p>

            <div className="mt-8 flex items-center justify-between gap-5 border-t border-white/[0.06] pt-6">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wider text-neutral-400">
                  Developed by
                </p>
                <p className="mt-1 font-serif text-sm font-medium text-neutral-200">
                  Amre Salehin
                </p>
              </div>

              <button
                aria-label="Enter Emreh"
                type="button"
                onClick={handleClose}
                className="group inline-flex items-center gap-2 rounded-xl bg-[#d4a373] hover:bg-[#e0a96d] px-5 py-3 font-sans text-xs font-semibold text-neutral-950 transition-all shadow-[0_2px_12px_rgba(212,163,115,0.25)] active:scale-[0.98] cursor-pointer"
              >
                Enter Emreh
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
