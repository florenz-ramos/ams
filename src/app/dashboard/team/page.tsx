'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupabaseClient } from '@supabase/supabase-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/org/app-sidebar';
import { SiteHeader } from '@/components/org/site-header';
import bcrypt from 'bcryptjs';
import { useOrganization } from '@/context/OrganizationContext';
import { cssProperties } from '@/lib/constants';
import { Label } from '@/components/ui/label';

const ROLES = [
  { value: 'org-admin', label: 'Org Admin' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'student', label: 'Student' },
];

type Member = { id: string; organization_id: string; name: string; email: string; address?: string; birthdate?: string; role: string };

export default function TeamPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: org } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAddress, setInviteAddress] = useState('');
  const [inviteBirthdate, setInviteBirthdate] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editRoleValue, setEditRoleValue] = useState('member');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [currentTeamMembers, setCurrentTeamMembers] = useState<number | null>(null);
  const [maxTeamMembers, setMaxTeamMembers] = useState<number | null>(null);
  const [canManageMembers, setCanManageMembers] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!org) return;
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
      setIsOwner(org && org.owner === user?.id);
      const { data: membersData, error } = await supabase
        .from('organization_team_members')
        .select('*')
        .eq('organization_id', org.id);
      if (!error) setMembers(membersData || []);
      // Check if user is org-admin in this org
      const isOrgAdmin = (membersData || []).some(
        m => m.user_id === user?.id && m.role === 'org-admin'
      );
      setCanManageMembers((org && org.owner === user?.id) || isOrgAdmin);
    };
    fetchMembers();
  }, [supabase, org]);

  useEffect(() => {
    const fetchUsageAndLimit = async () => {
      if (!org) return;
      const { data: usage } = await supabase
        .from('organization_usage')
        .select('current_team_members, plan_id')
        .eq('organization_id', org.id)
        .single();
      if (!usage) return;
      setCurrentTeamMembers(usage.current_team_members);
      const { data: plan } = await supabase
        .from('organization_plans')
        .select('max_team_members')
        .eq('id', usage.plan_id)
        .single();
      setMaxTeamMembers(plan?.max_team_members ?? null);
    };
    fetchUsageAndLimit();
  }, [supabase, org]);

  const refreshMembers = async (orgId: string) => {
    const { data: membersData } = await supabase
      .from('organization_team_members')
      .select('*')
      .eq('organization_id', orgId);
    setMembers(membersData || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedPassword(null);
    if (!org) {
      setError('No organization selected.');
      setLoading(false);
      return;
    }
    // Fetch current usage and plan limit
    const { data: usageRows } = await supabase
      .from('organization_usage')
      .select('current_team_members, plan_id')
      .eq('organization_id', org.id)
      .single();
    if (!usageRows) {
      setError('Usage data not found.');
      setLoading(false);
      return;
    }
    const { current_team_members, plan_id } = usageRows;
    const { data: planRows } = await supabase
      .from('organization_plans')
      .select('max_team_members')
      .eq('id', plan_id)
      .single();
    if (!planRows) {
      setError('Plan data not found.');
      setLoading(false);
      return;
    }
    const { max_team_members } = planRows;
    if (max_team_members !== null && current_team_members >= max_team_members) {
      setError('Team member limit reached for this plan.');
      setLoading(false);
      return;
    }
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', inviteEmail)
      .single();
    let userId = existingUser?.id;
    let defaultPassword = '';
    if (!existingUser) {
      // Generate a random password
      defaultPassword = Math.random().toString(36).slice(-10);
      const hash = await bcrypt.hash(defaultPassword, 10);
      // Create user with must_change_password = true
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{ email: inviteEmail, password_hash: hash, must_change_password: true, name: inviteName }])
        .select()
        .single();
      if (userError || !newUser) {
        setError(userError?.message || 'Failed to create user');
        setLoading(false);
        return;
      }
      userId = newUser.id;
      setGeneratedPassword(defaultPassword);
    }
    // Insert into organization_team_members
    const { error } = await supabase
      .from('organization_team_members')
      .insert([{
        organization_id: org.id,
        user_id: userId,
        name: inviteName,
        email: inviteEmail,
        address: inviteAddress,
        birthdate: inviteBirthdate,
        role: inviteRole
      }]);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('User added!');
      setInviteName('');
      setInviteEmail('');
      setInviteAddress('');
      setInviteBirthdate('');
      setInviteRole('student');
      // Increment current_team_members in organization_usage
      await supabase
        .from('organization_usage')
        .update({ current_team_members: (currentTeamMembers ?? 0) + 1 })
        .eq('organization_id', org.id);
      await refreshMembers(org.id);
      // Refresh usage state
      const { data: usage } = await supabase
        .from('organization_usage')
        .select('current_team_members')
        .eq('organization_id', org.id)
        .single();
      setCurrentTeamMembers(usage?.current_team_members ?? null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !org) return;
    setDeleteLoading(true);
    setError('');
    const { error } = await supabase
      .from('organization_team_members')
      .delete()
      .eq('id', deleteId);
    setDeleteLoading(false);
    setDeleteId(null);
    if (error) {
      setError(error.message);
    } else {
      await refreshMembers(org.id);
      // Decrement current_team_members in organization_usage
      await supabase
        .from('organization_usage')
        .update({ current_team_members: (currentTeamMembers ?? 1) - 1 })
        .eq('organization_id', org.id);
      // Refresh usage state
      const { data: usage } = await supabase
        .from('organization_usage')
        .select('current_team_members')
        .eq('organization_id', org.id)
        .single();
      setCurrentTeamMembers(usage?.current_team_members ?? null);
    }
  };
  
  return (
    <SidebarProvider
      style={cssProperties}
    >
      <AppSidebar orgId={org?.id || ''} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-col items-center gap-8 p-8">
          <Card className="w-full">
            <CardContent>
              <h1 className="text-2xl font-bold mb-4">Team Members</h1>
              {maxTeamMembers !== null && currentTeamMembers !== null && (
                <div className="mb-2 text-sm text-muted-foreground">
                  Team Members: {currentTeamMembers} / {maxTeamMembers}
                  {currentTeamMembers >= maxTeamMembers && (
                    <span className="text-destructive ml-2">(Full)</span>
                  )}
                </div>
              )}
              <Button className="mb-4" onClick={() => setShowAdd(true)} disabled={!canManageMembers}>
                Add Member
              </Button>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Birthdate</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center">No members yet.</TableCell>
                    </TableRow>
                  ) : (
                    members.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.address}</TableCell>
                        <TableCell>{member.birthdate}</TableCell>
                        <TableCell className="capitalize">{member.role}</TableCell>
                        <TableCell>
                          {isOwner ? (
                            <div className="flex gap-2 items-center">
                              <Button size="sm" variant="outline" onClick={() => { setEditMember(member); setEditRoleValue(member.role); setEditAddress(member.address || ''); setEditBirthdate(member.birthdate || ''); setShowEdit(true); }}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setDeleteId(member.id)}>
                                Delete
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Read only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="flex flex-col gap-2">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    type="text"
                    placeholder="Name"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    required
                    disabled={!canManageMembers}
                  />
                </div>
                <div>
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="Email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                    disabled={!canManageMembers}
                  />
                </div>
                <div>
                  <Label htmlFor="add-address">Address</Label>
                  <Input
                    id="add-address"
                    type="text"
                    placeholder="Address"
                    value={inviteAddress}
                    onChange={e => setInviteAddress(e.target.value)}
                    required
                    disabled={!canManageMembers}
                  />
                </div>
                <div>
                  <Label htmlFor="add-birthdate">Birthdate</Label>
                  <Input
                    id="add-birthdate"
                    type="date"
                    placeholder="dd/mm/yyyy"
                    value={inviteBirthdate}
                    onChange={e => setInviteBirthdate(e.target.value)}
                    required
                    disabled={!canManageMembers}
                  />
                </div>
                <div>
                  <Label htmlFor="add-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole} disabled={!canManageMembers}>
                    <SelectTrigger id="add-role">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && <div className="text-destructive text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                {generatedPassword && (
                  <div className="text-green-700 text-sm mt-2">
                    Default password for new user: <b>{generatedPassword}</b><br />
                    Please share this with the user. They will be required to change it on first login.
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={loading || !canManageMembers}>{loading ? 'Adding...' : 'Add User'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove User</DialogTitle>
              </DialogHeader>
              <div className="mb-2">Are you sure you want to remove this user from the organization?</div>
              <DialogFooter>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? 'Removing...' : 'Remove'}
                </Button>
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Edit Member Modal */}
          <Dialog open={showEdit} onOpenChange={open => { if (!open) setShowEdit(false); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div><b>Name:</b> {editMember?.name}</div>
                <div><b>Email:</b> {editMember?.email}</div>
                <Input
                  type="text"
                  placeholder="Address"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Birthdate"
                  value={editBirthdate}
                  onChange={e => setEditBirthdate(e.target.value)}
                />
                <Select value={editRoleValue} onValueChange={setEditRoleValue}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={async () => {
                  if (!editMember) return;
                  setLoading(true);
                  setError('');
                  const { error } = await supabase
                    .from('organization_team_members')
                    .update({ role: editRoleValue, address: editAddress, birthdate: editBirthdate })
                    .eq('id', editMember.id);
                  setLoading(false);
                  setShowEdit(false);
                  setEditMember(null);
                  if (error) {
                    setError(error.message);
                  } else if (org) {
                    await refreshMembers(org.id);
                  }
                }} disabled={loading}>
                  Save
                </Button>
                <Button variant="outline" onClick={() => setShowEdit(false)}>
                  Cancel
                </Button>
              </DialogFooter>
              {error && <div className="text-destructive text-sm mt-2">{error}</div>}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 