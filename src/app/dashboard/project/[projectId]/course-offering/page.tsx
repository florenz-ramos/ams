"use client";
import { useState, useEffect } from "react";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import ProjectHeader from "@/components/projects/project-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useParams } from "next/navigation";
import { useOrganization } from "@/context/OrganizationContext";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Minimal interfaces
interface CourseOffering {
  id: string;
  organization_id: string;
  project_id: string;
  program_id: string;
  academic_year: string;
  semester: number;
  year_level: number;
  section: string;
  course_id: string;
  slot: number;
  created_at?: string;
  [key: string]: unknown;
}
interface Schedule {
  id?: string;
  day: string;
  time: string;
  room: string;
}

export default function CourseOfferingPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: org } = useOrganization();
  const params = useParams();
  const projectIdRaw = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const projectId = projectIdRaw || "";

  const [open, setOpen] = useState(false);
  const [program, setProgram] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [section, setSection] = useState("");
  const [course, setCourse] = useState("");
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dropdown options
  const [programs, setPrograms] = useState<{ id: string; program_code: string; program_desc: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; course_code: string; course_desc: string }[]>([]);
  const sectionOptions = ["A", "B", "C", "D"];

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);

  // Columns for table
  const allColumns = [
    { key: "program", label: "Program" },
    { key: "academic_year", label: "Academic Year" },
    { key: "semester", label: "Semester" },
    { key: "year_level", label: "Year Level" },
    { key: "section", label: "Section" },
    { key: "course", label: "Course" },
    { key: "slot", label: "Slot" },
    { key: "day", label: "Day" },
    { key: "actions", label: "Actions" },
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns.map(c => c.key));

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(offerings.length / pageSize);
  const paginatedOfferings = offerings.slice((page - 1) * pageSize, page * pageSize);

  const [editOffering, setEditOffering] = useState<CourseOffering | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Remove day, time, room from main form, add schedules state
  const [schedules, setSchedules] = useState([{ day: '', time: '', room: '' }]);

  const dayOptions = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  useEffect(() => {
    if (!org) return;
    // Fetch programs
    const fetchPrograms = async () => {
      const { data, error } = await supabase
        .from("academic_programs")
        .select("id, program_code, program_desc")
        .eq("organization_id", org.id);
      if (error) {
        console.error("Error fetching programs:", error);
      }
      setPrograms(data || []);
    };
    fetchPrograms();
    // Fetch courses
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("organization_courses")
        .select("id, course_code, course_desc")
        .eq("organization_id", org.id);
      if (error) {
        console.error("Error fetching courses:", error);
      }
      setCourses(data || []);
    };
    fetchCourses();
  }, [supabase, org]);

  // Fetch offerings
  useEffect(() => {
    if (!org || !projectId) return;
    const fetchOfferings = async () => {
      const { data } = await supabase
        .from("course_offerings")
        .select("*")
        .eq("organization_id", org.id)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setOfferings(data || []);
    };
    fetchOfferings();
  }, [supabase, org, projectId, open]); // re-fetch when modal closes

  const handleAddScheduleRow = () => {
    setSchedules(s => [...s, { day: '', time: '', room: '' }]);
  };
  const handleRemoveScheduleRow = (idx: number) => {
    setSchedules(s => s.length > 1 ? s.filter((_, i) => i !== idx) : s);
  };
  const handleScheduleChange = (idx: number, field: string, value: string) => {
    setSchedules(s => s.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    if (!org || !projectId || !program || !academicYear || !semester || !yearLevel || !section || !course || !slot || schedules.some(s => !s.day || !s.time || !s.room)) {
      setFormError("Please fill in all fields, including all schedules.");
      setLoading(false);
      return;
    }
    // Insert course offering
    const { data, error } = await supabase.from("course_offerings").insert([
      {
        organization_id: org.id,
        project_id: projectId,
        program_id: program,
        academic_year: academicYear,
        semester: parseInt(semester),
        year_level: parseInt(yearLevel),
        section,
        course_id: course,
        slot: parseInt(slot),
      }
    ]).select();
    if (error || !data || !data[0]) {
      setFormError(error?.message || "Failed to save course offering.");
      setLoading(false);
      return;
    }
    const offeringId = data[0].id;
    // Insert schedules
    for (const sched of schedules) {
      await supabase.from("course_offering_schedules").insert({
        course_offering_id: offeringId,
        day: sched.day,
        time: sched.time,
        room: sched.room,
      });
    }
    // Reset form and close modal
    setProgram("");
    setAcademicYear("");
    setSemester("");
    setYearLevel("");
    setSection("");
    setCourse("");
    setSlot("");
    setSchedules([{ day: '', time: '', room: '' }]);
    setOpen(false);
    setLoading(false);
  };

  // Delete action (placeholder)
  const handleDelete = async (id: string) => {
    await supabase.from("course_offerings").delete().eq("id", id);
    setOfferings(offerings => offerings.filter(o => o.id !== id));
  };

  // For editing, fetch schedules for the selected offering
  const [editSchedules, setEditSchedules] = useState<Schedule[]>([]);
  useEffect(() => {
    if (!editOffering) return;
    const fetchEditSchedules = async () => {
      const { data } = await supabase.from("course_offering_schedules").select("id, day, time, room").eq("course_offering_id", editOffering.id);
      setEditSchedules(data && data.length ? data : [{ day: '', time: '', room: '' }]);
    };
    fetchEditSchedules();
  }, [editOffering, supabase]);
  const handleEditAddScheduleRow = () => {
    setEditSchedules(s => [...s, { day: '', time: '', room: '' }]);
  };
  const handleEditRemoveScheduleRow = (idx: number) => {
    setEditSchedules(s => s.length > 1 ? s.filter((_, i) => i !== idx) : s);
  };
  const handleEditScheduleChange = (idx: number, field: string, value: string) => {
    setEditSchedules(s => s.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };
  // In handleEditSubmit, update schedules
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);
    if (!editOffering || !org || !projectId || !editOffering.program_id || !editOffering.academic_year || !editOffering.semester || !editOffering.year_level || !editOffering.section || !editOffering.course_id || !editOffering.slot || editSchedules.some(s => !s.day || !s.time || !s.room)) {
      setEditError("Please fill in all fields, including all schedules.");
      setEditLoading(false);
      return;
    }
    const { error } = await supabase.from("course_offerings").update({
      program_id: editOffering.program_id,
      academic_year: editOffering.academic_year,
      semester: Number(editOffering.semester),
      year_level: Number(editOffering.year_level),
      section: editOffering.section,
      course_id: editOffering.course_id,
      slot: Number(editOffering.slot),
    }).eq("id", String(editOffering.id));
    if (error) {
      setEditError(error.message || "Failed to update course offering.");
      setEditLoading(false);
      return;
    }
    // Delete removed schedules and upsert current ones
    const { data: existing } = await supabase.from("course_offering_schedules").select("id").eq("course_offering_id", editOffering.id);
    const existingIds = (existing || []).map((s) => (s as { id: string }).id);
    const currentIds = editSchedules.map(s => s.id).filter(Boolean);
    // Delete schedules that were removed
    for (const id of existingIds) {
      if (!currentIds.includes(id)) {
        await supabase.from("course_offering_schedules").delete().eq("id", id);
      }
    }
    // Upsert (insert or update) schedules
    for (const sched of editSchedules) {
      if (sched.id) {
        await supabase.from("course_offering_schedules").update({ day: sched.day, time: sched.time, room: sched.room }).eq("id", sched.id);
      } else {
        await supabase.from("course_offering_schedules").insert({ course_offering_id: editOffering.id, day: sched.day, time: sched.time, room: sched.room });
      }
    }
    setOfferings(offerings => offerings.map(o => o.id === editOffering.id ? { ...o, ...editOffering } : o));
    setEditOffering(null);
    setEditLoading(false);
  };

  // In the table, fetch and display schedules for each offering
  const [schedulesMap, setSchedulesMap] = useState<Record<string, { day: string; time: string; room: string }[]>>({});
  useEffect(() => {
    if (!offerings.length) return;
    const fetchAllSchedules = async () => {
      const ids = offerings.map(o => o.id);
      const { data } = await supabase.from("course_offering_schedules").select("course_offering_id, day, time, room").in("course_offering_id", ids);
      const map: Record<string, { day: string; time: string; room: string }[]> = {};
      (data || []).forEach((s) => {
        const sched = s as { course_offering_id: string; day: string; time: string; room: string };
        if (!map[sched.course_offering_id]) map[sched.course_offering_id] = [];
        map[sched.course_offering_id].push({ day: sched.day, time: sched.time, room: sched.room });
      });
      setSchedulesMap(map);
    };
    fetchAllSchedules();
  }, [offerings, supabase]);

  return (
    <SidebarProvider>
      {org && <ProjectSidebar orgId={org.id} projectId={projectId} />}
      <SidebarInset>
        <ProjectHeader project={{ name: "Course Offering" }} />

        <main className="flex flex-col items-center gap-8 p-8 sm:p-8 px-2 py-4">
          <div className="w-full mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-2 mb-6">
              <h1 className="text-2xl sm:text-2xl font-bold leading-tight">Course Offering</h1>
              <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>Add Course Offering</Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Course Offering</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {formError && <div className="text-destructive mb-2">{formError}</div>}
                  <Select value={program} onValueChange={setProgram} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.length === 0 && <SelectItem value="" disabled>No programs found</SelectItem>}
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.program_code} - {p.program_desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2024-2025"
                    required
                  />
                  <Select value={semester} onValueChange={setSemester} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Semester</SelectItem>
                      <SelectItem value="2">2nd Semester</SelectItem>
                      <SelectItem value="3">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={yearLevel} onValueChange={setYearLevel} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Year Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="5">5th Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={section} onValueChange={setSection} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={course} onValueChange={setCourse} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.length === 0 && <SelectItem value="" disabled>No courses found</SelectItem>}
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.course_code} - {c.course_desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Slot"
                    value={slot}
                    onChange={e => setSlot(e.target.value)}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Schedules</span>
                      <Button type="button" size="sm" onClick={handleAddScheduleRow}>Add Schedule</Button>
                    </div>
                    {schedules.map((sched, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <Select value={sched.day} onValueChange={val => handleScheduleChange(idx, 'day', val)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {dayOptions.map(day => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Time (e.g. 08:00-10:00)"
                          value={sched.time}
                          onChange={e => handleScheduleChange(idx, 'time', e.target.value)}
                        />
                        <Input
                          placeholder="Room (e.g. 101)"
                          value={sched.room}
                          onChange={e => handleScheduleChange(idx, 'room', e.target.value)}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveScheduleRow(idx)} disabled={schedules.length === 1}>-</Button>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Schedule"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <div className="mt-8">
              <Card>
                <CardHeader className="pb-2">
                  {/* <CardTitle className="text-lg sm:text-xl font-semibold">Saved Course Offerings</CardTitle> */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Columns</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                        {allColumns.filter(c => c.key !== "actions").map(col => (
                          <DropdownMenuCheckboxItem
                            key={col.key}
                            checked={visibleColumns.includes(col.key)}
                            onCheckedChange={() => {
                              setVisibleColumns(cols =>
                                cols.includes(col.key)
                                  ? cols.filter(k => k !== col.key)
                                  : [...cols, col.key]
                              );
                            }}
                          >
                            {col.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {allColumns.map(col =>
                            visibleColumns.includes(col.key) ? (
                              <TableHead key={col.key} className="text-xs sm:text-sm px-1 sm:px-2 py-1 sm:py-2">{col.label}</TableHead>
                            ) : null
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOfferings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground text-xs sm:text-sm">
                              No course offerings found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedOfferings.map(off => (
                            <TableRow key={off.id} className="text-xs sm:text-sm">
                              {visibleColumns.includes("program") && (
                                <TableCell>{programs.find(p => String(p.id) === String(off.program_id))?.program_code || off.program_id}</TableCell>
                              )}
                              {visibleColumns.includes("academic_year") && (
                                <TableCell>{off.academic_year}</TableCell>
                              )}
                              {visibleColumns.includes("semester") && (
                                <TableCell>{off.semester}</TableCell>
                              )}
                              {visibleColumns.includes("year_level") && (
                                <TableCell>{off.year_level}</TableCell>
                              )}
                              {visibleColumns.includes("section") && (
                                <TableCell>{off.section}</TableCell>
                              )}
                              {visibleColumns.includes("course") && (
                                <TableCell>{(() => { const course = courses.find(c => String(c.id) === String(off.course_id)); return course ? `${course.course_code} - ${course.course_desc}` : off.course_id; })()}</TableCell>
                              )}
                              {visibleColumns.includes("slot") && (
                                <TableCell>{off.slot}</TableCell>
                              )}
                              {visibleColumns.includes("day") && (
                                <TableCell>{(schedulesMap[off.id] || []).map(s => `${s.day} ${s.time} (${s.room})`).join(", ")}</TableCell>
                              )}
                              {visibleColumns.includes("actions") && (
                                <TableCell>
                                  <Button variant="outline" size="sm" className="mr-2" onClick={() => setEditOffering(off)}>
                                    Edit
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleDelete(off.id)}>
                                    Delete
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mt-2 px-2 pb-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <span className="text-xs sm:text-sm">Page {page} of {totalPages || 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Edit Modal */}
            {editOffering && (
              <Dialog open={!!editOffering} onOpenChange={v => { if (!v) setEditOffering(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Course Offering</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleEditSubmit}>
                    {editError && <div className="text-destructive mb-2">{editError}</div>}
                    <Select value={String(editOffering.program_id)} onValueChange={val => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, program_id: val } : o))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.length === 0 && <SelectItem value="" disabled>No programs found</SelectItem>}
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.program_code} - {p.program_desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={editOffering.academic_year}
                      onChange={e => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, academic_year: e.target.value } : o))}
                      placeholder="e.g. 2024-2025"
                      required
                    />
                    <Select value={String(editOffering.semester)} onValueChange={val => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, semester: Number(val) } : o))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Semester</SelectItem>
                        <SelectItem value="2">2nd Semester</SelectItem>
                        <SelectItem value="3">Summer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={String(editOffering.year_level)} onValueChange={val => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, year_level: Number(val) } : o))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Year Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                        <SelectItem value="5">5th Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={editOffering.section} onValueChange={val => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, section: val } : o))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionOptions.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(editOffering.course_id)} onValueChange={val => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, course_id: val } : o))} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.length === 0 && <SelectItem value="" disabled>No courses found</SelectItem>}
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.course_code} - {c.course_desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Slot"
                      value={editOffering.slot}
                      onChange={e => setEditOffering((o) => (typeof o === 'object' && o !== null ? { ...o, slot: Number(e.target.value) } : o))}
                    />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Schedules</span>
                        <Button type="button" size="sm" onClick={handleEditAddScheduleRow}>Add Schedule</Button>
                      </div>
                      {editSchedules.map((sched, idx) => (
                        <div key={sched.id || idx} className="flex gap-2 mb-2">
                          <Select value={sched.day} onValueChange={val => handleEditScheduleChange(idx, 'day', val)} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {dayOptions.map(day => (
                                <SelectItem key={day} value={day}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Time (e.g. 08:00-10:00)"
                            value={sched.time}
                            onChange={e => handleEditScheduleChange(idx, 'time', e.target.value)}
                          />
                          <Input
                            placeholder="Room (e.g. 101)"
                            value={sched.room}
                            onChange={e => handleEditScheduleChange(idx, 'room', e.target.value)}
                          />
                          <Button type="button" variant="destructive" size="icon" onClick={() => handleEditRemoveScheduleRow(idx)} disabled={editSchedules.length === 1}>-</Button>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={editLoading}>{editLoading ? "Saving..." : "Save Changes"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </main>
      </SidebarInset>
      
    </SidebarProvider>
  );
} 