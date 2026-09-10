import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';

interface EmrehProfileHoverCardProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export const EmrehProfileHoverCard: React.FC<
  EmrehProfileHoverCardProps
> = ({ isOpen, anchorRef, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState({
    top: 16,
    left: 76,
    arrowTop: 24,
  });

  /*
   * Position the card beside the profile button.
   */
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;

      const rect = anchorRef.current.getBoundingClientRect();

      const cardWidth = 330;
      const cardHeight = 450;
      const gap = 12;

      let left = rect.right + gap;

      // If there is not enough room on the right,
      // position the card on the left.
      if (left + cardWidth > window.innerWidth - 12) {
        left = rect.left - cardWidth - gap;
      }

      // Keep the card inside the viewport horizontally.
      left = Math.max(
        12,
        Math.min(
          window.innerWidth - cardWidth - 12,
          left
        )
      );

      // Keep the card inside the viewport vertically.
      const top = Math.max(
        12,
        Math.min(
          window.innerHeight - cardHeight - 12,
          rect.top - 20
        )
      );

      // Keep the arrow aligned with the profile button.
      const arrowTop = Math.max(
        18,
        Math.min(
          cardHeight - 30,
          rect.top + rect.height / 2 - top - 7
        )
      );

      setCoords({
        top,
        left,
        arrowTop,
      });
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  /*
   * Close when clicking outside or pressing Escape.
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideCard =
        cardRef.current?.contains(target);

      const clickedProfileButton =
        anchorRef.current?.contains(target);

      if (!clickedInsideCard && !clickedProfileButton) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );

      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label="About Emreh"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className="
        fixed
        z-[99999]
        w-[330px]
        rounded-2xl
        overflow-hidden
        border
        border-[#d5e1dc]/15
        bg-gradient-to-br
        from-[#171d1b]/98
        via-[#151719]/98
        to-[#1a181c]/98
        backdrop-blur-2xl
        shadow-[0_18px_50px_rgba(0,0,0,0.45)]
        text-white
        p-5
        select-none
        animate-in
        fade-in
        zoom-in-95
        duration-150
      "
    >
      {/* Calm ambient light */}
      <div
        className="
          absolute
          inset-0
          pointer-events-none
          bg-[radial-gradient(circle_at_15%_8%,rgba(190,225,215,0.075),transparent_40%),radial-gradient(circle_at_88%_88%,rgba(218,207,230,0.06),transparent_44%)]
        "
      />

      <div className="relative">

        {/* Arrow */}
        <div
          className="
            absolute
            -left-7
            w-3.5
            h-3.5
            rotate-45
            bg-[#171b1a]
            border-l
            border-b
            border-[#d5e1dc]/15
            pointer-events-none
          "
          style={{
            top: `${coords.arrowTop}px`,
          }}
        />

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="
            absolute
            right-[-4px]
            top-[-4px]
            z-10
            p-1.5
            rounded-full
            text-[#9fa9a5]
            hover:text-white
            hover:bg-white/[0.06]
            transition-colors
            cursor-pointer
          "
        >
          <X className="w-4 h-4" />
        </button>

        {/* Identity */}
        <div className="flex flex-col items-center text-center">

          {/* Profile image */}
          <div
            className="
              w-28
              h-28
              rounded-full
              p-[2px]
              bg-gradient-to-br
              from-[#cfe8df]
              via-[#ddd9eb]
              to-[#ead9df]
              shadow-[0_8px_30px_rgba(210,220,215,0.10)]
            "
          >
            <div
              className="
                w-full
                h-full
                rounded-full
                overflow-hidden
                bg-[#0d1010]
                border
                border-white/[0.08]
              "
            >
              <img
                src={`${import.meta.env.BASE_URL}app-icon.svg`}
                alt="Emreh"
                className="
                  w-full
                  h-full
                  object-contain
                "
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

          {/* Name */}
          <div className="flex items-center gap-1.5 mt-4">
            <h2
              className="
                text-xl
                font-semibold
                tracking-tight
                text-[#f2f3f1]
              "
            >
              Emreh
            </h2>

            <CheckCircle2
              className="
                w-4
                h-4
                text-[#b9cbc5]
              "
            />
          </div>

          {/* Script */}
          <div
            dir="rtl"
            lang="fa"
            className="
              mt-1.5
              text-base
              font-serif
              text-[#e1e9e5]
            "
          >
            اِمْرِه
          </div>

          {/* Meaning */}
          <div
            className="
              mt-5
              w-full
              pt-4
              border-t
              border-[#d5e1dc]/[0.07]
            "
          >
            {/* Persian */}
            <div className="flex flex-col items-center">
              <span
                dir="rtl"
                lang="fa"
                className="
                  text-lg
                  font-serif
                  text-[#dce5e1]
                "
              >
                همراه
              </span>

              <span
                className="
                  mt-1
                  text-xs
                  text-[#9da8a4]
                "
              >
                Companion
              </span>

              <span
                className="
                  mt-0.5
                  text-[10px]
                  uppercase
                  tracking-[0.14em]
                  text-[#69736f]
                "
              >
                Persian
              </span>
            </div>

            {/* Turkic */}
            <div className="mt-5 flex flex-col items-center">
              <span
                className="
                  text-sm
                  font-medium
                  tracking-wide
                  text-[#dce5e1]
                "
              >
                amran- · ämrä
              </span>

              <span
                className="
                  mt-1
                  text-xs
                  text-[#9da8a4]
                "
              >
                Beloved
              </span>

              <span
                className="
                  mt-0.5
                  text-[10px]
                  uppercase
                  tracking-[0.14em]
                  text-[#69736f]
                "
              >
                Turkic
              </span>
            </div>
          </div>

          {/* Short interpretation */}
          <p
            className="
              mt-5
              text-[11px]
              leading-relaxed
              text-[#858f8b]
            "
          >
            A companion who walks beside you,
            <br />
            and someone deeply loved.
          </p>

          {/* Divider */}
          <div
            className="
              w-full
              h-px
              bg-[#d5e1dc]/[0.08]
              my-5
            "
          />

          {/* Creator */}
          <p
            className="
              text-[11px]
              text-[#707b77]
            "
          >
            Developed by{' '}
            <span
              className="
                text-[#b9c5c1]
                font-medium
              "
            >
              Amre Salehin
            </span>
          </p>

        </div>
      </div>
    </div>,
    document.body
  );
};