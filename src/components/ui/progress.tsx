import { cn } from '@/src/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({ value, className, indicatorClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-[2px] bg-[#E6E0D5]', className)}
    >
      <div
        className={cn(
          'h-full rounded-[2px] bg-[#C66A3D] transition-all duration-300',
          indicatorClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
