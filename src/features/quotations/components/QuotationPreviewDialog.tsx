import { Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { formatArea, formatINR, formatIndianDate } from '@/src/lib/utils';
import type { ProjectQuotation } from '@/src/types';

interface QuotationPreviewDialogProps {
  quotation?: ProjectQuotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationPreviewDialog({
  quotation,
  open,
  onOpenChange,
}: QuotationPreviewDialogProps) {
  if (!quotation) return null;

  const subtotal =
    quotation.subtotal ?? quotation.items.reduce((sum, it) => sum + it.amount, 0);
  const discountAmt =
    quotation.discountType === 'percent'
      ? Math.round((subtotal * (quotation.discountValue ?? 0)) / 100)
      : (quotation.discountValue ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogTitle>{quotation.quotationNumber}</DialogTitle>
            <Badge variant={getPaymentStatusVariant(quotation.status)}>{quotation.status}</Badge>
          </div>
          <DialogDescription>
            {quotation.title} · {quotation.version} · Valid until{' '}
            {formatIndianDate(quotation.validUntil)}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Printable Quotation Preview</TabsTrigger>
              <TabsTrigger value="history">
                Version History ({quotation.versionHistory?.length ?? 1})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview">
              <div className="rounded-lg border border-[#CBD5E1] bg-white p-6 space-y-6 text-sm print:border-0 print:p-0">
                {/* Commercial Letterhead */}
                <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-[#252A27]">
                      Kulkarni Homes Pvt. Ltd.
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Residential Construction & Turnkey Engineering · GSTIN: 29AABCK9012M1Z4
                    </p>
                    <p className="text-xs text-[#64748B]">
                      100 Feet Road, Indiranagar, Bengaluru 560038 · +91 80 4123 9900
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono text-xs font-semibold text-[#A65229]">
                      QUOTATION {quotation.quotationNumber}
                    </p>
                    <p className="mt-1 text-xs text-[#475569] tabular-nums">
                      Issued: {formatIndianDate(quotation.issuedDate)}
                    </p>
                    <p className="text-xs text-[#475569] tabular-nums">
                      Valid Until: {formatIndianDate(quotation.validUntil)}
                    </p>
                  </div>
                </div>

                {/* Client & Scope Summary */}
                <div className="grid grid-cols-1 gap-4 rounded-md bg-[#F8FAFC] p-4 sm:grid-cols-2 text-xs">
                  <div>
                    <p className="font-medium text-[#64748B]">Prepared For</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {quotation.customerName}
                    </p>
                    <p className="text-[#475569]">{quotation.customerPhone}</p>
                    <p className="mt-0.5 text-[#475569]">{quotation.siteAddress}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-medium text-[#64748B]">Proposed Build Scope</p>
                    <p className="mt-1 font-semibold text-[#0F172A]">
                      {quotation.projectType ?? 'Residential Construction'}
                    </p>
                    {quotation.builtUpAreaSqFt && (
                      <p className="text-[#475569] tabular-nums">
                        {formatArea(quotation.builtUpAreaSqFt)} · {quotation.floors ?? 2} Floors
                      </p>
                    )}
                    <p className="text-[#475569]">Revision: {quotation.version}</p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#CBD5E1] bg-[#F8FAFC] text-left text-[#475569]">
                        <th className="py-2.5 px-3 font-semibold">Work Package & Specification</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Qty</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Rate</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {quotation.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-[#0F172A]">{item.workPackage}</p>
                            {item.specification && (
                              <p className="text-[#64748B]">{item.specification}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            {item.quantity.toLocaleString('en-IN')} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            {formatINR(item.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                            {formatINR(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#475569]">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">{formatINR(subtotal)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-[#15803D]">
                        <span>Discount</span>
                        <span className="font-mono tabular-nums">-{formatINR(discountAmt)}</span>
                      </div>
                    )}
                    {(quotation.taxPercent ?? 0) > 0 && (
                      <div className="flex justify-between text-[#475569]">
                        <span>GST ({quotation.taxPercent}%)</span>
                        <span className="font-mono tabular-nums">
                          {formatINR(quotation.taxAmount ?? 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#CBD5E1] pt-2 text-sm font-bold text-[#0F172A]">
                      <span>Grand Total</span>
                      <span className="font-mono tabular-nums">
                        {formatINR(quotation.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inclusions & Exclusions */}
                <div className="grid grid-cols-1 gap-4 border-t border-[#E2E8F0] pt-4 sm:grid-cols-2 text-xs">
                  <div>
                    <p className="font-semibold text-[#0F172A]">Included Work</p>
                    <ul className="mt-2 space-y-1 text-[#475569] list-disc pl-4">
                      {(quotation.includedWork ?? []).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">Excluded Work</p>
                    <ul className="mt-2 space-y-1 text-[#475569] list-disc pl-4">
                      {(quotation.excludedWork ?? []).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Payment Milestones */}
                {(quotation.paymentMilestones?.length ?? 0) > 0 && (
                  <div className="border-t border-[#E2E8F0] pt-4 text-xs">
                    <p className="font-semibold text-[#0F172A]">Payment Milestone Schedule</p>
                    <div className="mt-2 divide-y divide-[#F1F5F9] rounded border border-[#E2E8F0]">
                      {quotation.paymentMilestones!.map((ms) => (
                        <div key={ms.id} className="flex items-center justify-between px-3 py-2">
                          <span className="text-[#334155]">{ms.stage}</span>
                          <span className="font-mono text-[#0F172A] tabular-nums">
                            {ms.percentage}% · {formatINR(ms.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="divide-y divide-[#F1F5F9] rounded-lg border border-[#E2E8F0] bg-white">
                {(quotation.versionHistory ?? []).map((entry, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {entry.version} · {formatIndianDate(entry.date)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#475569]">{entry.summary}</p>
                      <p className="mt-1 text-[11px] text-[#64748B]">Updated by {entry.author}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[#0F172A] tabular-nums shrink-0">
                      {formatINR(entry.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
