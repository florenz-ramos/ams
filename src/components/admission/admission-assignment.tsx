import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type College = { id: string; cc_name: string };

export default function AdmissionAssignment({ selectedApplicant, orgId, onApplicantUpdate }: { selectedApplicant: Record<string, unknown>, orgId: string, onApplicantUpdate: (a: Record<string, unknown>) => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const [colleges, setColleges] = useState<College[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");

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
    if (selectedApplicant?.assigned_college_id) {
      setSelectedCollegeId(String(selectedApplicant.assigned_college_id));
    } else {
      setSelectedCollegeId("");
    }
  }, [selectedApplicant]);

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
    } else {
      setAssignMessage("Failed to assign: " + error.message);
    }
  }

  let assignedCollege = 'Unknown';
  if (selectedApplicant.assigned_college_id) {
    const found = colleges.find(c => c.id === String(selectedApplicant.assigned_college_id));
    assignedCollege = found && typeof found.cc_name === 'string' ? found.cc_name : 'Unknown';
  }

  return (
    <form onSubmit={handleAssignCollege} className="flex flex-col gap-4 max-w-lg mt-4">
      <label className="font-medium">Assign College/Campus</label>
      <Select value={selectedCollegeId} onValueChange={setSelectedCollegeId} required>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a college/campus" />
        </SelectTrigger>
        <SelectContent>
          {colleges.map(col => (
            <SelectItem key={col.id} value={col.id}>{col.cc_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={assigning || !selectedCollegeId}>{assigning ? "Assigning..." : "Assign"}</Button>
      {assignMessage && <div className="text-green-600 text-sm">{assignMessage}</div>}
      {Boolean(selectedApplicant.assigned_college_id) && (
        <div className="mt-2 text-sm">Currently assigned: <b>{assignedCollege}</b></div>
      )}
    </form>
  );
} 