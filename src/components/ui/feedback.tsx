import * as React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from './button';

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-[2px] bg-[#E6E0D5]', className)}
    >
      <div
        className={cn(
          'h-full rounded-[2px] bg-[#C66A3D] transition-all duration-300',
          barClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function LoadingState({
  rows = 4,
  label = 'Loading records...',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      className="rounded-[6px] border border-[#D8D1C5] bg-[#FFFFFF] p-5 space-y-3"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-4 w-44 rounded-[3px] bg-[#EFEAE0] animate-pulse" />
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full rounded-[4px] bg-[#FAF8F3] border border-[#E6E0D5] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-[#C9C1B3] bg-[#FAF8F3] px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] text-[#77766F]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-[#252A27]">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-[#77766F] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load data',
  message = 'Something went wrong while fetching records. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[6px] border border-[#E7BCB5] bg-[#FCEEEB]/60 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#F7DBD6] text-[#9A3026]">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#252A27]">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-[#57564F] leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
