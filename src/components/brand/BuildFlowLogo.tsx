import React from 'react';
import { cn } from '@/src/lib/utils';

interface BuildFlowLogoProps {
  theme?: 'dark' | 'light';
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
}

/**
 * Architectural geometric brand mark for BuildFlow — Fieldwork Edition.
 * Composed of structural drafting grid lines and a cantilevered terracotta beam.
 */
export const BuildFlowLogo: React.FC<BuildFlowLogoProps> = ({
  theme = 'light',
  compact = false,
  showTagline = false,
  className,
}) => {
  const isDark = theme === 'dark';
  const frameStroke = isDark ? '#F4F0E8' : '#252A27';
  const gridStroke = isDark ? 'rgba(244, 240, 232, 0.35)' : 'rgba(37, 42, 39, 0.28)';
  const accentColor = '#C66A3D';

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-[4px] border',
          compact ? 'h-8 w-8' : 'h-9 w-9',
          isDark
            ? 'border-[#3C433F] bg-[#1D211F]'
            : 'border-[#D8D1C5] bg-[#FFFFFF]'
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={compact ? 'h-5 w-5' : 'h-5.5 w-5.5'}
        >
          {/* Outer architectural drafting frame */}
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            stroke={frameStroke}
            strokeWidth="1.6"
          />
          {/* Subtle structural elevation guides */}
          <line x1="13.5" y1="4" x2="13.5" y2="28" stroke={gridStroke} strokeWidth="1.2" />
          <line x1="4" y1="18.5" x2="28" y2="18.5" stroke={gridStroke} strokeWidth="1.2" />
          {/* Structural L-column & cantilevered floor plate */}
          <path
            d="M8.5 23.5V9.5H19.5"
            stroke={frameStroke}
            strokeWidth="2.1"
            strokeLinecap="square"
          />
          {/* Terracotta datum beam & corner node */}
          <path
            d="M13.5 14.5H23.5V23.5"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="square"
          />
          <rect x="21.5" y="7.5" width="3.5" height="3.5" fill={accentColor} />
        </svg>
      </div>

      {!compact && (
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'font-display text-[15px] font-semibold tracking-[-0.025em]',
                isDark ? 'text-[#F4F0E8]' : 'text-[#252A27]'
              )}
            >
              BuildFlow
            </span>
            <span
              className={cn(
                'font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]',
                isDark ? 'text-[#C66A3D]' : 'text-[#A65229]'
              )}
            >
              FIELD
            </span>
          </div>
          {showTagline && (
            <span
              className={cn(
                'mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em]',
                isDark ? 'text-[#9B9990]' : 'text-[#77766F]'
              )}
            >
              Construction Ops
            </span>
          )}
        </div>
      )}
    </div>
  );
};
