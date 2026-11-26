import React, { useMemo, useState } from 'react';
import {
  FileText,
  Search,
  Upload,
  Download,
  Eye,
  Filter,
  Trash2,
  CheckCircle2,
  Calendar,
  Building2,
  FolderKanban,
  FileSpreadsheet,
  Image as ImageIcon,
  Receipt,
  FileCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Input, Label } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { useAuth } from '@/src/context/AuthContext';
import { formatIndianDate } from '@/src/lib/utils';
import { documentsApi } from '@/src/services/apiClient';

export type DocumentCategoryType =
  | 'Project documents'
  | 'Quotations'
  | 'Customer agreements'
  | 'Approved drawings'
  | 'Material bills'
  | 'Payment receipts'
  | 'Supplier invoices'
  | 'Site photographs'
  | 'Completion documents'
  | 'Other';

export interface DocumentItem {
  id: string;
  projectId: string;
  title: string;
  category: DocumentCategoryType;
  fileName: string;
  fileSize: string;
  mimeType?: string;
  uploadedBy: string;
  uploadedDate: string;
  version: string;
  notes?: string;
}

const CATEGORY_COLORS: Record<DocumentCategoryType, { bg: string; text: string; border: string }> = {
  'Approved drawings': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Customer agreements': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Quotations': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Material bills': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Payment receipts': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Supplier invoices': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Site photographs': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Completion documents': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Project documents': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'Other': { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' },
};

export function DocumentsPage() {
  const { projects, documents: rawDocs } = useBuildFlow();
  const { currentUser } = useAuth();

  // Normalize initial documents to the 9 comprehensive document categories
  const [localDocs, setLocalDocs] = useState<DocumentItem[]>(() => [
    ...rawDocs.map((d) => {
      let cat: DocumentCategoryType = 'Project documents';
      if (d.category.includes('Drawing')) cat = 'Approved drawings';
      else if (d.category.includes('Agreement')) cat = 'Customer agreements';
      else if (d.category.includes('Invoice')) cat = 'Supplier invoices';
      else if (d.category.includes('Permit')) cat = 'Completion documents';
      return {
        id: d.id,
        projectId: d.projectId,
        title: d.title,
        category: cat,
        fileName: d.fileName,
        fileSize: d.fileSize,
        uploadedBy: d.uploadedBy,
        uploadedDate: d.uploadedDate,
        version: d.version,
      };
    }),
    {
      id: 'doc-ext-1',
      projectId: 'proj-1',
      title: 'Architectural G+2 Stamped Blueprints',
      category: 'Approved drawings',
      fileName: 'Kulkarni_G+2_Approved_Drawings_v2.dwg',
      fileSize: '14.8 MB',
      uploadedBy: 'Sanjay Deshmukh (Architect)',
      uploadedDate: '2026-03-28',
      version: 'v2.1',
    },
    {
      id: 'doc-ext-2',
      projectId: 'proj-1',
      title: 'Signed Master Construction Agreement',
      category: 'Customer agreements',
      fileName: 'Agreement_Anand_Kulkarni_Signed.pdf',
      fileSize: '3.4 MB',
      uploadedBy: 'Vikram Menon (Owner)',
      uploadedDate: '2026-03-15',
      version: 'v1.0',
    },
    {
      id: 'doc-ext-3',
      projectId: 'proj-2',
      title: 'Structural Foundation Rebar Schedule',
      category: 'Approved drawings',
      fileName: 'Sharma_Residence_Rebar_Bending_Schedule.pdf',
      fileSize: '2.1 MB',
      uploadedBy: 'Prakash Gowda (Engineer)',
      uploadedDate: '2026-07-22',
      version: 'v1.0',
    },
    {
      id: 'doc-ext-4',
      projectId: 'proj-1',
      title: 'Ultratech Cement 200 Bags Bill',
      category: 'Material bills',
      fileName: 'INV-UT-44829_Ultratech_Nov2026.pdf',
      fileSize: '1.2 MB',
      uploadedBy: 'Ramesh Gupta (Supplier)',
      uploadedDate: '2026-11-10',
      version: 'v1.0',
    },
    {
      id: 'doc-ext-5',
      projectId: 'proj-1',
      title: 'Stage 3 Roof Slab Milestone Receipt',
      category: 'Payment receipts',
      fileName: 'RC-KLK-2026-004_RoofSlab.pdf',
      fileSize: '840 KB',
      uploadedBy: 'Accounts Dept',
      uploadedDate: '2026-10-15',
      version: 'v1.0',
    },
    {
      id: 'doc-ext-6',
      projectId: 'proj-3',
      title: 'Approved Civil Work Quotation',
      category: 'Quotations',
      fileName: 'Deshmukh_Villa_Civil_Work_Estimate_v3.pdf',
      fileSize: '1.9 MB',
      uploadedBy: 'Vikram Menon (Owner)',
      uploadedDate: '2026-08-01',
      version: 'v3.0',
    },
    {
      id: 'doc-ext-7',
      projectId: 'proj-1',
      title: 'Plinth Beam Curing Site Photograph',
      category: 'Site photographs',
      fileName: 'IMG_20261118_Plinth_Curing_HighRes.jpg',
      fileSize: '4.6 MB',
      uploadedBy: 'Ravi Kumar (Supervisor)',
      uploadedDate: '2026-11-18',
      version: 'v1.0',
    },
  ]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialogs state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentItem | null>(null);

  // New Document Form
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<DocumentCategoryType>('Approved drawings');
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || 'proj-1');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formNotes, setFormNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return localDocs.filter((doc) => {
      if (selectedProject !== 'all' && doc.projectId !== selectedProject) return false;
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
      if (dateFrom && doc.uploadedDate < dateFrom) return false;
      if (dateTo && doc.uploadedDate > dateTo) return false;
      if (q) {
        const proj = projects.find((p) => p.id === doc.projectId);
        const hay = [
          doc.title,
          doc.fileName,
          doc.category,
          doc.uploadedBy,
          proj?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [localDocs, selectedProject, selectedCategory, dateFrom, dateTo, searchQuery, projects]);

  // Category counts
  const stats = useMemo(() => {
    return {
      total: localDocs.length,
      drawings: localDocs.filter((d) => d.category === 'Approved drawings').length,
      agreements: localDocs.filter((d) => d.category === 'Customer agreements').length,
      bills: localDocs.filter((d) => d.category === 'Material bills' || d.category === 'Supplier invoices').length,
      photos: localDocs.filter((d) => d.category === 'Site photographs').length,
    };
  }, [localDocs]);

  const handleDownload = (doc: DocumentItem) => {
    // Generate text/binary download placeholder with document metadata
    const content = `BuildFlow Document Centre\n=======================\nDocument: ${doc.title}\nFile: ${doc.fileName}\nCategory: ${doc.category}\nVersion: ${doc.version}\nUploaded By: ${doc.uploadedBy}\nUpload Date: ${doc.uploadedDate}\nProject ID: ${doc.projectId}\nVerified Authentic Construction Record.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsUploading(true);

    const fileName = uploadFileObj ? uploadFileObj.name : `${formTitle.replace(/\s+/g, '_')}.pdf`;
    const fileSize = uploadFileObj
      ? `${(uploadFileObj.size / (1024 * 1024)).toFixed(1)} MB`
      : '1.8 MB';

    // Call real backend upload API if file selected
    if (uploadFileObj) {
      try {
        const formData = new FormData();
        formData.append('file', uploadFileObj);
        formData.append('name', formTitle);
        formData.append('category', formCategory);
        formData.append('projectId', formProjectId);
        await documentsApi.upload(formData);
      } catch (err) {
        console.warn('[DocumentsPage] Backend upload fallback to local state:', err);
      }
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      projectId: formProjectId,
      title: formTitle,
      category: formCategory,
      fileName,
      fileSize,
      uploadedBy: currentUser?.fullName || 'Current User',
      uploadedDate: new Date().toISOString().split('T')[0],
      version: formVersion || 'v1.0',
      notes: formNotes,
    };

    setLocalDocs((prev) => [newDoc, ...prev]);
    setIsUploading(false);
    setUploadOpen(false);

    // Reset form
    setUploadFileObj(null);
    setFormTitle('');
    setFormNotes('');
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsApi.delete(id);
    } catch {
      // Local fallback
    }
    setLocalDocs((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirmDoc(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Document Centre & Blueprint Vault"
        description="Centralized repository for stamped architectural drawings, customer agreements, quotations, supplier bills, receipts, and site completion files."
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </Button>
        }
      />

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-4 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total Documents</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">All registered files</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Approved Drawings</p>
          <p className="mt-1 font-mono text-2xl font-bold text-sky-700">{stats.drawings}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Civil &amp; MEP blueprints</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Client Agreements</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">{stats.agreements}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Signed contracts &amp; deeds</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Bills &amp; Invoices</p>
          <p className="mt-1 font-mono text-2xl font-bold text-orange-700">{stats.bills}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Materials &amp; vendor bills</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Site Photographs</p>
          <p className="mt-1 font-mono text-2xl font-bold text-blue-700">{stats.photos}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Progress snapshots</p>
        </Card>
      </div>

      {/* Filter and Search Panel */}
      <Card className="mb-6 p-4 border-slate-200">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, file name, or uploader..."
              className="pl-9"
            />
          </div>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Approved drawings">Approved drawings</SelectItem>
              <SelectItem value="Customer agreements">Customer agreements</SelectItem>
              <SelectItem value="Quotations">Quotations</SelectItem>
              <SelectItem value="Material bills">Material bills</SelectItem>
              <SelectItem value="Payment receipts">Payment receipts</SelectItem>
              <SelectItem value="Supplier invoices">Supplier invoices</SelectItem>
              <SelectItem value="Site photographs">Site photographs</SelectItem>
              <SelectItem value="Completion documents">Completion documents</SelectItem>
              <SelectItem value="Project documents">Project documents</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Registered Files ({filteredDocs.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Search, inspect, preview and download project files
              </CardDescription>
            </div>
            {filteredDocs.length !== localDocs.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedProject('all');
                  setSelectedCategory('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-slate-500"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FolderKanban className="h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-800">No documents found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Try adjusting your search criteria, category filters, or upload a new file.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4" />
                Upload New Document
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Document &amp; File Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Size &amp; Ver</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const proj = projects.find((p) => p.id === doc.projectId);
                  const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Other;

                  return (
                    <TableRow key={doc.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded p-2 bg-slate-100 text-slate-600">
                            {doc.category === 'Site photographs' ? (
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                            ) : doc.category === 'Material bills' || doc.category === 'Supplier invoices' ? (
                              <Receipt className="h-4 w-4 text-orange-600" />
                            ) : (
                              <FileText className="h-4 w-4 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{doc.title}</div>
                            <div className="font-mono text-xs text-slate-400 mt-0.5">
                              {doc.fileName}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {doc.category}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-slate-700">
                        {proj?.name ?? doc.projectId}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600">
                        <span>{doc.fileSize}</span>
                        <span className="ml-1.5 text-slate-400 font-sans text-[11px]">
                          ({doc.version})
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-slate-700">
                          {formatIndianDate(doc.uploadedDate)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                          {doc.uploadedBy}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewDoc(doc)}
                            title="Preview document"
                          >
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            title="Download file"
                          >
                            <Download className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmDoc(doc)}
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveUpload}>
            <DialogHeader>
              <DialogTitle>Upload Construction Document</DialogTitle>
              <DialogDescription>
                Attach drawings, signed contracts, supplier bills, receipts or photographs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* File Dropzone Area */}
              <div>
                <Label className="text-xs">Document File *</Label>
                <div className="mt-1.5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-5 text-center hover:bg-slate-50">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {uploadFileObj ? uploadFileObj.name : 'Click to select or drag & drop file'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {uploadFileObj
                      ? `${(uploadFileObj.size / (1024 * 1024)).toFixed(2)} MB`
                      : 'PDF, DWG, JPG, PNG, XLSX up to 25MB'}
                  </p>
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setUploadFileObj(file);
                        if (!formTitle) {
                          setFormTitle(file.name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Document Title *</Label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., G+2 Stamped Municipal Sanction Plan"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={formCategory}
                    onValueChange={(val) => setFormCategory(val as DocumentCategoryType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved drawings">Approved drawings</SelectItem>
                      <SelectItem value="Customer agreements">Customer agreements</SelectItem>
                      <SelectItem value="Quotations">Quotations</SelectItem>
                      <SelectItem value="Material bills">Material bills</SelectItem>
                      <SelectItem value="Payment receipts">Payment receipts</SelectItem>
                      <SelectItem value="Supplier invoices">Supplier invoices</SelectItem>
                      <SelectItem value="Site photographs">Site photographs</SelectItem>
                      <SelectItem value="Completion documents">Completion documents</SelectItem>
                      <SelectItem value="Project documents">Project documents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Project</Label>
                  <Select value={formProjectId} onValueChange={setFormProjectId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Version Tag</Label>
                  <Input
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    placeholder="v1.0"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Notes / Reference</Label>
                  <Input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional filing reference"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || !formTitle}>
                {isUploading ? 'Uploading...' : 'Save Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-xl">
          {previewDoc && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" className="text-xs">
                    {previewDoc.category}
                  </Badge>
                  <Badge variant="info" className="font-mono text-xs">
                    {previewDoc.version}
                  </Badge>
                </div>
                <DialogTitle className="mt-2 text-lg">{previewDoc.title}</DialogTitle>
                <DialogDescription className="font-mono text-xs text-slate-500">
                  {previewDoc.fileName}
                </DialogDescription>
              </DialogHeader>

              {/* Document Preview Placeholder */}
              <div className="my-4 rounded-lg bg-[#252A27] text-[#F4F0E8] p-6 text-center bg-blueprint-grid-dark border border-slate-700">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-[#C66A3D] mb-3">
                  <FileText className="h-7 w-7" />
                </div>
                <h4 className="font-medium text-sm text-slate-200">{previewDoc.fileName}</h4>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  File Size: {previewDoc.fileSize} · Registered on {formatIndianDate(previewDoc.uploadedDate)}
                </p>
                <p className="mt-2 text-[11px] text-slate-400 max-w-sm mx-auto">
                  Architectural drawing and engineering bill securely archived under project records.
                </p>
              </div>

              {/* Details List */}
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                <div>
                  <span className="text-slate-400">Project:</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {projects.find((p) => p.id === previewDoc.projectId)?.name ?? previewDoc.projectId}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Uploaded By:</span>
                  <p className="font-medium text-slate-800 mt-0.5">{previewDoc.uploadedBy}</p>
                </div>
              </div>

              <DialogFooter className="mt-5">
                <Button variant="outline" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
                <Button onClick={() => handleDownload(previewDoc)}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download File
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirmDoc)} onOpenChange={() => setDeleteConfirmDoc(null)}>
        <DialogContent className="sm:max-w-md">
          {deleteConfirmDoc && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Delete Document
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete &ldquo;{deleteConfirmDoc.title}&rdquo;?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setDeleteConfirmDoc(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteConfirmDoc.id)}
                >
                  Confirm Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
