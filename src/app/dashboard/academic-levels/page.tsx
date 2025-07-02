'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { AppSidebar } from '@/components/org/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/org/site-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupabaseClient } from '@supabase/supabase-js';
import { useOrganization } from '@/context/OrganizationContext';
import { cssProperties } from '@/lib/constants';

type AcademicLevel = { id: string; academic_level: string; organization_id: string };

export default function AcademicLevelsPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: selectedOrg } = useOrganization();
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [levelName, setLevelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!selectedOrg) return;
    const fetchLevels = async () => {
      const { data } = await supabase
        .from('academic_levels')
        .select('*')
        .eq('organization_id', selectedOrg.id);
      setLevels(data || []);
    };
    fetchLevels();
  }, [supabase, selectedOrg]);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    if (user && user.id && selectedOrg) {
      const fetchRole = async () => {
        setRoleLoading(true);
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', selectedOrg.id)
          .single();
        setUserRole(member?.role || '');
        setRoleLoading(false);
      };
      fetchRole();
    } else {
      setUserRole('');
      setRoleLoading(false);
    }
  }, [supabase, selectedOrg]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (userRole === 'faculty') {
      setError('Faculty are not allowed to add academic levels.');
      return;
    }
    setLoading(true);
    setError('');
    await supabase.from('academic_levels').insert([
      { academic_level: levelName, organization_id: selectedOrg.id },
    ]);
    setLevelName('');
    setLoading(false);
    setShowAdd(false);
    setError('');
    // Refresh list
    const { data } = await supabase
      .from('academic_levels')
      .select('*')
      .eq('organization_id', selectedOrg.id);
    setLevels(data || []);
  };

  return (
    <SidebarProvider
      style={cssProperties}
    >
      {selectedOrg && <AppSidebar orgId={selectedOrg.id} />}
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-col items-center gap-8 p-8">
          {!selectedOrg ? (
            <div className="w-full max-w-lg text-center text-muted-foreground">
              No organization found. Please create an organization to get started.
            </div>
          ) : (
            <Card className="w-full">
              <CardContent>
                <h2 className="text-xl font-bold mb-4">Academic Levels</h2>
                {roleLoading ? null : userRole !== 'faculty' && (
                  <Button className="mb-4" onClick={() => setShowAdd(true)}>
                    Add Academic Level
                  </Button>
                )}
                <Dialog open={showAdd} onOpenChange={setShowAdd}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Academic Level</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={e => { if (userRole === 'faculty') { e.preventDefault(); return; } else { handleAdd(e); } }} className="flex flex-col gap-4">
                      <Input
                        placeholder="Academic Level"
                        value={levelName}
                        onChange={e => setLevelName(e.target.value)}
                        required
                        disabled={loading || userRole === 'faculty'}
                      />
                      {userRole === 'faculty' && (
                        <div className="text-destructive text-sm">Faculty are not allowed to add academic levels.</div>
                      )}
                      {error && <div className="text-destructive text-sm">{error}</div>}
                      <DialogFooter>
                        <Button type="submit" disabled={loading || userRole === 'faculty'}>
                          {loading ? 'Adding...' : 'Add'}
                        </Button>
                        <Button variant="outline" type="button" onClick={() => setShowAdd(false)} disabled={loading}>
                          Cancel
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academic Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map(level => (
                      <TableRow key={level.id}>
                        <TableCell>{level.academic_level}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 