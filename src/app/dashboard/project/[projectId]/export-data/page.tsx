"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { AttendanceDTRPdf } from "@/components/AttendanceDTRPdf";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/project-sidebar";
import ProjectHeader from "@/components/project-header";

type Project = {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
};

type DTRDay = {
  amArrival?: string;
  amDeparture?: string;
  pmArrival?: string;
  pmDeparture?: string;
  undertimeHours?: string;
  undertimeMinutes?: string;
};
type AttendanceData = { [day: number]: DTRDay };

export default function ExportDataPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = useSupabase() as SupabaseClient;
  const [faculty, setFaculty] = useState<{ id: string; name: string }[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(5, 7));
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [project, setProject] = useState<Project | null>(null);
  const [orgId, setOrgId] = useState<string>('');

  useEffect(() => {
    async function fetchProject() {
      if (!projectId) return;
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, organization_id')
        .eq('id', projectId)
        .single();
      if (data) {
        setOrgId(data.organization_id);
        setProject(data as Project);
      }
    }
    fetchProject();
  }, [projectId, supabase]);

  // Fetch faculty list
  useEffect(() => {
    async function fetchFaculty() {
      if (!orgId) return;
      const { data: members } = await supabase
        .from("organization_team_members")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "faculty");
      const facultyIds = (members || []).map((m: { user_id: string }) => m.user_id);
      if (facultyIds.length > 0) {
        const { data: facultyData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", facultyIds);
        setFaculty((facultyData as { id: string; name: string }[]) || []);
      }
    }
    fetchFaculty();
  }, [orgId, supabase]);

  // Fetch attendance for selected faculty/month/year
  useEffect(() => {
    async function fetchAttendance() {
      if (!selectedFaculty || !month || !year) return;
      const firstDay = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const { data } = await supabase
        .from("attendance")
        .select("date, times")
        .eq("project_id", projectId)
        .eq("faculty_id", selectedFaculty)
        .gte("date", firstDay)
        .lte("date", endDate);

      // Map attendance to DTR format
      const dtr: AttendanceData = {};
      (data || []).forEach((row: { date: string; times: { label: string; time: string }[] }) => {
        const day = Number(row.date.split("-")[2]);
        
        // Helper to find the LAST slot matching any of the given patterns
        function findSlot(patterns: string[]) {
          const reversedTimes = row.times ? [...row.times].reverse() : [];
          return reversedTimes.find(slot =>
            patterns.some(p => new RegExp(p, "i").test(slot.label))
          )?.time || "";
        }
        
        const amArrival = findSlot(["MORNING IN", "AM IN", "A.M. ARRIVAL"]);
        const amDeparture = findSlot(["MORNING OUT", "NOON OUT", "LUNCH OUT", "AM OUT", "A.M. DEPARTURE"]);
        const pmArrival = findSlot(["AFTERNOON IN", "PM IN", "P.M. ARRIVAL"]);
        const pmDeparture = findSlot(["AFTERNOON OUT", "PM OUT", "P.M. DEPARTURE"]);
        dtr[day] = { amArrival, amDeparture, pmArrival, pmDeparture };
      });
      setAttendanceData(dtr);
    }
    fetchAttendance();
  }, [selectedFaculty, month, year, projectId, supabase]);

  return (
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 72)', '--header-height': 'calc(var(--spacing) * 12)' } as React.CSSProperties}>
      {orgId && <ProjectSidebar projectId={projectId as string} orgId={orgId} />}
      <SidebarInset>
        <ProjectHeader project={project} />
        <main className="p-8">
          <div className="max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Export Faculty DTR</h1>
            <div className="mb-4 flex gap-4 items-end">
              <div>
                <Label htmlFor="faculty">Faculty</Label>
                <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                  <SelectTrigger id="faculty" className="w-64">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculty.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="month">Month</Label>
                <Input id="month" type="number" min={1} max={12} value={month} onChange={e => setMonth(e.target.value)} className="w-20" />
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" min={2000} max={2100} value={year} onChange={e => setYear(e.target.value)} className="w-24" />
              </div>
            </div>
            {selectedFaculty && (
              <PDFDownloadLink
                document={
                  <AttendanceDTRPdf
                    name={faculty.find(f => f.id === selectedFaculty)?.name || ''}
                    month={month}
                    year={year}
                    attendanceData={attendanceData}
                  />
                }
                fileName={`DTR-${faculty.find(f => f.id === selectedFaculty)?.name || ''}-${month}-${year}.pdf`}
              >
                {({ loading }) => (
                  <Button disabled={loading} className="mt-4">
                    {loading ? 'Generating PDF...' : 'Download DTR PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 