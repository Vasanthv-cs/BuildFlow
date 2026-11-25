import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightCircle,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Send,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { EmptyState } from '@/src/components/ui/feedback';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatINR, formatIndianDate } from '@/src/lib/utils';
import { QuotationFormDialog } from './components/QuotationFormDialog';
import { QuotationPreviewDialog } from './components/QuotationPreviewDialog';
import type { ProjectQuotation, QuotationStatus } from '@/src/types';

export function QuotationsPage() {
  const { quotations, createQuotation, updateQuotation, convertQuotationToProject } = useBuildFlow();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<'All' | QuotationStatus>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<ProjectQuotation | undefined>();
  const [previewQuotation, setPreviewQuotation] = useState<ProjectQuotation | undefined>();

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return quotations;
    return quotations.filter((q) => q.status === statusFilter);
  }, [quotations, statusFilter]);

  const totals = useMemo(() => {
    const pipeline = quotations
      .filter((q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Approved')
      .reduce((s, q) => s + q.totalAmount, 0);
    const approvedReady = quotations.filter((q) => q.status === 'Approved').length;
    const convertedCount = quotations.filter((q) => q.status === 'Converted').length;
    return { pipeline, approvedReady, convertedCount };
  }, [quotations]);

  const handleConvert = (quotationId: string) => {
    const createdProject = convertQuotationToProject(quotationId);
    if (createdProject) {
      navigate(`/projects/${createdProject.id}`);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Quotations & Estimates"
        description="Prepare itemized construction BOQs, track revisions, preview client proposals, and convert approved quotes into projects."
        actions={
          <Button
            onClick={() => {
              setEditingQuotation(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Quotation
          </Button>
        }
      />

      {/* Summary Strip */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Active Quotation Pipeline</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
            {formatINR(totals.pipeline)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Approved & Ready to Convert</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#15803D] tabular-nums">
            {totals.approvedReady}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#64748B]">Converted into Projects</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#A65229] tabular-nums">
            {totals.convertedCount}
          </p>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-md bg-[#F1F5F9] p-1 w-fit">
        {(['All', 'Draft', 'Sent', 'Approved', 'Converted'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === st
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No quotations in this status"
          description="Create a new residential BOQ estimate to share with a prospective homeowner."
          actionLabel="Create Quotation"
          onAction={() => {
            setEditingQuotation(undefined);
            setFormOpen(true);
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Final Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((quo) => (
                  <TableRow key={quo.id}>
                    <TableCell>
                      <p className="font-semibold text-[#0F172A]">{quo.title || quo.quotationNumber}</p>
                      <p className="font-mono text-xs text-[#64748B]">
                        {quo.quotationNumber} · {quo.items.length} line items
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-[#1E293B]">{quo.customerName || '—'}</p>
                      <p className="text-xs text-[#64748B]">{quo.customerPhone || ''}</p>
                    </TableCell>
                    <TableCell className="text-xs text-[#475569] tabular-nums">
                      Until {formatIndianDate(quo.validUntil)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#475569]">
                      {quo.version}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                      {formatINR(quo.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          quo.status === 'Converted'
                            ? 'info'
                            : getPaymentStatusVariant(quo.status)
                        }
                      >
                        {quo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewQuotation(quo)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>

                        {(quo.status === 'Draft' || quo.status === 'Revised') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingQuotation(quo);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                updateQuotation(quo.id, { status: 'Sent' }, 'Marked as sent to homeowner')
                              }
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send
                            </Button>
                          </>
                        )}

                        {quo.status === 'Sent' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              updateQuotation(quo.id, { status: 'Approved' }, 'Client approved quotation')
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                            Approve
                          </Button>
                        )}

                        {quo.status === 'Approved' && (
                          <Button size="sm" onClick={() => handleConvert(quo.id)}>
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                            Convert to Project
                          </Button>
                        )}

                        {quo.status === 'Converted' && quo.convertedProjectId && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate(`/projects/${quo.convertedProjectId}`)}
                          >
                            Open Project
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <QuotationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialQuotation={editingQuotation}
        onSave={(payload, revisionSummary) => {
          if (editingQuotation) {
            updateQuotation(editingQuotation.id, payload, revisionSummary);
          } else {
            createQuotation(payload);
          }
        }}
      />

      <QuotationPreviewDialog
        quotation={previewQuotation}
        open={Boolean(previewQuotation)}
        onOpenChange={(o) => {
          if (!o) setPreviewQuotation(undefined);
        }}
      />
    </PageContainer>
  );
}
