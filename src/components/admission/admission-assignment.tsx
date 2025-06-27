import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type College = { id: string; cc_name: string };
type Program = { id: string; name: string };
type ProgramRow = {
  program_id: string | number;
  academic_programs: { program_code: string; program_desc: string | null }[];
};

export default function AdmissionAssignment({ selectedApplicant, orgId, onApplicantUpdate }: { selectedApplicant: Record<string, unknown>, orgId: string, onApplicantUpdate: (a: Record<string, unknown>) => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const [colleges, setColleges] = useState<College[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [assigningProgram, setAssigningProgram] = useState(false);
  const [assignProgramMessage, setAssignProgramMessage] = useState("");

  useEffect(() => {
    async function fetchColleges() {
      if (!orgId) return;
      const { data } = await supabase
        .from("colleges_campuses")
        .select("id, cc_name")
        .eq("organization_id", orgId);
      setColleges((data as College[]) || []);
    }
    fetchColleges();
  }, [orgId, supabase]);

  useEffect(() => {
    if (selectedApplicant?.assigned_college_id && colleges.length > 0) {
      setSelectedCollegeId(String(selectedApplicant.assigned_college_id));
    } else {
      setSelectedCollegeId("");
    }
  }, [selectedApplicant, colleges]);

  useEffect(() => {
    if (!selectedCollegeId) {
      setPrograms([]);
      setSelectedProgramId("");
      return;
    }
    async function fetchPrograms() {
      const { data } = await supabase
        .from("college_campus_programs")
        .select("program_id, academic_programs(program_code, program_desc)")
        .eq("college_campus_id", selectedCollegeId);
      const mapped = (data as ProgramRow[] || []).map((d) => {
        const prog = d.academic_programs[0];
        return {
          id: String(d.program_id),
          name: prog ? prog.program_code + (prog.program_desc ? ` - ${prog.program_desc}` : "") : ""
        };
      });
      setPrograms(mapped);
      // Debug log
      console.log('Fetched programs for college', selectedCollegeId, mapped);
    }
    fetchPrograms();
  }, [selectedCollegeId, supabase]);

  useEffect(() => {
    if (selectedApplicant?.assigned_program_id && programs.length > 0) {
      setSelectedProgramId(String(selectedApplicant.assigned_program_id));
    } else {
      setSelectedProgramId("");
    }
  }, [selectedApplicant, programs]);

  async function handleAssignCollege(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true);
    setAssignMessage("");
    const collegeId = selectedCollegeId;
    const { error } = await supabase
      .from("organization_students")
      .update({ assigned_college_id: collegeId })
      .eq("id", selectedApplicant.id);
    setAssigning(false);
    if (!error) {
      setAssignMessage("College/Campus assigned!");
      onApplicantUpdate({ ...selectedApplicant, assigned_college_id: collegeId });
      // Force re-fetch of programs after assignment
      if (collegeId) {
        const { data } = await supabase
          .from("college_campus_programs")
          .select("program_id, academic_programs(program_code, program_desc)")
          .eq("college_campus_id", collegeId);
        const mapped = (data as ProgramRow[] || []).map((d) => {
          const prog = d.academic_programs[0];
          return {
            id: String(d.program_id),
            name: prog ? prog.program_code + (prog.program_desc ? ` - ${prog.program_desc}` : "") : ""
          };
        });
        setPrograms(mapped);
        // Debug log
        console.log('Fetched programs for college (after assign)', collegeId, mapped);
      }
    } else {
      setAssignMessage("Failed to assign: " + error.message);
    }
  }

  async function handleAssignProgram(e: React.FormEvent) {
    e.preventDefault();
    setAssigningProgram(true);
    setAssignProgramMessage("");
    const { error } = await supabase
      .from("organization_students")
      .update({ assigned_program_id: selectedProgramId })
      .eq("id", selectedApplicant.id);
    setAssigningProgram(false);
    if (!error) {
      setAssignProgramMessage("Program assigned!");
      onApplicantUpdate({ ...selectedApplicant, assigned_program_id: selectedProgramId });
    } else {
      setAssignProgramMessage("Failed to assign: " + error.message);
    }
  }

  const assignedCollegeObj = colleges.find(c => String(c.id) === selectedCollegeId);
  const assignedCollege = assignedCollegeObj ? assignedCollegeObj.cc_name : '';

  return (
    <form onSubmit={handleAssignCollege} className="flex flex-col gap-4 max-w-lg mt-4">
      <label className="font-medium">Assign College/Campus</label>
      <Select value={selectedCollegeId} onValueChange={setSelectedCollegeId} required>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a college/campus" />
        </SelectTrigger>
        <SelectContent>
          {colleges.length === 0 ? (
            <div className="p-2 text-sm">{orgId ? "No colleges found." : "Loading..."}</div>
          ) : (
            colleges.map(col => (
              <SelectItem key={col.id} value={String(col.id)}>{col.cc_name}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={assigning || !selectedCollegeId}>{assigning ? "Assigning..." : "Assign"}</Button>
      {assignMessage && <div className="text-green-600 text-sm">{assignMessage}</div>}
      {Boolean(selectedCollegeId) && (
        <div className="mt-2 text-sm">Currently assigned: <b>{assignedCollege || 'Unknown'}</b></div>
      )}
      {selectedCollegeId && (
        <form onSubmit={handleAssignProgram} className="flex flex-col gap-4 max-w-lg mt-4">
          <label className="font-medium">Assign Program</label>
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.length === 0 ? (
                <div className="p-2 text-sm text-destructive">No programs assigned to this college/campus. Please assign programs in Colleges/Campuses management.</div>
              ) : (
                programs.map(prog => (
                  <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={assigningProgram || !selectedProgramId}>{assigningProgram ? "Assigning..." : "Assign Program"}</Button>
          {assignProgramMessage && <div className="text-green-600 text-sm">{assignProgramMessage}</div>}
          {Boolean(selectedProgramId) && (
            <div className="mt-2 text-sm">Currently assigned: <b>{programs.find(p => p.id === selectedProgramId)?.name || 'Unknown'}</b></div>
          )}
        </form>
      )}
    </form>
  );
} 