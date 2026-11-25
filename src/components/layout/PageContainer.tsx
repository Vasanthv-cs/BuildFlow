import * as React from 'react';
import { cn } from '@/src/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  kicker?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  kicker,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-7 flex flex-col gap-3 border-b border-[#D8D1C5] pb-5 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {kicker && (
          <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-[#77766F]">
            {kicker}
          </p>
        )}
        <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.025em] text-[#252A27] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-[#77766F] max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface PageContainerProps {
  title?: string;
  description?: string;
  kicker?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  kicker,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8',
        className,
      )}
    >
      {title && (
        <PageHeader
          title={title}
          description={description}
          kicker={kicker}
          actions={actions}
        />
      )}
      {children}
    </div>
  );
}
