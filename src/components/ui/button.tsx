import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-[4px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66A3D]/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#C66A3D] text-white hover:bg-[#AE5930]',
        navy: 'bg-[#252A27] text-[#F4F0E8] hover:bg-[#353C38]',
        destructive: 'bg-[#A83227] text-white hover:bg-[#8E281F]',
        outline:
          'border border-[#D8D1C5] bg-[#FFFFFF] text-[#252A27] hover:bg-[#FAF8F3] hover:border-[#BFB7A8]',
        secondary: 'bg-[#EAE4D9] text-[#252A27] hover:bg-[#DFD7C9]',
        ghost: 'text-[#57564F] hover:bg-[#EAE4D9]/75 hover:text-[#252A27]',
        link: 'text-[#A65229] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
