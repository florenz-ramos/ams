"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash } from 'lucide-react';

type CollegeCampus = { id: string; cc_code: string; cc_name: string; organization_id: string };
type AcademicProgram = { id: string; name: string };
type AcademicProgramRow = { id: string | number; program_code: string; program_desc: string | null };
type AssignmentRow = { college_campus_id: string; program_id: string };
type CollegeCampusProgramIdRow = { id: number };
type CurrentRow = { id: number; program_id: string | number };

export default function CollegesCampusesSection({ orgId }: { orgId: string }) {
  const supabase = useSupabase() as SupabaseClient;
  const [colleges, setColleges] = useState<CollegeCampus[]>([]);
  const [ccCode, setCcCode] = useState("");
  const [ccName, setCcName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [collegePrograms, setCollegePrograms] = useState<Record<string, string[]>>({}); // collegeId -> programIds
  const [savingCollegeId, setSavingCollegeId] = useState<string | null>(null);
  const [addPrograms, setAddPrograms] = useState<string[]>([]);
  const [editCollegeId, setEditCollegeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchColleges = async () => {
      const { data } = await supabase
        .from("colleges_campuses")
        .select("*")
        .eq("organization_id", orgId);
      setColleges(data || []);
    };
    fetchColleges();
  }, [supabase, orgId]);

  useEffect(() => {
    // Get user from localStorage
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    if (user && user.id && orgId) {
      const fetchRole = async () => {
        setRoleLoading(true);
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single();
        setUserRole(member?.role || '');
        setRoleLoading(false);
      };
      fetchRole();
    } else {
      setUserRole('');
      setRoleLoading(false);
    }
  }, [supabase, orgId]);

  // Fetch all academic programs (filtered by org)
  useEffect(() => {
    async function fetchPrograms() {
      const { data } = await supabase
        .from("academic_programs")
        .select("id, program_code, program_desc")
        .eq("organization_id", orgId);
      setPrograms(
        (data as AcademicProgramRow[] || []).map((p) => ({
          id: String(p.id),
          name: p.program_code + (p.program_desc ? ` - ${p.program_desc}` : "")
        }))
      );
    }
    fetchPrograms();
  }, [supabase, orgId]);

  // Fetch college-program assignments
  useEffect(() => {
    async function fetchAssignments() {
      const { data } = await supabase.from("college_campus_programs").select("college_campus_id, program_id");
      const mapping: Record<string, string[]> = {};
      (data as AssignmentRow[] || []).forEach((row) => {
        if (!mapping[row.college_campus_id]) mapping[row.college_campus_id] = [];
        mapping[row.college_campus_id].push(String(row.program_id));
      });
      setCollegePrograms(mapping);
    }
    fetchAssignments();
  }, [supabase, colleges]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'faculty') {
      setError('Faculty are not allowed to add colleges/campuses.');
      return;
    }
    setLoading(true);
    setError("");
    // Insert college/campus
    const { data: inserted, error: insertError } = await supabase.from("colleges_campuses").insert([
      { cc_code: ccCode, cc_name: ccName, organization_id: orgId },
    ]).select().single();
    if (insertError || !inserted) {
      setError(insertError?.message || 'Failed to add college/campus.');
      setLoading(false);
      return;
    }
    // Insert program assignments
    if (addPrograms.length > 0) {
      await supabase.from("college_campus_programs").insert(
        addPrograms.map(program_id => ({ college_campus_id: inserted.id, program_id }))
      );
    }
    setCcCode("");
    setCcName("");
    setAddPrograms([]);
    setLoading(false);
    setShowAdd(false);
    setError("");
    // Refresh list
    const { data } = await supabase
      .from("colleges_campuses")
      .select("*")
      .eq("organization_id", orgId);
    setColleges(data || []);
    // Refresh assignments
    const { data: refreshedAssignments } = await supabase.from("college_campus_programs").select("college_campus_id, program_id");
    const mapping: Record<string, string[]> = {};
    (refreshedAssignments as AssignmentRow[] || []).forEach((row) => {
      if (!mapping[row.college_campus_id]) mapping[row.college_campus_id] = [];
      mapping[row.college_campus_id].push(String(row.program_id));
    });
    setCollegePrograms(mapping);
  };

  // Handle checkbox change
  function handleProgramToggle(collegeId: string, programId: string) {
    setCollegePrograms(prev => {
      const current = prev[collegeId] || [];
      if (current.includes(programId)) {
        return { ...prev, [collegeId]: current.filter(id => id !== programId) };
      } else {
        return { ...prev, [collegeId]: [...current, programId] };
      }
    });
  }

  // Save assignments for a college
  async function handleSaveAssignments(collegeId: string) {
    setSavingCollegeId(collegeId);
    // Get current assignments from DB
    const { data: currentRows } = await supabase.from("college_campus_programs").select("id, program_id").eq("college_campus_id", collegeId);
    const currentIds = (currentRows as CurrentRow[] || []).map((row) => String(row.program_id));
    const selectedIds = collegePrograms[collegeId] || [];
    // Calculate to add and to remove
    const toAdd = selectedIds.filter(id => !currentIds.includes(id));
    const toRemove = currentRows ? (currentRows as CurrentRow[]).filter((row) => !selectedIds.includes(String(row.program_id))).map((row) => row.id) : [];
    // Insert new assignments
    if (toAdd.length > 0) {
      await supabase.from("college_campus_programs").insert(toAdd.map(program_id => ({ college_campus_id: collegeId, program_id })));
    }
    // Delete removed assignments
    if (toRemove.length > 0) {
      await supabase.from("college_campus_programs").delete().in("id", toRemove);
    }
    setSavingCollegeId(null);
    // Refresh assignments
    const { data: refreshedAssignments2 } = await supabase.from("college_campus_programs").select("college_campus_id, program_id");
    const mapping2: Record<string, string[]> = {};
    (refreshedAssignments2 as AssignmentRow[] || []).forEach((row) => {
      if (!mapping2[row.college_campus_id]) mapping2[row.college_campus_id] = [];
      mapping2[row.college_campus_id].push(String(row.program_id));
    });
    setCollegePrograms(mapping2);
  }

  // Add a function to delete a program assignment immediately
  async function handleDeleteProgramAssignment(collegeId: string, programId: string) {
    // Find the assignment row id
    const { data } = await supabase
      .from('college_campus_programs')
      .select('id')
      .eq('college_campus_id', collegeId)
      .eq('program_id', programId)
      .single();
    const row = data as CollegeCampusProgramIdRow | null;
    if (row && row.id) {
      await supabase.from('college_campus_programs').delete().eq('id', row.id);
      // Update UI
      setCollegePrograms((prev: Record<string, string[]>) => {
        const current = prev[collegeId] || [];
        return { ...prev, [collegeId]: current.filter((id: string) => id !== programId) };
      });
    }
  }

  return (
    <Card className="mt-4 w-full">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Colleges/Campuses for this Organization</h2>
        {roleLoading ? null : userRole !== 'faculty' && (
          <Button className="mb-4" onClick={() => setShowAdd(true)}>
            Add College/Campus
          </Button>
        )}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add College/Campus</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { if (userRole === 'faculty') { e.preventDefault(); return; } else { handleAdd(e); } }} className="flex flex-col gap-4">
              <Input
                placeholder="Code"
                value={ccCode}
                onChange={e => setCcCode(e.target.value)}
                required
                disabled={loading || userRole === 'faculty'}
              />
              <Input
                placeholder="Name"
                value={ccName}
                onChange={e => setCcName(e.target.value)}
                required
                disabled={loading || userRole === 'faculty'}
              />
              <div>
                <div className="mb-1 font-medium">Programs</div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border rounded p-2">
                  {programs.map(program => (
                    <label key={program.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={addPrograms.includes(program.id)}
                        onChange={() => setAddPrograms(prev => prev.includes(program.id) ? prev.filter(id => id !== program.id) : [...prev, program.id])}
                        disabled={loading || userRole === 'faculty'}
                      />
                      {program.name}
                    </label>
                  ))}
                </div>
              </div>
              {userRole === 'faculty' && (
                <div className="text-destructive text-sm">Faculty are not allowed to add colleges/campuses.</div>
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colleges.map(college => (
              <TableRow key={college.id}>
                <TableCell>{college.cc_code}</TableCell>
                <TableCell>{college.cc_name}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => setEditCollegeId(college.id)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Edit Programs Modal */}
        <Dialog open={!!editCollegeId} onOpenChange={v => { if (!v) setEditCollegeId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Programs for College/Campus</DialogTitle>
            </DialogHeader>
            {editCollegeId && (
              <form onSubmit={e => { e.preventDefault(); handleSaveAssignments(editCollegeId); }} className="flex flex-col gap-4">
                <div className="mb-1 font-medium">Programs</div>
                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto border rounded p-2">
                  {programs.map(program => {
                    const checked = !!(collegePrograms[editCollegeId] && collegePrograms[editCollegeId].includes(program.id));
                    return (
                      <label key={program.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleProgramToggle(editCollegeId, program.id)}
                          disabled={savingCollegeId === editCollegeId}
                        />
                        {program.name}
                        {checked && (
                          <button
                            type="button"
                            className="ml-2 text-destructive hover:text-red-600"
                            title="Remove program from this college/campus"
                            onClick={() => handleDeleteProgramAssignment(editCollegeId, program.id)}
                            disabled={savingCollegeId === editCollegeId}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={savingCollegeId === editCollegeId}>
                    {savingCollegeId === editCollegeId ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setEditCollegeId(null)} disabled={savingCollegeId === editCollegeId}>
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 