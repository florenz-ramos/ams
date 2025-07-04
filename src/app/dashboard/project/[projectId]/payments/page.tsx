"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { useOrganization } from "@/context/OrganizationContext";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import ProjectHeader from "@/components/projects/project-header";
import { SupabaseClient } from '@supabase/supabase-js';

// Minimal interfaces
interface Enrollment {
  id: string;
  student_id: string;
  course_offering_id: string;
  status: string;
  [key: string]: unknown;
}

export default function PaymentsPage() {
    const supabase = useSupabase() as SupabaseClient;
    const { organization: org } = useOrganization();
    const params = useParams();
    const projectIdRaw = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
    const projectId = projectIdRaw || "";

    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [amount, setAmount] = useState(0);
    const [paymentNumber, setPaymentNumber] = useState(1);
    const [remarks, setRemarks] = useState("");
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        if (!org || !projectId) return;
        // Fetch enrollments with student and course info
        const fetchData = async () => {
            const { data: enrollmentsData } = await supabase
                .from("enrollments")
                .select("*, student:student_id(id, lastname, firstname, student_no), offering:course_offering_id(*), payments:student_payments(*)")
                .eq("organization_id", org.id)
                .eq("project_id", projectId);
            setEnrollments(enrollmentsData || []);
        };
        fetchData();
    }, [supabase, org, projectId, refresh]);

    const openPaymentDialog = (enrollment: Enrollment) => {
        setSelectedEnrollment(enrollment);
        setAmount(0);
        setPaymentNumber(1);
        setRemarks("");
        setShowDialog(true);
    };

    const handleAddPayment = async () => {
        if (!selectedEnrollment) return;
        await supabase.from("student_payments").insert({
            enrollment_id: selectedEnrollment.id,
            amount,
            payment_number: paymentNumber,
            remarks
        });
        setShowDialog(false);
        setRefresh(r => r + 1);
    };

    return (
        <SidebarProvider>
            {org && <ProjectSidebar orgId={org.id} projectId={projectId} />}
            <SidebarInset>
                <ProjectHeader project={null} />
                <div className="w-full mx-auto p-4">
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>Student Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payments</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {enrollments.map(enr => (
                                        <TableRow key={enr.id}>
                                            <TableCell>{enr.student ? `${(enr.student as { student_no?: string; lastname?: string; firstname?: string }).student_no ? (enr.student as { student_no: string }).student_no + ' - ' : ''}${(enr.student as { lastname?: string }).lastname}, ${(enr.student as { firstname?: string }).firstname}` : 'N/A'}</TableCell>
                                            <TableCell>{(enr.offering as { course_id?: string })?.course_id || 'N/A'}</TableCell>
                                            <TableCell>{enr.status}</TableCell>
                                            <TableCell>
                                                {Array.isArray(enr.payments) && (enr.payments as { id: string; amount: number; payment_number: number; payment_date?: string }[]).length > 0 ? (
                                                    <ul className="list-disc pl-4">
                                                        {(enr.payments as { id: string; amount: number; payment_number: number; payment_date?: string }[]).map((p) => (
                                                            <li key={p.id}>₱{Number(p.amount).toLocaleString()} (#{p.payment_number}) {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : ''}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-muted-foreground">No payments</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => openPaymentDialog(enr)}>Add Payment</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Payment</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                                <label>Amount</label>
                                <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                                <label>Payment Number</label>
                                <Select value={String(paymentNumber)} onValueChange={val => setPaymentNumber(Number(val))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select payment number" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                    </SelectContent>
                                </Select>
                                <label>Remarks</label>
                                <Input value={remarks} onChange={e => setRemarks(e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddPayment}>Save Payment</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
} 