"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/org/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/org/site-header";
import { useOrganization } from "@/context/OrganizationContext";
import Link from "next/link";

export default function StudentDetailPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization } = useOrganization();
  const { studentId } = useParams();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!organization || !studentId) return;
    const fetchStudent = async () => {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("organization_students")
        .select("*")
        .eq("id", studentId)
        .single();
      if (error) setError(error.message);
      setStudent(data);
      // Fetch latest enrollment status
      const { data: statusRows } = await supabase
        .from("student_enrollment_status")
        .select("status, changed_at")
        .eq("student_id", studentId)
        .order("changed_at", { ascending: false })
        .limit(1);
      setStatus(statusRows && statusRows.length > 0 ? statusRows[0].status : null);
      setLoading(false);
    };
    fetchStudent();
  }, [supabase, organization, studentId]);

  if (!organization) return null;

  return (
    <SidebarProvider>
      <AppSidebar orgId={organization.id} />
      <SidebarInset>
        <SiteHeader />
        <main className="p-8 max-w-2xl mx-auto">
          <Button asChild variant="outline" className="mb-4">
            <Link href="/dashboard/students">&larr; Back to Students</Link>
          </Button>
          <Card>
            <CardContent>
              <h1 className="text-2xl font-bold mb-4">Student Information</h1>
              {loading ? (
                <div>Loading...</div>
              ) : error ? (
                <div className="text-destructive">{error}</div>
              ) : student ? (
                <div className="flex flex-col gap-2">
                  <div><b>Applicant No:</b> {String(student?.applicant_no) || '-'}</div>
                  <div><b>Student No:</b> {String(student?.student_no) || '-'}</div>
                  <div><b>Name:</b> {String(student?.lastname)}, {String(student?.firstname)} {String(student?.middlename) || ''}</div>
                  <div><b>Address:</b> {String(student?.address) || '-'}</div>
                  <div><b>Birthdate:</b> {String(student?.birthdate) || '-'}</div>
                  <div><b>Enrollment Status:</b> {String(status) || '-'}</div>
                  <div><b>Created At:</b> {String(student?.created_at) || '-'}</div>
                  <div><b>Updated At:</b> {String(student?.updated_at) || '-'}</div>
                  {/* Future: status history, more info, etc. */}
                </div>
              ) : (
                <div>No student found.</div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 