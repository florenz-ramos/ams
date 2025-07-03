"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/context/OrganizationContext";
import { SupabaseClient } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AppSidebar } from "@/components/org/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/org/site-header";

// Define interface for course
interface Course {
    id: number;
    course_code: string;
    course_desc: string;
    lecture_hours: number;
    laboratory_hours: number;
    tuition_hours: number;
    units: number;
    credited_units: number;
    is_include_in_gwagpa: number;
    department_id: number | null;
    is_non_academic: number;
}

export default function CoursesPage() {
    const supabase = useSupabase() as SupabaseClient;
    const { organization: org } = useOrganization();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [form, setForm] = useState({
        course_code: "",
        course_desc: "",
        lecture_hours: "",
        laboratory_hours: "",
        tuition_hours: "",
        units: "",
        credited_units: "",
        is_include_in_gwagpa: "0",
        department_id: "",
        is_non_academic: "0",
    });
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        const fetchCourses = async () => {
            if (!org) return;
            setLoading(true);
            setError("");
            const { data, error } = await supabase
                .from("organization_courses")
                .select("*")
                .eq("organization_id", org.id)
                .order("id", { ascending: true });
            if (error) setError(error.message);
            setCourses(data || []);
            setLoading(false);
        };
        fetchCourses();
    }, [supabase, org]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!org) return;
        setLoading(true);
        setError("");
        setSuccess("");
        const { error } = await supabase.from("organization_courses").insert([
            {
                organization_id: org.id,
                course_code: form.course_code,
                course_desc: form.course_desc,
                lecture_hours: parseFloat(form.lecture_hours) || 0,
                laboratory_hours: parseFloat(form.laboratory_hours) || 0,
                tuition_hours: parseFloat(form.tuition_hours) || 0,
                units: parseFloat(form.units) || 0,
                credited_units: parseFloat(form.credited_units) || 0,
                is_include_in_gwagpa: parseInt(form.is_include_in_gwagpa) || 0,
                department_id: form.department_id ? parseInt(form.department_id) : null,
                is_non_academic: parseInt(form.is_non_academic) || 0,
            },
        ]);
        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setSuccess("Course added!");
            setForm({
                course_code: "",
                course_desc: "",
                lecture_hours: "",
                laboratory_hours: "",
                tuition_hours: "",
                units: "",
                credited_units: "",
                is_include_in_gwagpa: "0",
                department_id: "",
                is_non_academic: "0",
            });
            // Refresh courses
            const { data } = await supabase
                .from("organization_courses")
                .select("*")
                .eq("organization_id", org.id)
                .order("id", { ascending: true });
            setCourses(data || []);
        }
    };

    return (
        <SidebarProvider>
            {org && <AppSidebar orgId={org.id} />}
            <SidebarInset>
                <SiteHeader />
                <main className="flex flex-col items-center gap-8 p-8">
                    <div className="w-full">
                        <Card>
                            <CardHeader>
                                <CardTitle>Courses</CardTitle>
                                <CardDescription>Manage your organizations courses.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {error && <div className="text-destructive mb-2">{error}</div>}
                                {success && <div className="text-green-600 mb-2">{success}</div>}
                                <Button className="mb-4" onClick={() => setShowAdd(true)}>
                                    Add Course
                                </Button>
                                <Dialog open={showAdd} onOpenChange={setShowAdd}>
                                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Add Course</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={async (e) => {
                                            await handleAddCourse(e);
                                            if (!error) setShowAdd(false);
                                        }} className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="course_code">Course Code</Label>
                                                <Input id="course_code" name="course_code" placeholder="Course Code" value={form.course_code} onChange={handleInputChange} required />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="course_desc">Course Description</Label>
                                                <Input id="course_desc" name="course_desc" placeholder="Course Description" value={form.course_desc} onChange={handleInputChange} required />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="lecture_hours">Lecture Hours</Label>
                                                <Input id="lecture_hours" name="lecture_hours" placeholder="Lecture Hours" value={form.lecture_hours} onChange={handleInputChange} type="number" step="0.01" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="laboratory_hours">Lab Hours</Label>
                                                <Input id="laboratory_hours" name="laboratory_hours" placeholder="Lab Hours" value={form.laboratory_hours} onChange={handleInputChange} type="number" step="0.01" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="tuition_hours">Tuition Hours</Label>
                                                <Input id="tuition_hours" name="tuition_hours" placeholder="Tuition Hours" value={form.tuition_hours} onChange={handleInputChange} type="number" step="0.01" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="units">Units</Label>
                                                <Input id="units" name="units" placeholder="Units" value={form.units} onChange={handleInputChange} type="number" step="0.01" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="credited_units">Credited Units</Label>
                                                <Input id="credited_units" name="credited_units" placeholder="Credited Units" value={form.credited_units} onChange={handleInputChange} type="number" step="0.01" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="is_include_in_gwagpa">Include in GWAGPA (0/1)</Label>
                                                <Input id="is_include_in_gwagpa" name="is_include_in_gwagpa" placeholder="Include in GWAGPA (0/1)" value={form.is_include_in_gwagpa} onChange={handleInputChange} type="number" min="0" max="1" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="department_id">Department ID</Label>
                                                <Input id="department_id" name="department_id" placeholder="Department ID" value={form.department_id} onChange={handleInputChange} type="number" />
                                            </div>
                                            <div className="flex flex-col gap-y-2">
                                                <Label htmlFor="is_non_academic">Non-Academic (0/1)</Label>
                                                <Input id="is_non_academic" name="is_non_academic" placeholder="Non-Academic (0/1)" value={form.is_non_academic} onChange={handleInputChange} type="number" min="0" max="1" />
                                            </div>
                                            {error && <div className="text-destructive text-sm w-full">{error}</div>}
                                            {success && <div className="text-green-600 text-sm w-full">{success}</div>}
                                            <DialogFooter className="w-full">
                                                <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Course"}</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Lecture</TableHead>
                                            <TableHead>Lab</TableHead>
                                            <TableHead>Tuition</TableHead>
                                            <TableHead>Units</TableHead>
                                            <TableHead>Credited</TableHead>
                                            <TableHead>GWAGPA</TableHead>
                                            <TableHead>Dept</TableHead>
                                            <TableHead>Non-Acad</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {courses.map(course => (
                                            <TableRow key={course.id}>
                                                <TableCell>{course.course_code}</TableCell>
                                                <TableCell>{course.course_desc}</TableCell>
                                                <TableCell>{course.lecture_hours}</TableCell>
                                                <TableCell>{course.laboratory_hours}</TableCell>
                                                <TableCell>{course.tuition_hours}</TableCell>
                                                <TableCell>{course.units}</TableCell>
                                                <TableCell>{course.credited_units}</TableCell>
                                                <TableCell>{course.is_include_in_gwagpa ? "Yes" : "No"}</TableCell>
                                                <TableCell>{course.department_id}</TableCell>
                                                <TableCell>{course.is_non_academic ? "Yes" : "No"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
} 