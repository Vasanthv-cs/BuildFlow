import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/src/lib/utils';

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-xs font-medium text-[#252A27] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-9 w-full rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] px-3 py-1.5 text-sm text-[#252A27] placeholder:text-[#9A978E] transition-colors focus-visible:outline-none focus-visible:border-[#C66A3D] focus-visible:ring-2 focus-visible:ring-[#C66A3D]/20 disabled:cursor-not-allowed disabled:bg-[#FAF8F3] disabled:text-[#77766F]',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[84px] w-full rounded-[4px] border border-[#D8D1C5] bg-[#FFFFFF] px-3 py-2 text-sm text-[#252A27] placeholder:text-[#9A978E] transition-colors focus-visible:outline-none focus-visible:border-[#C66A3D] focus-visible:ring-2 focus-visible:ring-[#C66A3D]/20 disabled:cursor-not-allowed disabled:bg-[#FAF8F3] disabled:text-[#77766F]',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
