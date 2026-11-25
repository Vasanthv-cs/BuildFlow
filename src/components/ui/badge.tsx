import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-[3px] px-2 py-0.5 text-[11px] font-medium tracking-[0.01em] border',
  {
    variants: {
      variant: {
        neutral: 'bg-[#F3EFE7] text-[#57564F] border-[#D8D1C5]',
        blue: 'bg-[#FBF1EC] text-[#9F4E26] border-[#E7C4B3]',
        info: 'bg-[#FBF1EC] text-[#9F4E26] border-[#E7C4B3]',
        green: 'bg-[#EFF3EB] text-[#434D38] border-[#C5CEBA]',
        success: 'bg-[#EFF3EB] text-[#434D38] border-[#C5CEBA]',
        amber: 'bg-[#FAF2E1] text-[#855A18] border-[#E4CFA0]',
        warning: 'bg-[#FAF2E1] text-[#855A18] border-[#E4CFA0]',
        red: 'bg-[#FCEEEB] text-[#9A3026] border-[#E7BCB5]',
        danger: 'bg-[#FCEEEB] text-[#9A3026] border-[#E7BCB5]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export function getProjectStatusVariant(
  status: string
): BadgeProps['variant'] {
  switch (status) {
    case 'In Progress':
      return 'blue';
    case 'Completed':
      return 'green';
    case 'On Hold':
      return 'amber';
    case 'Planning':
    default:
      return 'neutral';
  }
}

export function getPaymentStatusVariant(
  status: string
): BadgeProps['variant'] {
  switch (status) {
    case 'Received':
    case 'Paid':
    case 'Approved':
    case 'Delivered':
    case 'Present':
    case 'Verified':
    case 'Reviewed':
    case 'Resolved':
    case 'Active':
      return 'green';
    case 'Submitted':
    case 'In Review':
      return 'blue';
    case 'Overdue':
    case 'Delayed':
    case 'Absent':
    case 'Rejected':
    case 'Needs correction':
    case 'Disabled':
      return 'red';
    case 'Pending':
    case 'Partial':
    case 'Partially Paid':
    case 'Scheduled':
    case 'In Transit':
    case 'Half Day':
    case 'Sent':
    case 'Revised':
    case 'Pending verification':
    case 'Pending Approval':
    case 'Leave':
    case 'Open':
    case 'Invited':
      return 'amber';
    case 'Draft':
    default:
      return 'neutral';
  }
}
