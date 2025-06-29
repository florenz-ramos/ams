"use client";

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSupabase } from '@/hooks/use-supabase';
import { useEffect, useState } from 'react';
import ModeToggle from '@/components/mode-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupabaseClient } from "@supabase/supabase-js";
import { useOrganization, Organization } from '@/context/OrganizationContext';

export function SiteHeader({ onOrgChange }: { onOrgChange?: (org: Organization) => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const { organization, setOrganization } = useOrganization();
  const [userId, setUserId] = useState<string | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState('free');
  const [newOrgType, setNewOrgType] = useState('Personal');

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    if (user && user.id) {
      setUserId(user.id);
      const fetchData = async () => {
        // Fetch orgs where user is owner
        const { data: ownedOrgs } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner', user.id);

        // Fetch orgs where user is a member
        const { data: memberLinks } = await supabase
          .from('organization_team_members')
          .select('organization_id')
          .eq('user_id', user.id);

        const memberOrgIds = (memberLinks || []).map(m => m.organization_id);
        let memberOrgs = [];
        if (memberOrgIds.length > 0) {
          const { data } = await supabase
            .from('organizations')
            .select('*')
            .in('id', memberOrgIds);
          memberOrgs = data || [];
        }

        // Combine and deduplicate
        const allOrgs = [...(ownedOrgs || []), ...memberOrgs].filter(
          (org, idx, arr) => arr.findIndex(o => o.id === org.id) === idx
        );

        setOrganizations(allOrgs);
      };
      fetchData();
    }
  }, [supabase]);

  const handleSelectOrg = (org: Organization) => {
    setOrganization(org);
    onOrgChange?.(org);
  };

  const handleNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!userId) {
      setError('User not found.');
      setLoading(false);
      return;
    }
    const { error, data } = await supabase
      .from('organizations')
      .insert([{ name: newOrgName, owner: userId, plan: newOrgPlan, type: newOrgType }])
      .select();
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    if (data && data.length > 0) {
      const org = data[0];
      // Insert the user as owner in organization_team_members (only required fields)
      const { data: userRows } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1);
      const user = userRows && userRows.length > 0 ? userRows[0] : null;
      await supabase.from('organization_team_members').insert([
        {
          organization_id: org.id,
          user_id: userId,
          role: 'owner',
          name: user?.name || user?.email || 'Owner',
          email: user?.email || 'unknown@example.com'
        }
      ]);
      setOrganizations([...organizations, org]);
      setOrganization(org);
      onOrgChange?.(org);
      setShowNewOrg(false);
      setNewOrgName('');
      setNewOrgPlan('free');
      setNewOrgType('Personal');
    }
    setLoading(false);
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Dialog open={showNewOrg} onOpenChange={setShowNewOrg}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex-1 min-w-0">
                <Button
                  variant="ghost"
                  className="text-base font-semibold px-3 truncate max-w-xs sm:max-w-sm md:max-w-md"
                  title={organization ? organization.name : 'Select organization'}
                >
                  {organization ? organization.name : 'Select organization'}
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              {organizations.map(org => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className={organization?.id === org.id ? 'font-bold' : ''}
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowNewOrg(true)}>
                + New organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNewOrg} className="flex flex-col gap-4">
              <Input
                type="text"
                placeholder="Organization name"
                value={newOrgName}
                onChange={e => setNewOrgName(e.target.value)}
                required
                autoFocus
              />
              <Select value={newOrgType} onValueChange={setNewOrgType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type of Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Educational">Educational</SelectItem>
                  <SelectItem value="Startup">Startup</SelectItem>
                  <SelectItem value="Agency">Agency</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newOrgPlan} onValueChange={setNewOrgPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free – ₱0/month</SelectItem>
                  <SelectItem value="pro">Pro – ₱1,400/month</SelectItem>
                  <SelectItem value="team">Team – ₱33,544/month</SelectItem>
                </SelectContent>
              </Select>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <div className="ml-auto flex items-center gap-2">
          {/* <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button> */}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
