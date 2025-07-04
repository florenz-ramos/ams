import { useEffect, useState, useMemo } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { useTheme } from "@/context/ThemeContext";
import { ThemeButton } from "@/components/ui/theme-button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type College = { id: string; cc_name: string };
type AcademicProgram = { id: string; name: string };
type AcademicProgramRow = { id: string | number; program_code: string; program_desc: string | null };
type AssignmentRow = { college_campus_id: string; program_id: string };

export default function AdmissionAssignment({ selectedApplicant, orgId, onApplicantUpdate }: { selectedApplicant: Record<string, unknown>, orgId: string, onApplicantUpdate: (a: Record<string, unknown>) => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const { theme } = useTheme();
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [collegePrograms, setCollegePrograms] = useState<Record<string, string[]>>({}); // collegeId -> programIds
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [assignedProgram, setAssignedProgram] = useState<AcademicProgram | null>(null);

  // Fetch colleges
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

  // Fetch all academic programs for the org
  useEffect(() => {
    async function fetchPrograms() {
      if (!orgId) return;
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
  }, [orgId, supabase]);

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

  // Set selected college from applicant after colleges are loaded
  useEffect(() => {
    if (
      selectedApplicant?.assigned_college_id &&
      colleges.some(c => String(c.id) === String(selectedApplicant.assigned_college_id))
    ) {
      setSelectedCollegeId(String(selectedApplicant.assigned_college_id));
    }
  }, [selectedApplicant, colleges]);

  // Filter programs for the selected college
  const filteredPrograms = useMemo(() => (
    selectedCollegeId && collegePrograms[selectedCollegeId]
      ? programs.filter(p => collegePrograms[selectedCollegeId].includes(p.id))
      : []
  ), [selectedCollegeId, collegePrograms, programs]);

  // Set selected program from applicant after filteredPrograms are loaded
  useEffect(() => {
    if (
      selectedApplicant?.assigned_program_id &&
      filteredPrograms.some(p => String(p.id) === String(selectedApplicant.assigned_program_id))
    ) {
      setSelectedProgramId(String(selectedApplicant.assigned_program_id));
    }
  }, [selectedApplicant, filteredPrograms]);

  const assignedProgramId = String(selectedApplicant?.assigned_program_id);
  const assignedProgramOption =
    assignedProgram && !filteredPrograms.find(p => p.id === assignedProgramId)
      ? [{ id: assignedProgram.id, name: assignedProgram.name }]
      : [];

  const assignedCollegeObj = colleges.find(c => String(c.id) === selectedCollegeId);
  const assignedCollege = assignedCollegeObj ? assignedCollegeObj.cc_name : '';

  useEffect(() => {
    async function fetchAssignedProgramIfMissing() {
      if (
        selectedApplicant?.assigned_program_id &&
        selectedCollegeId &&
        !filteredPrograms.find(p => p.id === String(selectedApplicant.assigned_program_id))
      ) {
        // Fetch the program directly if not in the filtered list
        const { data } = await supabase
          .from('academic_programs')
          .select('id, program_code, program_desc')
          .eq('id', selectedApplicant.assigned_program_id)
          .single();
        if (data) {
          setAssignedProgram({
            id: String(data.id),
            name: data.program_code + (data.program_desc ? ` - ${data.program_desc}` : '')
          });
        } else {
          setAssignedProgram(null);
        }
      } else {
        setAssignedProgram(null);
      }
    }
    fetchAssignedProgramIfMissing();
  }, [selectedApplicant, selectedCollegeId, filteredPrograms, supabase]);

  useEffect(() => {
    if (
      selectedCollegeId &&
      selectedProgramId &&
      !filteredPrograms.find(p => p.id === selectedProgramId)
    ) {
      setSelectedProgramId("");
    }
  }, [selectedCollegeId, selectedProgramId, filteredPrograms]);

  // When the user changes the college/campus, always clear selectedProgramId
  const handleCollegeChange = (collegeId: string) => {
    setSelectedCollegeId(collegeId);
    setSelectedProgramId("");
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setAssigning(true);
        setAssignMessage("");
        const { error } = await supabase
          .from("organization_students")
          .update({
            assigned_college_id: selectedCollegeId,
            assigned_program_id: selectedProgramId,
          })
          .eq("id", selectedApplicant.id);
        setAssigning(false);
        if (!error) {
          setAssignMessage("College/Campus and Program assigned!");
          onApplicantUpdate({
            ...selectedApplicant,
            assigned_college_id: selectedCollegeId,
            assigned_program_id: selectedProgramId,
          });
        } else {
          setAssignMessage("Failed to assign: " + error.message);
        }
      }}
      className="flex flex-col gap-4 max-w-lg mt-4"
    >
      <label className="font-medium theme-text">Assign College/Campus</label>
      <Select value={selectedCollegeId} onValueChange={handleCollegeChange} required>
        <SelectTrigger className="w-full" style={{ borderColor: theme.secondary_color }}>
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
      {selectedCollegeId && (
        <>
          <label className="font-medium theme-text">Assign Program</label>
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId} required>
            <SelectTrigger className="w-full" style={{ borderColor: theme.secondary_color }}>
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {assignedProgramOption.length > 0 && (
                <SelectItem
                  key={assignedProgramOption[0].id}
                  value={assignedProgramOption[0].id}
                >
                  {assignedProgramOption[0].name}
                </SelectItem>
              )}
              {assignedProgramOption.length > 0 && filteredPrograms.length > 0 && (
                <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
              )}
              {filteredPrograms.length === 0 ? (
                <div className="p-2 text-sm text-destructive">
                  No programs assigned to this college/campus. Please assign programs in Colleges/Campuses management.
                </div>
              ) : (
                filteredPrograms.map(prog => (
                  <SelectItem key={prog.id} value={prog.id}>
                    {prog.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </>
      )}
      <ThemeButton
        type="submit"
        variant="primary"
        disabled={assigning || !selectedCollegeId || !selectedProgramId}
      >
        {assigning ? "Assigning..." : "Assign"}
      </ThemeButton>
      {assignMessage && <div className="text-sm" style={{ color: theme.accent_color }}>{assignMessage}</div>}
      {Boolean(selectedCollegeId) && (
        <div className="mt-2 text-sm theme-text">Currently assigned: <b>{assignedCollege || 'Unknown'}</b></div>
      )}
      {Boolean(selectedProgramId) && (
        <div className="mt-2 text-sm theme-text">
          Currently assigned: <b>{filteredPrograms.find(p => p.id === selectedProgramId)?.name || assignedProgram?.name || 'Unknown'}</b>
        </div>
      )}
    </form>
  );
} 