import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

export default function AdmissionInterview({ selectedApplicant }: { selectedApplicant: Record<string, unknown> }) {
  const supabase = useSupabase() as SupabaseClient;
  const [interviewNotes, setInterviewNotes] = useState("");
  const [savingInterview, setSavingInterview] = useState(false);
  const [interviewMessage, setInterviewMessage] = useState("");
  const [latestInterview, setLatestInterview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLatestInterview() {
      if (!selectedApplicant) {
        setLatestInterview(null);
        return;
      }
      const { data } = await supabase
        .from("applicant_interviews")
        .select("notes, created_at")
        .eq("applicant_id", selectedApplicant.id)
        .order("created_at", { ascending: false })
        .limit(1);
      setLatestInterview(data && data.length > 0 ? data[0].notes : null);
    }
    fetchLatestInterview();
  }, [selectedApplicant, savingInterview, supabase]);

  async function handleSaveInterview(e: React.FormEvent) {
    e.preventDefault();
    setSavingInterview(true);
    setInterviewMessage("");
    if (!selectedApplicant) return;
    const { error } = await supabase.from("applicant_interviews").insert({
      applicant_id: selectedApplicant.id,
      notes: interviewNotes
    });
    setSavingInterview(false);
    if (!error) {
      setInterviewMessage("Interview record saved!");
      setInterviewNotes("");
    } else {
      setInterviewMessage("Failed to save interview record: " + error.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSaveInterview} className="flex flex-col gap-4 max-w-lg mt-4">
        <textarea
          placeholder="Interview Notes / Conversation Summary"
          value={interviewNotes}
          onChange={e => setInterviewNotes(e.target.value)}
          className="border rounded px-3 py-2 min-h-[100px]"
          required
        />
        <Button type="submit" disabled={savingInterview}>{savingInterview ? "Saving..." : "Save Interview Record"}</Button>
        {interviewMessage && <div className="text-green-600 text-sm">{interviewMessage}</div>}
      </form>
      {latestInterview && (
        <div className="mt-6 p-4 border rounded bg-muted">
          <div className="font-semibold mb-1">Latest Interview Notes:</div>
          <div className="whitespace-pre-line">{latestInterview}</div>
        </div>
      )}
    </div>
  );
} 