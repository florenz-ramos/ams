'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SupabaseClient } from '@supabase/supabase-js';
import { Pencil, Trash } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';

type AcademicProgram = { 
  id: string; 
  program_code: string; 
  program_desc: string; 
  academic_level_id: string; 
  years: number; 
  isBoard: boolean; 
};

type AcademicLevel = { id: string; academic_level: string };

export default function AcademicProgramPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: selectedOrg } = useOrganization();
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
  const [programCode, setProgramCode] = useState('');
  const [programDesc, setProgramDesc] = useState('');
  const [academicLevelId, setAcademicLevelId] = useState('');
  const [years, setYears] = useState('');
  const [isBoard, setIsBoard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [editProgram, setEditProgram] = useState<AcademicProgram | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('academic_programs')
        .select('*');
      setPrograms(data || []);
    };
    fetchPrograms();
  }, [supabase]);

  useEffect(() => {
    if (!selectedOrg) return;
    const fetchAcademicLevels = async () => {
      const { data } = await supabase
        .from('academic_levels')
        .select('*')
        .eq('organization_id', selectedOrg.id);
      setAcademicLevels(data || []);
    };
    fetchAcademicLevels();
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

  useEffect(() => {
    if (!selectedOrg) return;
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('academic_programs')
        .select('*')
        .eq('organization_id', selectedOrg.id);
      setPrograms(data || []);
    };
    fetchPrograms();
  }, [supabase, selectedOrg]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (userRole === 'faculty') {
      setError('Faculty are not allowed to add academic programs.');
      return;
    }
    setLoading(true);
    setError('');
    await supabase.from('academic_programs').insert([
      {
        program_code: programCode,
        program_desc: programDesc,
        academic_level_id: academicLevelId || null,
        years: years ? parseInt(years) : null,
        isBoard: isBoard,
        organization_id: selectedOrg.id,
      },
    ]);
    setProgramCode('');
    setProgramDesc('');
    setAcademicLevelId('');
    setYears('');
    setIsBoard(false);
    setLoading(false);
    setShowAdd(false);
    setError('');
    // Refresh list
    const { data } = await supabase
      .from('academic_programs')
      .select('*')
      .eq('organization_id', selectedOrg.id);
    setPrograms(data || []);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !editProgram) return;
    setLoading(true);
    setError('');
    await supabase.from('academic_programs')
      .update({
        program_code: editProgram.program_code,
        program_desc: editProgram.program_desc,
        academic_level_id: editProgram.academic_level_id || null,
        years: editProgram.years ? parseInt(String(editProgram.years)) : null,
        isBoard: editProgram.isBoard,
        organization_id: selectedOrg.id,
      })
      .eq('id', editProgram.id)
      .eq('organization_id', selectedOrg.id);
    setShowEdit(false);
    setEditProgram(null);
    setLoading(false);
    // Refresh list
    const { data } = await supabase
      .from('academic_programs')
      .select('*')
      .eq('organization_id', selectedOrg.id);
    setPrograms(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!selectedOrg) return;
    setLoading(true);
    setError('');
    await supabase.from('academic_programs')
      .delete()
      .eq('id', id)
      .eq('organization_id', selectedOrg.id);
    setLoading(false);
    // Refresh list
    const { data } = await supabase
      .from('academic_programs')
      .select('*')
      .eq('organization_id', selectedOrg.id);
    setPrograms(data || []);
  };

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      } as React.CSSProperties}
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
                <h2 className="text-xl font-bold mb-4">Academic Programs</h2>
                {roleLoading ? null : userRole !== 'faculty' && (
                  <Button className="mb-4" onClick={() => setShowAdd(true)}>
                    Add Academic Program
                  </Button>
                )}
                <Dialog open={showAdd} onOpenChange={setShowAdd}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Academic Program</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={e => { if (userRole === 'faculty') { e.preventDefault(); return; } else { handleAdd(e); } }} className="flex flex-col gap-4">
                      <Input
                        placeholder="Program Code"
                        value={programCode}
                        onChange={e => setProgramCode(e.target.value)}
                        required
                        disabled={loading || userRole === 'faculty'}
                      />
                      <Input
                        placeholder="Program Description"
                        value={programDesc}
                        onChange={e => setProgramDesc(e.target.value)}
                        disabled={loading || userRole === 'faculty'}
                      />
                      <Select value={academicLevelId} onValueChange={setAcademicLevelId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Academic Level" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicLevels.map(level => (
                            <SelectItem key={level.id} value={String(level.id)}>
                              {level.academic_level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Years"
                        value={years}
                        onChange={e => setYears(e.target.value)}
                        disabled={loading || userRole === 'faculty'}
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isBoard"
                          checked={isBoard}
                          onCheckedChange={(checked) => setIsBoard(checked as boolean)}
                          disabled={loading || userRole === 'faculty'}
                        />
                        <label htmlFor="isBoard">Is Board Program</label>
                      </div>
                      {userRole === 'faculty' && (
                        <div className="text-destructive text-sm">Faculty are not allowed to add academic programs.</div>
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
                      <TableHead>Program Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Academic Level</TableHead>
                      <TableHead>Years</TableHead>
                      <TableHead>Is Board</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map(program => (
                      <TableRow key={program.id}>
                        <TableCell>{program.program_code}</TableCell>
                        <TableCell>{program.program_desc}</TableCell>
                        <TableCell>
                          {academicLevels.find(level => String(level.id) === String(program.academic_level_id))?.academic_level || 'N/A'}
                        </TableCell>
                        <TableCell>{program.years || 'N/A'}</TableCell>
                        <TableCell>{program.isBoard ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => { setEditProgram(program); setShowEdit(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(program.id)}><Trash className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Academic Program</DialogTitle>
          </DialogHeader>
          {editProgram && (
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <Input
                placeholder="Program Code"
                value={editProgram.program_code}
                onChange={e => setEditProgram({ ...editProgram, program_code: e.target.value })}
                required
              />
              <Input
                placeholder="Program Description"
                value={editProgram.program_desc}
                onChange={e => setEditProgram({ ...editProgram, program_desc: e.target.value })}
              />
              <Select value={editProgram.academic_level_id} onValueChange={val => setEditProgram({ ...editProgram, academic_level_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Academic Level" />
                </SelectTrigger>
                <SelectContent>
                  {academicLevels.map(level => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      {level.academic_level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Years"
                value={editProgram.years || ''}
                onChange={e => setEditProgram({ ...editProgram, years: Number(e.target.value) })}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isBoardEdit"
                  checked={editProgram.isBoard}
                  onCheckedChange={checked => setEditProgram({ ...editProgram, isBoard: !!checked })}
                />
                <label htmlFor="isBoardEdit">Is Board Program</label>
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowEdit(false)} disabled={loading}>
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
} 