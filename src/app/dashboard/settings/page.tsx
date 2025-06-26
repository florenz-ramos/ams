'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupabaseClient } from '@supabase/supabase-js';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useOrganization } from '@/context/OrganizationContext';
import { SiteHeader } from '@/components/site-header';

export default function OrganizationSettingsPage() {
  const supabase = useSupabase() as SupabaseClient;
  const router = useRouter();
  const { organization: org, setOrganization } = useOrganization();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!org) return;
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
      if (user && user.id && org.id) {
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', org.id)
          .single();
        setUserRole(member?.role || null);
      }
    };
    fetchUserRole();
  }, [supabase, org]);

  const handleDelete = async () => {
    if (!org) return;
    if (userRole !== 'owner') {
      setError('Only the owner can delete this organization.');
      return;
    }
    setLoading(true);
    setError('');
    // Optionally: delete all projects under this org first
    await supabase.from('projects').delete().eq('organization_id', org.id);
    const { error } = await supabase.from('organizations').delete().eq('id', org.id);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      } as React.CSSProperties}
    >
      <AppSidebar orgId={org?.id || ''} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-col items-center gap-8 p-8">
          <Card className="w-full max-w-lg">
            <CardContent>
              <h1 className="text-2xl font-bold mb-4">Organization Settings</h1>
              {/* Change Organization Name section */}
              <div className="mb-8">
                <label className="block mb-2 font-medium">Organization Name</label>
                <input
                  className="border rounded p-2 w-full mb-2"
                  value={org?.name || ''}
                  onChange={e => setOrganization(org ? { ...org, name: e.target.value } : org)}
                  disabled={!org}
                />
                <Button
                  onClick={async () => {
                    if (!org) return;
                    setLoading(true);
                    setError('');
                    const { error } = await supabase
                      .from('organizations')
                      .update({ name: org.name })
                      .eq('id', org.id);
                    setLoading(false);
                    if (error) setError(error.message);
                  }}
                  disabled={!org || loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                {error && <div className="text-destructive text-sm mt-2">{error}</div>}
              </div>
              <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-semibold mb-2 text-destructive">Delete Organization</h2>
                <p className="mb-2 text-sm">This action cannot be undone. To confirm, type the organization name below and click Delete.</p>
                <Button variant="destructive" onClick={() => setShowDelete(true)}>
                  Delete Organization
                </Button>
              </div>
            </CardContent>
          </Card>
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Organization</DialogTitle>
              </DialogHeader>
              <div className="mb-2">Type <b>{org?.name}</b> to confirm deletion:</div>
              <input
                className="border rounded p-2 w-full mb-4"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Organization name"
              />
              {error && <div className="text-destructive text-sm mb-2">{error}</div>}
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={deleteInput !== org?.name || loading}
                  onClick={handleDelete}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 