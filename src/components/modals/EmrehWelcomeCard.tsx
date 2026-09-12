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
          border border-white/[0.11]
          bg-[#141817]/[0.985]
          text-white
          shadow-[0_40px_120px_rgba(0,0,0,0.52)]
          backdrop-blur-2xl
          animate-in
          fade-in
          zoom-in-[0.97]
          duration-500
        "
        onClick={(event) => event.stopPropagation()}
      >
        {/* Deep ambient atmosphere */}
        <div className="pointer-events-none absolute -left-40 -top-36 h-[520px] w-[520px] rounded-full bg-[#9fc9ba]/[0.11] blur-[120px]" />
        <div className="pointer-events-none absolute -right-28 -bottom-40 h-[500px] w-[500px] rounded-full bg-[#b8afd0]/[0.10] blur-[120px]" />
        <div className="pointer-events-none absolute left-[34%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-[#d8d1bd]/[0.035] blur-[110px]" />

        {/* Top edge glow */}
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.16] to-transparent" />

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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(208,225,218,0.10),transparent_38%),radial-gradient(circle_at_20%_90%,rgba(189,178,211,0.07),transparent_36%)]" />

            <div className="relative flex flex-col items-center">
              <div className="relative">
                {/* Soft halo */}
                <div className="absolute -inset-7 rounded-full bg-gradient-to-br from-[#cfe8df]/[0.10] via-transparent to-[#ddd9eb]/[0.08] blur-2xl" />

                {/* Icon */}
                <div className="relative h-[178px] w-[178px] rounded-full bg-gradient-to-br from-[#cfe8df] via-[#d7d4e0] to-[#ead9df] p-[2px] shadow-[0_16px_55px_rgba(210,220,215,0.14)]">
                  <div className="h-full w-full overflow-hidden rounded-full border border-white/[0.10] bg-[#0b0e0d]">
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
                  <h1 className="text-[27px] font-semibold tracking-[-0.04em] text-[#f1f3f1]">
                    Emreh
                  </h1>
                  <CheckCircle2 className="h-[18px] w-[18px] text-[#b9cbc5]" />
                </div>

                <div dir="rtl" lang="fa" className="mt-2 text-[19px] font-serif tracking-wide text-[#d5ded9]">
                  اِمْرِه
                </div>
              </div>

              <div className="mt-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#68736e]">
                <span className="h-px w-8 bg-white/[0.10]" />
                <span>A quiet place for your life</span>
                <span className="h-px w-8 bg-white/[0.10]" />
              </div>
            </div>
          </div>

          {/* Information side */}
          <div className="flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-10 md:px-12 lg:px-14">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#76817d]">
                Welcome to your space
              </p>

              <h2 className="mt-3 max-w-[520px] text-[30px] font-medium leading-[1.08] tracking-[-0.04em] text-[#f0f2ef] sm:text-[35px]">
                A companion for the journey.
              </h2>

              <p className="mt-4 max-w-[520px] text-[13px] leading-[1.75] text-[#929d98] sm:text-[14px]">
                Emreh brings the pieces of your life together — quietly,
                personally, and in one place.
              </p>
            </div>

            {/* Meaning panels */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.028] px-5 py-4">
                <div dir="rtl" lang="fa" className="text-[21px] font-serif text-[#e1e8e4]">
                  همراه
                </div>
                <div className="mt-1 text-[13px] text-[#d0d7d4]">Companion</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#68736e]">Persian</div>
              </div>

              <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.028] px-5 py-4">
                <div className="text-[16px] font-medium tracking-[0.01em] text-[#e1e8e4]">
                  amran- · ämrä
                </div>
                <div className="mt-1 text-[13px] text-[#d0d7d4]">Beloved</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#68736e]">Turkic</div>
              </div>
            </div>

            <p className="mt-5 max-w-[520px] text-[12px] leading-[1.7] text-[#858f8b]">
              A companion who walks beside you, and someone deeply loved.
            </p>

            <div className="mt-8 flex items-center justify-between gap-5 border-t border-white/[0.07] pt-6">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#66716d]">
                  Developed by
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#c0cac6]">
                  Amre Salehin
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="group inline-flex items-center gap-2 rounded-[14px] border border-[#d5e1dc]/[0.11] bg-[#d5e1dc]/[0.07] px-5 py-3 text-[12px] font-medium text-[#dce4e0] transition-all hover:border-[#d5e1dc]/[0.17] hover:bg-[#d5e1dc]/[0.12] active:scale-[0.99] cursor-pointer"
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
