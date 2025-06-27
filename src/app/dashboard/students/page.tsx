"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { useOrganization } from "@/context/OrganizationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Link from 'next/link';

const STATUS = ["applicant", "enrolled"];

type Student = {
  id: string;
  applicant_no: string;
  student_no: string;
  lastname: string;
  firstname: string;
  middlename?: string;
  address?: string;
  birthdate?: string;
  [key: string]: unknown;
};

type StatusRow = {
  student_id: string;
  status: string;
  changed_at: string;
  [key: string]: unknown;
};

export default function StudentManagementPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization } = useOrganization();
  const [students, setStudents] = useState<Student[]>([]);
  const [statusFilter, setStatusFilter] = useState("applicant");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    lastname: "",
    firstname: "",
    middlename: "",
    address: "",
    birthdate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch students and their latest status
  useEffect(() => {
    if (!organization) return;
    const fetchStudents = async () => {
      // 1. Fetch all students for the org
      const { data: studentsData, error: studentsError } = await supabase
        .from("organization_students")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (studentsError) return;
      if (!studentsData) return setStudents([]);
      const studentIds = studentsData.map((s: Student) => s.id);
      if (studentIds.length === 0) return setStudents([]);
      // 2. Fetch latest status for all students
      const { data: statusData, error: statusError } = await supabase
        .from("student_enrollment_status")
        .select("student_id, status, changed_at")
        .in("student_id", studentIds);
      if (statusError) return;
      // 3. Find latest status per student
      const latestStatusMap: Record<string, string> = {};
      statusData?.forEach((row: StatusRow) => {
        if (!latestStatusMap[row.student_id] || new Date(row.changed_at) > new Date((statusData.find((r: StatusRow) => r.student_id === row.student_id && latestStatusMap[row.student_id] === r.status)?.changed_at || 0))) {
          latestStatusMap[row.student_id] = row.status;
        }
      });
      // 4. Attach latest status and filter
      const filtered = studentsData.filter((s: Student) => latestStatusMap[s.id] === statusFilter)
        .map((s: Student) => ({ ...s, latest_status: latestStatusMap[s.id] }));
      setStudents(filtered as Student[]);
    };
    fetchStudents();
  }, [supabase, organization, statusFilter]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Add new applicant: insert student, then status
  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!organization) return;
    // 1. Insert student
    const { data, error: studentError } = await supabase.from("organization_students").insert({
      ...form,
      organization_id: organization.id,
    }).select().single();
    if (studentError) {
      setLoading(false);
      setError(studentError.message);
      return;
    }
    // 2. Insert status row
    await supabase.from("student_enrollment_status").insert({
      student_id: data.id,
      status: "applicant",
    });
    setLoading(false);
    setShowDialog(false);
    setForm({ lastname: "", firstname: "", middlename: "", address: "", birthdate: "" });
    // Refresh list
    const { data: studentsData } = await supabase
      .from("organization_students")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });
    setStudents(studentsData || []);
  };

  if (!organization) return null;

  return (
    <SidebarProvider>
      <AppSidebar orgId={organization.id} />
      <SidebarInset>
        <SiteHeader />
        <main className="p-8">
          <h1 className="text-2xl font-bold mb-4">Student Management</h1>
          <div className="flex gap-4 mb-4">
            {STATUS.map(s => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            <Button className="ml-auto" onClick={() => setShowDialog(true)}>Add Applicant</Button>
          </div>
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant No</TableHead>
                    <TableHead>Student No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Birthdate</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.applicant_no}</TableCell>
                      <TableCell>{s.student_no || "-"}</TableCell>
                      <TableCell>{s.lastname}, {s.firstname} {s.middlename || ""}</TableCell>
                      <TableCell>{s.address}</TableCell>
                      <TableCell>{s.birthdate}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/students/${s.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No students found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Applicant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="flex flex-col gap-2">
                <Input name="lastname" placeholder="Last Name" value={form.lastname} onChange={handleInput} required />
                <Input name="firstname" placeholder="First Name" value={form.firstname} onChange={handleInput} required />
                <Input name="middlename" placeholder="Middle Name (optional)" value={form.middlename} onChange={handleInput} />
                <Input name="address" placeholder="Address" value={form.address} onChange={handleInput} required />
                <Input name="birthdate" type="date" placeholder="Birthdate" value={form.birthdate} onChange={handleInput} required />
                {error && <div className="text-destructive text-sm">{error}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Applicant"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 