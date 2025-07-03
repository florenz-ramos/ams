"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "next/navigation";
import { SupabaseClient } from '@supabase/supabase-js';
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import ProjectHeader from "@/components/projects/project-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useOrganization } from "@/context/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const yearLabels: Record<number, string> = {
  1: 'First Year',
  2: 'Second Year',
  3: 'Third Year',
  4: 'Fourth Year',
  5: 'Fifth Year',
};
const semesterLabels: Record<number, string> = {
  1: 'First Semester',
  2: 'Second Semester',
  3: 'Summer',
};

// Define interfaces for Curriculum, Program, Year, Semester, and Course
interface Curriculum {
  id: string;
  program_name: string;
  school_year: string;
  curriculum_type: string;
}
interface Program {
  id: string;
  program_code: string;
  program_desc: string;
}
interface Year {
  id: string;
  year_level: number;
  curriculum_id?: string;
}
interface Semester {
  id: string;
  semester: number;
}
interface Course {
  id: string;
  course_code: string;
  course_name: string;
  units: number;
  year?: Year;
  sem?: Semester;
}

export default function CurriculumPage() {
  const supabase = useSupabase() as SupabaseClient;
  const params = useParams();
  const projectIdRaw = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const projectId = projectIdRaw || "";
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [editCurriculum, setEditCurriculum] = useState<Curriculum | null>(null);
  const [loading] = useState(false);
  const { organization: org } = useOrganization();
  const [project, setProject] = useState<unknown>(null);
  const [viewTreeCurriculum, setViewTreeCurriculum] = useState<Curriculum | null>(null);

  useEffect(() => {
    const fetchCurriculums = async () => {
      const { data } = await supabase
        .from('organization_curriculums')
        .select('*')
        .eq('project_id', projectId);
      setCurriculums(data || []);
    };
    if (projectId) fetchCurriculums();
  }, [supabase, projectId]);

  useEffect(() => {
    const fetchProject = async () => {
      if (projectId) {
        const { data } = await supabase
          .from('projects')
          .select('name, description')
          .eq('id', projectId)
          .single();
        setProject(data || null);
      }
    };
    fetchProject();
  }, [supabase, projectId]);

  return (
    <SidebarProvider>
      {org && <ProjectSidebar orgId={org.id} projectId={projectId} />}
      <SidebarInset>
        <ProjectHeader project={project as { name?: string; description?: string | null } | null} />
        <main className="flex flex-col items-center gap-8 p-8">
          <div className="w-full">
            <Card>
              <CardContent>
                {loading && <div>Loading...</div>}
                {!curriculums.length && (
                  <div className="mt-8 flex justify-center">
                    <AddCurriculumModal onCreated={() => window.location.reload()} />
                  </div>
                )}
                {curriculums.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Curriculums</h3>
                      <AddCurriculumModal onCreated={() => window.location.reload()} />
                    </div>
                    <CurriculumsTable curriculums={curriculums} onEdit={setEditCurriculum} onViewTree={setViewTreeCurriculum} />
                  </div>
                )}
                {editCurriculum && (
                  <EditCurriculumModal
                    curriculum={editCurriculum}
                    onClose={() => setEditCurriculum(null)}
                    onSaved={() => { setEditCurriculum(null); window.location.reload(); }}
                  />
                )}
                {viewTreeCurriculum && (
                  <CurriculumTreeModal curriculum={viewTreeCurriculum} onClose={() => setViewTreeCurriculum(null)} />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AddCurriculumModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const supabase = useSupabase() as SupabaseClient;
  const { organization: org } = useOrganization();
  const params = useParams();
  const projectIdRaw = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const projectId = projectIdRaw || "";
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org) return;
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('academic_programs')
        .select('*')
        .eq('organization_id', org.id);
      setPrograms(data || []);
    };
    fetchPrograms();
  }, [supabase, org]);

  const handleCreateCurriculum = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    if (!org || !projectId || !selectedProgram || !academicYear) {
      setLoading(false);
      return;
    }
    const program = programs.find(p => String(p.id) === String(selectedProgram));
    if (!program) {
      setLoading(false);
      return;
    }
    // Create curriculum only
    const { data: newCurriculum, error: createError } = await supabase
      .from('organization_curriculums')
      .insert([{
        organization_id: org.id,
        project_id: projectId,
        program_name: program.program_desc,
        school_year: academicYear,
        curriculum_type: curriculumType
      }])
      .select()
      .single();
    if (createError || !newCurriculum) {
      setLoading(false);
      return;
    }
    setOpen(false);
    setSelectedProgram("");
    setAcademicYear("");
    setCurriculumType("");
    setLoading(false);
    onCreated();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create Curriculum</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateCurriculum} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create Curriculum</DialogTitle>
            </DialogHeader>
            <div>
              <label className="block mb-1">Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.program_code} - {program.program_desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1">Academic Year</label>
              <Input
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024-2025"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Curriculum Type</label>
              <Select value={curriculumType} onValueChange={setCurriculumType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select curriculum type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Bridging">Bridging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddCourseModal({ curriculumId }: { curriculumId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Course to Curriculum</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <AddCourseForm curriculumId={curriculumId} closeModal={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddCourseForm({ curriculumId, closeModal }: { curriculumId: string, closeModal: () => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: org } = useOrganization();
  const [yearLevel, setYearLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [formError, setFormError] = useState("");

  // Fetch courses from organization_courses for the current org
  useEffect(() => {
    if (!org) return;
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('organization_courses')
        .select('*')
        .eq('organization_id', org.id);
      setCourses(data || []);
    };
    fetchCourses();
  }, [supabase, org]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!yearLevel || !semester || !selectedCourse) {
      setFormError("Please select year level, semester, and course.");
      return;
    }
    // 1. Ensure year exists
    let { data: year } = await supabase
      .from('curriculum_years')
      .select('*')
      .eq('curriculum_id', curriculumId)
      .eq('year_level', yearLevel)
      .single();
    if (!year) {
      const { data: newYear } = await supabase
        .from('curriculum_years')
        .insert([{ curriculum_id: curriculumId, year_level: parseInt(yearLevel), label: yearLabels[parseInt(yearLevel)] || `${yearLevel} Year` }])
        .select()
        .single();
      year = newYear;
    }
    // 2. Ensure semester exists
    let { data: sem } = await supabase
      .from('curriculum_semesters')
      .select('*')
      .eq('year_id', year.id)
      .eq('semester', semester)
      .single();
    if (!sem) {
      const { data: newSem } = await supabase
        .from('curriculum_semesters')
        .insert([{ year_id: year.id, semester: parseInt(semester), label: semesterLabels[parseInt(semester)] || `${semester} Semester` }])
        .select()
        .single();
      sem = newSem;
    }
    // 3. Add course to semester
    const course = courses.find(c => String(c.id) === String(selectedCourse));
    if (!course) {
      setFormError("Selected course not found.");
      return;
    }
    await supabase
      .from('curriculum_courses')
      .insert([{ semester_id: sem.id, course_code: course.course_code, course_name: course.course_name, units: course.units }]);
    setYearLevel("");
    setSemester("");
    setSelectedCourse("");
    closeModal();
    window.location.reload();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-xl">
      {formError && <div className="text-destructive mb-2">{formError}</div>}
      <div>
        <label className="block mb-1">Year Level</label>
        <Select value={yearLevel} onValueChange={setYearLevel} required>
          <SelectTrigger>
            <SelectValue placeholder="Select year level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">First Year</SelectItem>
            <SelectItem value="2">Second Year</SelectItem>
            <SelectItem value="3">Third Year</SelectItem>
            <SelectItem value="4">Fourth Year</SelectItem>
            <SelectItem value="5">Fifth Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block mb-1">Semester</label>
        <Select value={semester} onValueChange={setSemester} required>
          <SelectTrigger>
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">First Semester</SelectItem>
            <SelectItem value="2">Second Semester</SelectItem>
            <SelectItem value="3">Summer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block mb-1">Course</label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
          <SelectTrigger>
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={String(course.id)}>
                {course.course_code} - {course.course_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit">Save</Button>
    </form>
  );
}

function CurriculumTable({ years, semesters, courses, refresh }: { years: Year[], semesters: { [yearId: string]: Semester[] }, courses: { [semesterId: string]: Course[] }, refresh: () => void }) {
  const [editModal, setEditModal] = useState<{ open: boolean, course: Course | null }>({ open: false, course: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, course: Course | null }>({ open: false, course: null });

  return (
    <div className="mt-6">
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="border px-2 py-1">Year</th>
              <th className="border px-2 py-1">Semester</th>
              <th className="border px-2 py-1">Course Code</th>
              <th className="border px-2 py-1">Course Name</th>
              <th className="border px-2 py-1">Units</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map(year => (
              (semesters[year.id] || []).length > 0
                ? semesters[year.id].map((sem: Semester) => {
                    const semCourses = courses[sem.id] || [];
                    return semCourses.length > 0
                      ? semCourses.map((course: Course) => (
                          <tr key={course.id}>
                            <td className="border px-2 py-1">{yearLabels[year.year_level] || `${year.year_level} Year`}</td>
                            <td className="border px-2 py-1">{semesterLabels[sem.semester] || `${sem.semester} Semester`}</td>
                            <td className="border px-2 py-1">{course.course_code}</td>
                            <td className="border px-2 py-1">{course.course_name}</td>
                            <td className="border px-2 py-1">{course.units}</td>
                            <td className="border px-2 py-1 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditModal({ open: true, course: { ...course, year, sem } })}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => setDeleteModal({ open: true, course: { ...course, year, sem } })}>Delete</Button>
                            </td>
                          </tr>
                        ))
                      : (
                          <tr key={sem.id + '-empty'}>
                            <td className="border px-2 py-1">{yearLabels[year.year_level] || `${year.year_level} Year`}</td>
                            <td className="border px-2 py-1">{semesterLabels[sem.semester] || `${sem.semester} Semester`}</td>
                            <td className="border px-2 py-1 text-center text-muted-foreground" colSpan={4}>No courses</td>
                          </tr>
                        );
                  })
                : (
                    <tr key={year.id + '-no-sem'}>
                      <td className="border px-2 py-1">{yearLabels[year.year_level] || `${year.year_level} Year`}</td>
                      <td className="border px-2 py-1 text-center text-muted-foreground" colSpan={5}>No semesters</td>
                    </tr>
                  )
            ))}
          </tbody>
        </table>
      </div>
      {editModal.open && (
        <EditCourseModal
          course={editModal.course}
          closeModal={() => setEditModal({ open: false, course: null })}
          refresh={refresh}
        />
      )}
      {deleteModal.open && (
        <DeleteCourseModal
          course={deleteModal.course}
          closeModal={() => setDeleteModal({ open: false, course: null })}
          refresh={refresh}
        />
      )}
    </div>
  );
}

function EditCourseModal({ course, closeModal, refresh }: { course: Course | null, closeModal: () => void, refresh: () => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: org } = useOrganization();
  const [yearLevel, setYearLevel] = useState(String(course?.year?.year_level));
  const [semester, setSemester] = useState(String(course?.sem?.semester));
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseCode, setCourseCode] = useState(course?.course_code || "");
  const [courseName, setCourseName] = useState(course?.course_name || "");
  const [units, setUnits] = useState(course?.units || 0);

  // Fetch courses from organization_courses for the current org
  useEffect(() => {
    if (!org) return;
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('organization_courses')
        .select('*')
        .eq('organization_id', org.id);
      setCourses(data || []);
    };
    fetchCourses();
  }, [supabase, org]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // If a new course is selected, update courseCode, courseName, units
    if (selectedCourse) {
      const selected = courses.find(c => String(c.id) === String(selectedCourse));
      if (selected) {
        setCourseCode(selected.course_code);
        setCourseName(selected.course_name);
        setUnits(selected.units);
      }
    }
    // Update course details
    await supabase
      .from('curriculum_courses')
      .update({ course_code: courseCode, course_name: courseName, units: units })
      .eq('id', course?.id);
    // If year or semester changed, move course
    if (yearLevel !== String(course?.year?.year_level) || semester !== String(course?.sem?.semester)) {
      // Ensure year exists
      let { data: year } = await supabase
        .from('curriculum_years')
        .select('*')
        .eq('curriculum_id', course?.year?.curriculum_id)
        .eq('year_level', yearLevel)
        .single();
      if (!year) {
        const { data: newYear } = await supabase
          .from('curriculum_years')
          .insert([{ curriculum_id: course?.year?.curriculum_id, year_level: parseInt(yearLevel), label: yearLabels[parseInt(yearLevel)] || `${yearLevel} Year` }])
          .select()
          .single();
        year = newYear;
      }
      // Ensure semester exists
      let { data: sem } = await supabase
        .from('curriculum_semesters')
        .select('*')
        .eq('year_id', year.id)
        .eq('semester', semester)
        .single();
      if (!sem) {
        const { data: newSem } = await supabase
          .from('curriculum_semesters')
          .insert([{ year_id: year.id, semester: parseInt(semester), label: semesterLabels[parseInt(semester)] || `${semester} Semester` }])
          .select()
          .single();
        sem = newSem;
      }
      // Move course to new semester
      await supabase
        .from('curriculum_courses')
        .update({ semester_id: sem.id })
        .eq('id', course?.id);
    }
    closeModal();
    refresh();
  };

  return (
    <Dialog open onOpenChange={closeModal}>
      <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block mb-1">Year Level</label>
            <Select value={yearLevel} onValueChange={setYearLevel} required>
              <SelectTrigger>
                <SelectValue placeholder="Select year level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">First Year</SelectItem>
                <SelectItem value="2">Second Year</SelectItem>
                <SelectItem value="3">Third Year</SelectItem>
                <SelectItem value="4">Fourth Year</SelectItem>
                <SelectItem value="5">Fifth Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block mb-1">Semester</label>
            <Select value={semester} onValueChange={setSemester} required>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">First Semester</SelectItem>
                <SelectItem value="2">Second Semester</SelectItem>
                <SelectItem value="3">Summer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block mb-1">Course</label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select course (optional)" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.course_code} - {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block mb-1">Course Code</label>
            <Input value={courseCode} onChange={e => setCourseCode(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Course Name</label>
            <Input value={courseName} onChange={e => setCourseName(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Units</label>
            <Input type="number" value={units} onChange={e => setUnits(Number(e.target.value))} required />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCourseModal({ course, closeModal, refresh }: { course: Course | null, closeModal: () => void, refresh: () => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const handleDelete = async () => {
    await supabase.from('curriculum_courses').delete().eq('id', course?.id);
    closeModal();
    refresh();
  };
  return (
    <Dialog open onOpenChange={closeModal}>
      <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete Course</DialogTitle>
        </DialogHeader>
        <div>Are you sure you want to delete <b>{course?.course_code} - {course?.course_name}</b>?</div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CurriculumsTable({ curriculums, onEdit, onViewTree }: { curriculums: Curriculum[], onEdit: (c: Curriculum) => void, onViewTree: (c: Curriculum) => void }) {
  return (
    <Table className="mb-6">
      <TableHeader>
        <TableRow className="bg-muted">
          <TableHead>Program</TableHead>
          <TableHead>Academic Year</TableHead>
          <TableHead>Curriculum Type</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {curriculums.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">No curriculums found for this project.</TableCell>
          </TableRow>
        ) : (
          curriculums.map(curriculum => (
            <TableRow key={curriculum.id}>
              <TableCell>{curriculum.program_name}</TableCell>
              <TableCell>{curriculum.school_year}</TableCell>
              <TableCell>{curriculum.curriculum_type}</TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(curriculum)}>Edit Curriculum</Button>
                <Button size="sm" variant="secondary" onClick={() => onViewTree(curriculum)}>View Tree</Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function EditCurriculumModal({ curriculum, onClose, onSaved }: { curriculum: Curriculum, onClose: () => void, onSaved: () => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const [programName, setProgramName] = useState(curriculum.program_name);
  const [schoolYear, setSchoolYear] = useState(curriculum.school_year);
  const [curriculumType, setCurriculumType] = useState(curriculum.curriculum_type);
  const [loading] = useState(false);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<{ [yearId: string]: Semester[] }>({});
  const [courses, setCourses] = useState<{ [semesterId: string]: Course[] }>({});

  useEffect(() => {
    const fetchStructure = async () => {
      // 1. Fetch years
      const { data: yearsData } = await supabase
        .from("curriculum_years")
        .select("*")
        .eq("curriculum_id", curriculum.id)
        .order("year_level", { ascending: true });
      setYears(yearsData || []);
      // 2. Fetch semesters for each year
      const semestersByYear: { [yearId: string]: Semester[] } = {};
      for (const year of yearsData || []) {
        const { data: sems } = await supabase
          .from("curriculum_semesters")
          .select("*")
          .eq("year_id", year.id)
          .order("semester", { ascending: true });
        semestersByYear[year.id] = sems || [];
      }
      setSemesters(semestersByYear);
      // 3. Fetch courses for each semester
      const coursesBySemester: { [semesterId: string]: Course[] } = {};
      for (const year of yearsData || []) {
        for (const sem of semestersByYear[year.id] || []) {
          const { data: crs } = await supabase
            .from("curriculum_courses")
            .select("*")
            .eq("semester_id", sem.id)
            .order("course_code", { ascending: true });
          coursesBySemester[sem.id] = crs || [];
        }
      }
      setCourses(coursesBySemester);
    };
    fetchStructure();
  }, [supabase, curriculum.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('organization_curriculums')
      .update({ program_name: programName, school_year: schoolYear, curriculum_type: curriculumType })
      .eq('id', curriculum.id);
    if (error) {
      return;
    }
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Curriculum</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block mb-1">Program</label>
            <Input value={programName} onChange={e => setProgramName(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Academic Year</label>
            <Input value={schoolYear} onChange={e => setSchoolYear(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Curriculum Type</label>
            <Select value={curriculumType} onValueChange={setCurriculumType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select curriculum type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Bridging">Bridging</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>Save</Button>
          </DialogFooter>
        </form>
        <div className="mt-8 overflow-x-auto">
          <AddCourseModal curriculumId={curriculum.id} />
          <CurriculumTable
            years={years}
            semesters={semesters}
            courses={courses}
            refresh={() => {
              // re-fetch structure after add/edit/delete
              const fetchStructure = async () => {
                const { data: yearsData } = await supabase
                  .from("curriculum_years")
                  .select("*")
                  .eq("curriculum_id", curriculum.id)
                  .order("year_level", { ascending: true });
                setYears(yearsData || []);
                const semestersByYear: { [yearId: string]: Semester[] } = {};
                for (const year of yearsData || []) {
                  const { data: sems } = await supabase
                    .from("curriculum_semesters")
                    .select("*")
                    .eq("year_id", year.id)
                    .order("semester", { ascending: true });
                  semestersByYear[year.id] = sems || [];
                }
                setSemesters(semestersByYear);
                const coursesBySemester: { [semesterId: string]: Course[] } = {};
                for (const year of yearsData || []) {
                  for (const sem of semestersByYear[year.id] || []) {
                    const { data: crs } = await supabase
                      .from("curriculum_courses")
                      .select("*")
                      .eq("semester_id", sem.id)
                      .order("course_code", { ascending: true });
                    coursesBySemester[sem.id] = crs || [];
                  }
                }
                setCourses(coursesBySemester);
              };
              fetchStructure();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CurriculumTreeModal({ curriculum, onClose }: { curriculum: Curriculum, onClose: () => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<{ [yearId: string]: Semester[] }>({});
  const [courses, setCourses] = useState<{ [semesterId: string]: Course[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStructure = async () => {
      setLoading(true);
      const { data: yearsData } = await supabase
        .from("curriculum_years")
        .select("*")
        .eq("curriculum_id", curriculum.id)
        .order("year_level", { ascending: true });
      setYears(yearsData || []);
      const semestersByYear: { [yearId: string]: Semester[] } = {};
      for (const year of yearsData || []) {
        const { data: sems } = await supabase
          .from("curriculum_semesters")
          .select("*")
          .eq("year_id", year.id)
          .order("semester", { ascending: true });
        semestersByYear[year.id] = sems || [];
      }
      setSemesters(semestersByYear);
      const coursesBySemester: { [semesterId: string]: Course[] } = {};
      for (const year of yearsData || []) {
        for (const sem of semestersByYear[year.id] || []) {
          const { data: crs } = await supabase
            .from("curriculum_courses")
            .select("*")
            .eq("semester_id", sem.id)
            .order("course_code", { ascending: true });
          coursesBySemester[sem.id] = crs || [];
        }
      }
      setCourses(coursesBySemester);
      setLoading(false);
    };
    fetchStructure();
  }, [supabase, curriculum.id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Curriculum Tree View</DialogTitle>
        </DialogHeader>
        <div className="mb-2 font-semibold">{curriculum.program_name} ({curriculum.school_year}) - {curriculum.curriculum_type}</div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="pl-2">
            {years.map(year => (
              <div key={year.id} className="mb-2">
                <div className="font-medium">{yearLabels[year.year_level] || `${year.year_level} Year`}</div>
                <div className="pl-4">
                  {(semesters[year.id] || []).map((sem: Semester) => (
                    <div key={sem.id} className="mb-1">
                      <div className="font-normal">{semesterLabels[sem.semester] || `${sem.semester} Semester`}</div>
                      <ul className="pl-4 list-disc">
                        {(courses[sem.id] || []).length === 0 ? (
                          <li className="text-muted-foreground">No courses</li>
                        ) : (
                          courses[sem.id].map((course: Course) => (
                            <li key={course.id}>
                              <span className="font-mono">{course.course_code}</span>: {course.course_name} <span className="text-muted-foreground">({course.units} units)</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 