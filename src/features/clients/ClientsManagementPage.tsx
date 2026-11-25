import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useBuildFlow } from '@/src/context/BuildFlowContext';
import { formatIndianDate, formatINR } from '@/src/lib/utils';
import { PageContainer, PageHeader } from '@/src/components/layout/PageContainer';
import { Badge, getPaymentStatusVariant } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
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
import type { ClientCredentialAccount } from '@/src/types';

export function ClientsManagementPage() {
  const navigate = useNavigate();
  const { currentUser, loginAsCustomUser, syncClientCredentialUser } = useAuth();
  const {
    projects,
    clientCredentials,
    createClientCredential,
    updateClientCredential,
  } = useBuildFlow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<ClientCredentialAccount | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 98450 ');
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([
    'proj-1',
  ]);
  const [accountStatus, setAccountStatus] = useState<
    'Active' | 'Invited' | 'Disabled'
  >('Active');
  const [notes, setNotes] = useState('');

  if (currentUser?.role !== 'owner') {
    return (
      <PageContainer>
        <Card className="p-6 text-xs text-red-700">
          Only the Owner / Admin can create or modify client portal login credentials and project assignments.
        </Card>
      </PageContainer>
    );
  }

  const openCreateDialog = () => {
    setEditingAccount(null);
    setCustomerName('');
    setUsername('');
    setEmail('');
    setPhone('+91 98450 ');
    setAssignedProjectIds([projects[0]?.id ?? 'proj-1']);
    setAccountStatus('Active');
    setNotes('');
    setDialogOpen(true);
  };

  const openEditDialog = (acc: ClientCredentialAccount) => {
    setEditingAccount(acc);
    setCustomerName(acc.customerName);
    setUsername(acc.username);
    setEmail(acc.email);
    setPhone(acc.phone);
    setAssignedProjectIds(acc.assignedProjectIds);
    setAccountStatus(acc.accountStatus);
    setNotes(acc.notes ?? '');
    setDialogOpen(true);
  };

  const toggleProjectSelection = (projectId: string) => {
    setAssignedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customerName.trim() ||
      !username.trim() ||
      assignedProjectIds.length === 0
    ) {
      return;
    }

    if (editingAccount) {
      const updatedPatch: Partial<ClientCredentialAccount> = {
        customerName: customerName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim(),
        assignedProjectIds,
        accountStatus,
        notes: notes.trim(),
      };
      updateClientCredential(editingAccount.id, updatedPatch);
      syncClientCredentialUser({
        ...editingAccount,
        ...updatedPatch,
      });
    } else {
      const created = createClientCredential({
        customerId: `cust-${Date.now()}`,
        customerName: customerName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim(),
        assignedProjectIds,
        accountStatus,
        notes: notes.trim(),
      });
      syncClientCredentialUser(created);
    }

    setDialogOpen(false);
  };

  const handleTestClientPortal = (acc: ClientCredentialAccount) => {
    const parts = acc.customerName.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : acc.customerName.slice(0, 2).toUpperCase();

    loginAsCustomUser({
      id: `usr-cli-${acc.id}`,
      username: acc.username,
      fullName: acc.customerName,
      email: acc.email,
      phone: acc.phone,
      role: 'client',
      title: `Homeowner · ${acc.assignedProjectIds.length} Assigned Project(s)`,
      initials,
      assignedProjectIds: acc.assignedProjectIds,
      linkedCustomerId: acc.customerId,
    });
    navigate('/client');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Clients & Portal Account Management"
        description="Owner-only controls to create homeowner login accounts, assign each client to one or more construction projects, and test client portal views."
        actions={
          <Button size="sm" onClick={openCreateDialog}>
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Client Login Account</span>
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Client Login Accounts
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {clientCredentials.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {clientCredentials.filter((c) => c.accountStatus === 'Active').length}{' '}
            active homeowner portals
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Assigned Projects
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#A65229] tabular-nums">
            {projects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Strict project-level client isolation
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            Confidentiality Guardrail
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            <span>Internal Costs &amp; Wages Hidden</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Clients cannot edit project permissions
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Homeowner Login Credentials &amp; Project Assignments</CardTitle>
          <CardDescription>
            Each client sees only their assigned project(s). Click &quot;Test Portal&quot; to preview the application as that client.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client / Homeowner</TableHead>
                <TableHead>Portal Username</TableHead>
                <TableHead>Assigned Project(s)</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created / Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientCredentials.map((acc) => {
                const linkedProjects = projects.filter((p) =>
                  acc.assignedProjectIds.includes(p.id),
                );
                const totalContract = linkedProjects.reduce(
                  (sum, p) => sum + p.contractValue,
                  0,
                );

                return (
                  <TableRow key={acc.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        {acc.customerName}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {acc.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {acc.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-medium text-slate-800">
                        <KeyRound className="h-3 w-3 text-[#A65229]" />
                        {acc.username}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedProjects.map((proj) => (
                          <Badge key={proj.id} variant="blue">
                            {proj.code} · {proj.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(totalContract, { compact: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(acc.accountStatus)}>
                        {acc.accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">
                      <div>Created {formatIndianDate(acc.createdAt)}</div>
                      {acc.lastLoginAt && (
                        <div className="text-emerald-700">
                          Last login {formatIndianDate(acc.lastLoginAt)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(acc)}
                        >
                          Edit Access
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={acc.accountStatus === 'Disabled'}
                          onClick={() => handleTestClientPortal(acc)}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Test Portal</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAccount
                ? 'Edit Client Login & Assigned Projects'
                : 'Create Client Login Account'}
            </DialogTitle>
            <DialogDescription>
              Assign one or more residential construction projects to this homeowner account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 px-6 py-4 overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Client / Homeowner Name *</Label>
                <Input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Kulkarni"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Login Username *</Label>
                <Input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. kulkarni.client"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@gmail.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number *</Label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 31890"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Assigned Construction Project(s) *</Label>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {projects.map((proj) => {
                  const checked = assignedProjectIds.includes(proj.id);
                  return (
                    <label
                      key={proj.id}
                      className="flex cursor-pointer items-center justify-between rounded-[4px] border border-[#D8D1C5] bg-white px-3 py-2 text-xs hover:border-[#C66A3D]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProjectSelection(proj.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {proj.code} · {proj.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {proj.customerName} · {proj.city}
                          </p>
                        </div>
                      </div>
                      <Badge variant="neutral">{proj.progressPercent}%</Badge>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select
                value={accountStatus}
                onValueChange={(v) =>
                  setAccountStatus(v as 'Active' | 'Invited' | 'Disabled')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (Portal Enabled)</SelectItem>
                  <SelectItem value="Invited">Invited (Pending First Sign-In)</SelectItem>
                  <SelectItem value="Disabled">Disabled (Access Revoked)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="px-0 pb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignedProjectIds.length === 0}>
                {editingAccount ? 'Save Changes' : 'Create Client Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
