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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function OrganizationSettingsPage() {
  const supabase = useSupabase() as SupabaseClient;
  const router = useRouter();
  const { organization: org, setOrganization } = useOrganization();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Numbering settings state
  const [numbering, setNumbering] = useState({
    applicant_no: { prefix: '', next_number: 1, format: '' },
    student_no: { prefix: '', next_number: 1, format: '' },
  });
  const [numberingLoading, setNumberingLoading] = useState(false);
  const [numberingError, setNumberingError] = useState('');
  const [activeTab, setActiveTab] = useState('general');

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

  // Fetch numbering settings
  useEffect(() => {
    if (!org) return;
    setNumberingLoading(true);
    supabase
      .from('organization_numbering_settings')
      .select('*')
      .eq('organization_id', org.id)
      .then(({ data, error }) => {
        if (error) {
          setNumberingError(error.message);
        } else if (data) {
          const n = { ...numbering };
          data.forEach((row: Record<string, unknown>) => {
            if (row.type === 'applicant_no') n.applicant_no = row as { prefix: string; next_number: number; format: string };
            if (row.type === 'student_no') n.student_no = row as { prefix: string; next_number: number; format: string };
          });
          setNumbering(n);
        }
        setNumberingLoading(false);
      });
  }, [supabase, org, numbering]);

  const handleNumberingChange = (type: 'applicant_no' | 'student_no', field: string, value: string | number) => {
    setNumbering(n => ({
      ...n,
      [type]: { ...n[type], [field]: value },
    }));
  };

  const handleNumberingSave = async (type: 'applicant_no' | 'student_no') => {
    if (!org) return;
    setNumberingLoading(true);
    setNumberingError('');
    const row = numbering[type];
    const { error } = await supabase.from('organization_numbering_settings').upsert({
      organization_id: org.id,
      type,
      prefix: row.prefix,
      next_number: row.next_number,
      format: row.format,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,type' });
    setNumberingLoading(false);
    if (error) setNumberingError(error.message);
  };

  const handleDelete = async () => {
    if (!org) return;
    if (userRole !== 'owner') {
      setError('Only the owner can delete this organization.');
      return;
    }
    setLoading(true);
    setError('');
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="numbering">Numbering</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
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
                </TabsContent>
                <TabsContent value="numbering">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Application Number Settings</h2>
                    <label className="block mb-1">Prefix</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.applicant_no.prefix}
                      onChange={e => handleNumberingChange('applicant_no', 'prefix', e.target.value)}
                      placeholder="e.g. APP-"
                    />
                    <div className="text-xs text-muted-foreground mb-2">Prefix to appear before the application number (e.g. APP-2024-0001)</div>
                    <label className="block mb-1">Next Number</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      type="number"
                      value={numbering.applicant_no.next_number}
                      onChange={e => handleNumberingChange('applicant_no', 'next_number', Number(e.target.value))}
                      placeholder="e.g. 1"
                    />
                    <div className="text-xs text-muted-foreground mb-2">The next number to be used for a new applicant</div>
                    <label className="block mb-1">Format</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.applicant_no.format}
                      onChange={e => handleNumberingChange('applicant_no', 'format', e.target.value)}
                      placeholder="e.g. APP-{year}-{number:04d}"
                    />
                    <div className="text-xs text-muted-foreground mb-4">Format for the full application number. Use <code>{'{year}'}</code> for year and <code>{'{number:04d}'}</code> for zero-padded number.</div>
                    <Button onClick={() => handleNumberingSave('applicant_no')} disabled={numberingLoading}>
                      {numberingLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Student Number Settings</h2>
                    <label className="block mb-1">Prefix</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.student_no.prefix}
                      onChange={e => handleNumberingChange('student_no', 'prefix', e.target.value)}
                      placeholder="e.g. STU-"
                    />
                    <div className="text-xs text-muted-foreground mb-2">Prefix to appear before the student number (e.g. STU-2024-0001)</div>
                    <label className="block mb-1">Next Number</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      type="number"
                      value={numbering.student_no.next_number}
                      onChange={e => handleNumberingChange('student_no', 'next_number', Number(e.target.value))}
                      placeholder="e.g. 1"
                    />
                    <div className="text-xs text-muted-foreground mb-2">The next number to be used for a new student</div>
                    <label className="block mb-1">Format</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.student_no.format}
                      onChange={e => handleNumberingChange('student_no', 'format', e.target.value)}
                      placeholder="e.g. STU-{year}-{number:04d}"
                    />
                    <div className="text-xs text-muted-foreground mb-4">Format for the full student number. Use <code>{'{year}'}</code> for year and <code>{'{number:04d}'}</code> for zero-padded number.</div>
                    <Button onClick={() => handleNumberingSave('student_no')} disabled={numberingLoading}>
                      {numberingLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {numberingError && <div className="text-destructive text-sm mt-2">{numberingError}</div>}
                </TabsContent>
              </Tabs>
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