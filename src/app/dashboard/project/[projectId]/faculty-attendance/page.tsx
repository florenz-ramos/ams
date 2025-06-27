'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/project-sidebar';
import { useSupabase } from '@/hooks/use-supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProjectHeader from '@/components/project-header';

type TimeSlot = { label: string; time: string };

type Faculty = { id: string; name: string; email: string };

type AttendanceRecord = {
  id: string;
  faculty_id: string;
  project_id: string;
  user_id: string;
  date: string;
  times: TimeSlot[];
  created_at: string;
  updated_at: string;
};

type ModalData = Partial<AttendanceRecord>;

type Project = {
  id: string;
  name: string;
  description: string | null;
};

export default function FacultyAttendancePage() {
  const { projectId } = useParams();
  const supabase = useSupabase() as SupabaseClient;
  const [orgId, setOrgId] = useState<string>('');
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const projectIdStr = typeof projectId === 'string' ? projectId : Array.isArray(projectId) ? projectId[0] : '';
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ModalData>({});
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [modalFacultyId, setModalFacultyId] = useState<string>('');
  const [modalDate, setModalDate] = useState<string>(date);
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get logged-in user and role
  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    setUserId(user?.id || null);
    async function fetchRole() {
      if (!user?.id || !orgId) return;
      const { data: member } = await supabase
        .from('organization_team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .single();
      setUserRole(member?.role || null);
    }
    fetchRole();
  }, [orgId, supabase]);

  // Fetch orgId
  useEffect(() => {
    async function fetchProjectOrg() {
      if (!projectIdStr) return;
      const { data } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectIdStr)
        .single();
      if (data?.organization_id) setOrgId(data.organization_id);
    }
    fetchProjectOrg();
  }, [projectIdStr, supabase]);

  // Fetch faculty using join table
  useEffect(() => {
    async function fetchFaculty() {
      if (!orgId) return;
      const { data: members } = await supabase
        .from('organization_team_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('role', 'faculty');
      const facultyIds = (members || []).map((m: { user_id: string }) => m.user_id);
      if (facultyIds.length > 0) {
        const { data: facultyData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', facultyIds);
        let facultyList = (facultyData as Faculty[]) || [];
        // If user is faculty, only show their own record
        if (userRole === 'faculty' && userId) {
          facultyList = facultyList.filter(f => f.id === userId);
        }
        setFaculty(facultyList);
      } else {
        setFaculty([]);
      }
    }
    fetchFaculty();
  }, [orgId, supabase, userRole, userId]);

  // Standalone fetchAttendance function
  const fetchAttendance = useCallback(async (): Promise<void> => {
    if (!projectIdStr || !date) return;
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectIdStr)
      .eq('date', date);
    if (data) {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      (data as AttendanceRecord[]).forEach((row) => {
        attendanceMap[row.faculty_id] = row;
      });
      setAttendance(attendanceMap);
    }
  }, [projectIdStr, date, supabase]);

  // Fetch attendance on project/date change
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Fetch project details
  useEffect(() => {
    async function fetchProject() {
      if (!projectIdStr) return;
      const { data } = await supabase
        .from('projects')
        .select('id, name, description')
        .eq('id', projectIdStr)
        .single();
      setProject(data as Project | null);
    }
    fetchProject();
  }, [projectIdStr, supabase]);

  // Save attendance
  const handleSave = async (userId: string, customDate: string, record: ModalData) => {
    if (!record) return;
    setSaving(userId);
    setErrorMsg(null);
    const { error } = await supabase.from('attendance').upsert([
      {
        faculty_id: userId,
        user_id: userId,
        project_id: projectIdStr,
        date: customDate || date,
        times: record.times || [],
      }
    ], { onConflict: 'faculty_id,project_id,date' });
    setSaving(null);
    if (error) {
      setErrorMsg(error.message);
    }
  };

  // Save attendance and refresh table
  const handleModalSave = async () => {
    const userId = modalMode === 'add' ? modalFacultyId : openModal;
    if (!userId) return;
    await handleSave(userId, modalDate, modalData);
    await fetchAttendance(); // Always refresh after save
    setOpenModal(null);
  };

  // Pre-fill modal with a deep copy of the latest attendance for selected faculty/date
  const openAttendanceModal = (userId: string) => {
    setModalMode('edit');
    setModalFacultyId(userId);
    // Deep copy to avoid mutating attendance state directly
    const record = attendance[userId] ? JSON.parse(JSON.stringify(attendance[userId])) : {};
    setModalData(record);
    setModalDate(date);
    setOpenModal(userId);
  };

  const openAddAttendanceModal = () => {
    setModalMode('add');
    setModalFacultyId('');
    setModalData({});
    setModalDate(date);
    setOpenModal('add');
  };

  const handleAddTimeSlot = () => {
    setModalData((prev: ModalData): ModalData => ({
      ...prev,
      times: [...(prev.times || []), { label: '', time: '' }],
    }));
  };

  const handleRemoveTimeSlot = (idx: number) => {
    setModalData((prev: ModalData): ModalData => ({
      ...prev,
      times: (prev.times || []).filter((_: TimeSlot, i: number) => i !== idx),
    }));
  };

  const handleTimeSlotChange = (idx: number, field: 'label' | 'time', value: string) => {
    setModalData((prev: ModalData): ModalData => ({
      ...prev,
      times: (prev.times || []).map((slot: TimeSlot, i: number) =>
        i === idx ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  return (
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 72)', '--header-height': 'calc(var(--spacing) * 12)' } as React.CSSProperties}>
      {orgId && <ProjectSidebar projectId={projectIdStr} orgId={orgId} />}
      <SidebarInset>
        <ProjectHeader project={project} />
        <main className="flex flex-col items-center gap-8 p-8">
          <div className="w-full">
            <h1 className="text-xl font-bold mb-4">Faculty Attendance</h1>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="ml-2 inline-block w-auto" />
              </div>
              {userRole !== 'faculty' && (
                <Button onClick={openAddAttendanceModal} variant="default">Add New Attendance</Button>
              )}
            </div>
            {errorMsg && (
              <div className="text-red-600 mb-4">{errorMsg}</div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faculty.map((f: Faculty) => {
                  const record = attendance[f.id];
                  let timeSlots: React.ReactNode = '-';
                  if (record && Array.isArray(record.times) && record.times.length > 0) {
                    // Only show the last occurrence for each label
                    const lastSlotsMap = new Map<string, TimeSlot>();
                    record.times.forEach((slot: TimeSlot) => {
                      lastSlotsMap.set(slot.label, slot);
                    });
                    const uniqueSlots = Array.from(lastSlotsMap.values());
                    timeSlots = (
                      <div className="flex flex-col gap-1">
                        {uniqueSlots.map((slot: TimeSlot, idx: number) => (
                          <span key={idx} className="font-mono">{slot.label}: {slot.time || '-'}</span>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <TableRow key={f.id}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{record && record.date ? record.date : '-'}</TableCell>
                      <TableCell>{timeSlots}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="ml-2" onClick={() => openAttendanceModal(f.id)}>
                          {record ? 'Edit' : 'Add'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Dialog open={!!openModal} onOpenChange={v => !v && setOpenModal(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{modalMode === 'add' ? 'Add New Attendance' : 'Manual Attendance'}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  {modalMode === 'add' && userRole !== 'faculty' && (
                    <div>
                      <Label htmlFor="faculty">Faculty</Label>
                      <Select value={modalFacultyId} onValueChange={setModalFacultyId}>
                        <SelectTrigger className="w-full" id="faculty">
                          <SelectValue placeholder="Select faculty" />
                        </SelectTrigger>
                        <SelectContent>
                          {faculty.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} />
                  <Label>Time Slots</Label>
                  {(modalData.times || []).map((slot: TimeSlot, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Label (e.g. MORNING IN)"
                        value={slot.label}
                        onChange={e => handleTimeSlotChange(idx, 'label', e.target.value)}
                        className="w-40"
                      />
                      <Input
                        type="time"
                        value={slot.time}
                        onChange={e => handleTimeSlotChange(idx, 'time', e.target.value)}
                        className="w-32"
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveTimeSlot(idx)}>-</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTimeSlot}>+ Add Time Slot</Button>
                </div>
                <DialogFooter>
                  <Button onClick={handleModalSave} disabled={saving === openModal || (modalMode === 'add' && userRole !== 'faculty' && !modalFacultyId)}>
                    {saving === openModal ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 