"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { useOrganization } from "@/context/OrganizationContext";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SupabaseClient } from '@supabase/supabase-js';
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import ProjectHeader from "@/components/projects/project-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const steps = [
    "Select Courses",
    "Register",
    "Assessment/Payment",
    "Certificate"
];

// Define interfaces
interface CourseOffering {
    id: string;
    course_id: string;
    program_id?: string;
    academic_year?: string;
    semester?: number;
    course_offering_schedules?: { id: string; day: string; time: string; room: string }[];
    [key: string]: unknown;
}
interface Student {
    id: string;
    lastname: string;
    firstname: string;
    student_no?: string;
    assigned_program_id?: string;
}
interface Enrollment {
    id: string;
    organization_id: string;
    student_id: string;
    course_offering_id: string;
    status: string;
}
interface Course {
    id: string;
    course_code: string;
    course_desc: string;
    tuition_hours?: number;
}
interface Project {
    name: string;
    description?: string;
}

export default function EnrollmentProcessPage() {
    const supabase = useSupabase() as SupabaseClient;
    const { organization: org } = useOrganization();
    const params = useParams();
    const projectIdRaw = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
    const projectId = projectIdRaw || "";

    // Stepper state
    const [step, setStep] = useState(0);

    // Course offerings
    const [offerings, setOfferings] = useState<CourseOffering[]>([]);
    const [schedulesMap, setSchedulesMap] = useState<Record<string, { day: string; time: string; room: string }[]>>({});
    const [courses, setCourses] = useState<unknown[]>([]);

    // Selected courses
    const [selected, setSelected] = useState<string[]>([]);

    // Mock student selection (replace with real student search/select in production)
    const [studentId, setStudentId] = useState("");
    const [students, setStudents] = useState<unknown[]>([]);

    // Assessment/payment
    const [isPaid, setIsPaid] = useState(false);

    // Fetch project info for header
    const [project, setProject] = useState<Project | null>(null);
    useEffect(() => {
        if (!projectId) return;
        const fetchProject = async () => {
            const { data } = await supabase
                .from("projects")
                .select("name, description")
                .eq("id", projectId)
                .single();
            setProject(data || null);
        };
        fetchProject();
    }, [supabase, projectId]);

    useEffect(() => {
        if (!org || !projectId) {
            console.log("org or projectId missing", { org, projectId });
            return;
        }
        const fetchOfferings = async () => {
            const { data, error } = await supabase
                .from("course_offerings")
                .select("*, academic_year, semester, course_offering_schedules(id, day, time, room)")
                .eq("organization_id", org.id);
            if (error) console.error("Offerings fetch error:", error);
            setOfferings(data || []);
            // Build schedules map
            const map: Record<string, { day: string; time: string; room: string }[]> = {};
            (data || []).forEach((o: unknown) => {
                const obj = o as { id: string; course_offering_schedules?: { day: string; time: string; room: string }[] };
                map[obj.id] = obj.course_offering_schedules || [];
            });
            setSchedulesMap(map);
        };
        fetchOfferings();
        // Fetch courses for display
        const fetchCourses = async () => {
            const { data } = await supabase
                .from("organization_courses")
                .select("id, course_code, course_desc, tuition_hours")
                .eq("organization_id", org.id);
            setCourses(data || []);
        };
        fetchCourses();

        // Fetch students (mock: just get all for org)
        const fetchStudents = async () => {
            const { data } = await supabase
                .from("organization_students")
                .select("id, lastname, firstname, student_no, assigned_program_id")
                .eq("organization_id", org.id);
            setStudents(data || []);
        };
        fetchStudents();
    }, [supabase, org, projectId]);

    // Register selected courses for student
    const [registering, setRegistering] = useState(false);
    const [enrollmentIds, setEnrollmentIds] = useState<string[]>([]);

    const handleRegister = async () => {
        setRegistering(true);
        if (!org || !studentId || selected.length === 0) {
            setRegistering(false);
            return;
        }
        // Insert enrollments
        const inserts = selected.map(course_offering_id => ({
            organization_id: org.id,
            student_id: studentId,
            course_offering_id,
            status: "enrolled"
        }));
        const { data, error } = await supabase.from("enrollments").insert(inserts).select();
        if (error) {
            // Check for unique constraint violation (Postgres code 23505)
            if (
                error.code === "23505" ||
                (error.message && error.message.includes("enrollments_student_id_course_offering_id_key"))
            ) {
                setRegistering(false);
                return;
            }
            setRegistering(false);
            return;
        }
        setEnrollmentIds((data || []).map((e: Enrollment) => e.id));
        setSelected([]);
        setRegistering(false);
        setStep(1); // Go directly to assessment/payment
    };

    const handleStudentSelection = (val: string) => {
        setStudentId(val);
        if (!val) {
            setFilteredOfferings([]);
            setSelected([]);
            return;
        }

        const student = students.find(s => (s as Student).id === val) as Student | undefined;

        if (!student || !student.assigned_program_id) {
            setFilteredOfferings([]);
            setSelected([]);
            return;
        }

        const filtered = offerings.filter(o => String(o.program_id) === String(student.assigned_program_id));
        setFilteredOfferings(filtered);
        setSelected(filtered.map(o => o.id));
    };

    // Assessment/payment
    const handlePayment = () => {
        setIsPaid(true);
        setStep(3);
    };

    // Certificate data (mock)
    const student = students.find(s => (s as Student).id === studentId) as Student | undefined;

    // Add state for filtered offerings
    const [filteredOfferings, setFilteredOfferings] = useState<CourseOffering[]>([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(filteredOfferings.length / pageSize);
    const paginatedOfferings = filteredOfferings.slice((page - 1) * pageSize, page * pageSize);

    // Temporary per-unit tuition amount
    const perUnitAmount = 300;

    // Payment condition state
    const [paymentCondition, setPaymentCondition] = useState("full");

    // Add state for actual saved enrollments for the selected student
    const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);

    // Fetch enrollments for the selected student whenever studentId or refresh changes
    useEffect(() => {
        if (!org || !studentId) {
            setStudentEnrollments([]);
            return;
        }
        const fetchStudentEnrollments = async () => {
            const { data } = await supabase
                .from("enrollments")
                .select("*")
                .eq("organization_id", org.id)
                .eq("student_id", studentId);
            //                .eq("project_id", projectId);
            setStudentEnrollments(data || []);
        };
        fetchStudentEnrollments();
    }, [supabase, org, studentId, projectId, enrollmentIds]);

    // Helper: get registered courses for selected student (from enrollments)
    const registeredCourses = offerings.filter(off => studentEnrollments.some(e => e.course_offering_id === off.id));

    // Add this useEffect after your state declarations
    useEffect(() => {
        if (!studentId) return;
        if (studentEnrollments.length > 0) {
            setStep(1); // Show View Registered Courses
        } else {
            setStep(0); // Show Select Courses
        }
    }, [studentId, studentEnrollments.length]);

    return (
        <SidebarProvider>
            {org && <ProjectSidebar orgId={org.id} projectId={projectId} />}
            <SidebarInset>
                <ProjectHeader project={project} />
                <div className="w-full mx-auto p-4">
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>Select Student</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <label className="block mb-1 font-medium">Select Student</label>
                            <Select
                                value={studentId}
                                onValueChange={val => {
                                    handleStudentSelection(val)
                                }}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="-- Select Student --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.length === 0 ? (
                                        <div className="px-2 py-1 text-muted-foreground text-sm">No students found</div>
                                    ) : (
                                        students.map(s => {
                                            const student = s as Student;
                                            return (
                                                <SelectItem key={student.id} value={student.id}>
                                                    {student.student_no ? `${student.student_no} - ` : ''}{student.lastname}, {student.firstname}
                                                </SelectItem>
                                            );
                                        })
                                    )}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                    {studentId && (
                        <Card className="mb-4">
                            <CardHeader>
                                <CardTitle>Enrollment Process</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 mb-4">
                                    {/* Only show Select Courses tab if there are no enrollments for the selected student */}
                                    {studentId && studentEnrollments.length === 0 && (
                                        <Button key={steps[0]} variant={step === 0 ? "default" : "outline"} size="sm" onClick={() => setStep(0)}>{steps[0]}</Button>
                                    )}
                                    {/* New: View Registered Courses tab, only if a student is selected */}
                                    {studentId && studentEnrollments.length > 0 && (
                                        <Button key="View Registered Courses" variant={step === 1 ? "default" : "outline"} size="sm" onClick={() => setStep(1)}>View Registered Courses</Button>
                                    )}
                                    {studentId && studentEnrollments.length > 0 && (
                                        <Button key={steps[2]} variant={step === 2 ? "default" : "outline"} size="sm" onClick={() => setStep(2)}>{steps[2]}</Button>
                                    )}
                                    {studentId && studentEnrollments.length > 0 && (
                                        <Button key={steps[3]} variant={step === 3 ? "default" : "outline"} size="sm" onClick={() => setStep(3)}>{steps[3]}</Button>
                                    )}
                                </div>

                                {/* Only show course selection and registration if no enrollments exist for the selected student */}
                                {studentEnrollments.length === 0 && (
                                    <>
                                        <div>
                                            <div className="mb-4">Student: {student ? `${student.student_no ? student.student_no + ' - ' : ''}${student.lastname}, ${student.firstname}` : 'N/A'}</div>
                                            <h2 className="font-semibold mb-2">1. Select Courses to Enroll</h2>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Course</TableHead>
                                                            <TableHead>Academic Year</TableHead>
                                                            <TableHead>Semester</TableHead>
                                                            <TableHead>Schedules</TableHead>
                                                            <TableHead>Select</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paginatedOfferings.map(off => (
                                                            <TableRow key={off.id}>
                                                                <TableCell>{(() => { const c = courses.find(c => String((c as Course).id) === String(off.course_id)) as Course | undefined; return c ? `${c.course_code} - ${c.course_desc}` : off.course_id; })()}</TableCell>
                                                                <TableCell>{off.academic_year || 'N/A'}</TableCell>
                                                                <TableCell>
                                                                    {off.semester === 1
                                                                        ? "First Semester"
                                                                        : off.semester === 2
                                                                          ? "Second Semester"
                                                                          : off.semester === 3
                                                                            ? "Midyear"
                                                                            : "N/A"}
                                                                </TableCell>
                                                                <TableCell>{(schedulesMap[off.id] || []).map(s => `${s.day} ${s.time} (${s.room})`).join(", ")}</TableCell>
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={selected.includes(off.id)}
                                                                        onCheckedChange={checked => {
                                                                            setSelected(sel => checked ? [...sel, off.id] : sel.filter(id => id !== off.id));
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {/* Pagination controls */}
                                            {totalPages > 1 && (
                                                <div className="flex justify-end items-center gap-2 mt-2 w-full">
                                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                                        Previous
                                                    </Button>
                                                    <span className="text-sm">Page {page} of {totalPages}</span>
                                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                                        Next
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-5">
                                            <Button onClick={handleRegister} disabled={registering}>{registering ? "Registering..." : "Register"}</Button>
                                        </div>
                                    </>
                                )}

                                {studentId && studentEnrollments.length > 0 && step === 1 && (
                                    <div className="mt-5">
                                        <h2 className="font-semibold mb-2">View Registered Courses</h2>
                                        <ul className="mb-4 list-disc pl-6">
                                            {registeredCourses.map(off => (
                                                <li key={off.id}>
                                                    {(() => { const c = courses.find(c => String((c as Course).id) === String(off.course_id)) as Course | undefined; return c ? `${c.course_code} - ${c.course_desc}` : off.course_id; })()}
                                                    {` (AY: ${off.academic_year || 'N/A'}, Sem: ${off.semester === 1 ? 'First Semester' : off.semester === 2 ? 'Second Semester' : off.semester === 3 ? 'Midyear' : 'N/A'})`}
                                                    {` | `}
                                                    {(schedulesMap[off.id] || []).map(s => `${s.day} ${s.time} (${s.room})`).join(", ")}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* If enrollments exist, show saved courses and assessment/payment only when step === 2 */}
                                {studentEnrollments.length > 0 && step === 2 && (
                                    <div>
                                        {/* Assessment/Payment step */}
                                        <div>
                                            <h2 className="font-semibold mb-2">Assessment / Payment</h2>
                                            <div className="mb-4">Student: {student ? `${student.student_no ? student.student_no + ' - ' : ''}${student.lastname}, ${student.firstname}` : 'N/A'}</div>
                                            <ul className="mb-4 list-disc pl-6">
                                                {registeredCourses.map(off => (
                                                    <li key={off.id}>
                                                        {(() => { const c = courses.find(c => String((c as Course).id) === String(off.course_id)) as Course | undefined; return c ? `${c.course_code} - ${c.course_desc}` : off.course_id; })()}
                                                        {` (AY: ${off.academic_year || 'N/A'}, Sem: ${off.semester === 1 ? 'First Semester' : off.semester === 2 ? 'Second Semester' : off.semester === 3 ? 'Midyear' : 'N/A'})`}
                                                        {` | `}
                                                        {(schedulesMap[off.id] || []).map(s => `${s.day} ${s.time} (${s.room})`).join(", ")}
                                                    </li>
                                                ))}
                                            </ul>
                                            {/* Tuition computation */}
                                            <div className="mb-2 font-medium">
                                                Total Tuition Hours: {
                                                    registeredCourses.reduce((sum, off) => {
                                                        const c = courses.find(c => String((c as Course).id) === String(off.course_id)) as Course | undefined;
                                                        return sum + (c && c.tuition_hours ? Number(c.tuition_hours) : 0);
                                                    }, 0)
                                                }
                                            </div>
                                            {/* Payment condition setup */}
                                            <div className="mb-2">
                                                <label className="block font-medium mb-1">Payment Condition</label>
                                                <Select value={paymentCondition} onValueChange={setPaymentCondition}>
                                                    <SelectTrigger className="w-full max-w-xs">
                                                        <SelectValue placeholder="Select payment condition" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="full">Full Payment</SelectItem>
                                                        <SelectItem value="2x">2 Time Payment</SelectItem>
                                                        <SelectItem value="3x">3 Time Payment</SelectItem>
                                                        <SelectItem value="free">FREE EDUCATION (PH Law)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {/* Tuition Fee breakdown */}
                                            <div className="mb-4 font-medium">
                                                {(() => {
                                                    const totalHours = registeredCourses.reduce((sum, off) => {
                                                        const c = courses.find(c => String((c as Course).id) === String(off.course_id)) as Course | undefined;
                                                        return sum + (c && c.tuition_hours ? Number(c.tuition_hours) : 0);
                                                    }, 0);
                                                    const tuitionFee = paymentCondition === "free" ? 0 : totalHours * perUnitAmount;
                                                    if (paymentCondition === "full") {
                                                        return `Tuition Fee: ₱${tuitionFee.toLocaleString()} (Full Payment)`;
                                                    } else if (paymentCondition === "2x") {
                                                        return `Tuition Fee: ₱${tuitionFee.toLocaleString()} (2 Payments of ₱${Math.ceil(tuitionFee / 2).toLocaleString()})`;
                                                    } else if (paymentCondition === "3x") {
                                                        return `Tuition Fee: ₱${tuitionFee.toLocaleString()} (3 Payments of ₱${Math.ceil(tuitionFee / 3).toLocaleString()})`;
                                                    } else if (paymentCondition === "free") {
                                                        return `Tuition Fee: ₱0 (FREE EDUCATION)`;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <Button onClick={handlePayment} disabled={isPaid}>Mark as Paid</Button>
                                        </div>
                                    </div>
                                )}
                                {step === 3 && (
                                    <div>
                                        <h2 className="font-semibold mb-2">4. Certificate of Registration</h2>
                                        <div className="mb-4">Student: {student ? `${student.student_no ? student.student_no + ' - ' : ''}${student.lastname}, ${student.firstname}` : 'N/A'}</div>
                                        <ul className="mb-4 list-disc pl-6">
                                            {offerings.filter(o => selected.includes(o.id)).map(off => (
                                                <li key={off.id}>{(() => { const c = courses.find(c => String((c as Course).id) === String(off.course_id)) as Course | undefined; return c ? `${c.course_code} - ${c.course_desc}` : off.course_id; })()} ({(schedulesMap[off.id] || []).map(s => `${s.day} ${s.time} (${s.room})`).join(", ")})</li>
                                            ))}
                                        </ul>
                                        <div className="mb-4">[Certificate of Registration UI goes here]</div>
                                        <Button onClick={() => setStep(0)}>New Enrollment</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
