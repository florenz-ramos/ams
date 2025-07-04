"use client";
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { IconArrowLeft, IconSettings, IconLayoutDashboard, IconUserCheck, IconUsers, IconBell, IconFileText, IconChartBar, IconBook } from '@tabler/icons-react';
import { NavUser } from '@/components/org/nav-user';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';

export function ProjectSidebar({ orgId, projectId }: { orgId: string; projectId: string }) {
  const supabase = useSupabase() as SupabaseClient;
  let user = { name: '', email: '', avatar: '', id: '' };
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      user = {
        name: parsed.name || parsed.email || 'User',
        email: parsed.email || '',
        avatar: parsed.avatar || '',
        id: parsed.id || '',
      };
    }
  }
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [projectType, setProjectType] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchRoleAndRequirements() {
      if (user.id && orgId && projectId) {
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single();
        setUserRole(member?.role || '');
        setRoleLoading(false);
        // Fetch project requirements and type
        const { data: project } = await supabase
          .from('projects')
          .select('requirements, type')
          .eq('id', projectId)
          .single();
        setRequirements(Array.isArray(project?.requirements) ? project.requirements : []);
        setProjectType(project?.type || null);
      }
    }
    fetchRoleAndRequirements();
  }, [orgId, user.id, supabase, projectId]);

  // Map requirements to sidebar items
  const requirementNav = [
    {
      match: 'User authentication and role management',
      label: 'Users',
      href: `/dashboard/project/${projectId}/users`,
      icon: <IconUsers className="mr-2" />,
    },
    {
      match: 'Faculty attendance logging',
      label: 'Faculty Attendance',
      href: `/dashboard/project/${projectId}/faculty-attendance`,
      icon: <IconUserCheck className="mr-2" />,
    },
    {
      match: 'Student attendance tracking',
      label: 'Student Attendance',
      href: `/dashboard/project/${projectId}/student-attendance`,
      icon: <IconUserCheck className="mr-2" />,
    },
    {
      match: 'Admin dashboard for attendance reports',
      label: 'Reports',
      href: `/dashboard/project/${projectId}/reports`,
      icon: <IconChartBar className="mr-2" />,
    },
    {
      match: 'Notifications for absentees',
      label: 'Notifications',
      href: `/dashboard/project/${projectId}/notifications`,
      icon: <IconBell className="mr-2" />,
    },
    {
      match: 'Export attendance data (CSV/Excel)',
      label: 'Export Data',
      href: `/dashboard/project/${projectId}/export-data`,
      icon: <IconFileText className="mr-2" />,
    },
    {
      match: 'Attendance summary and analytics',
      label: 'Analytics',
      href: `/dashboard/project/${projectId}/analytics`,
      icon: <IconChartBar className="mr-2" />,
    },
  ];


  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={`/dashboard`}>
                <IconArrowLeft className="mr-2" /> Back to Organizations
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}`}>
              <Link href={`/dashboard/project/${projectId}`}> <IconLayoutDashboard className="mr-2" /> Overview </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {projectType === 'curriculum-creation' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}/curriculum`}>
                <Link href={`/dashboard/project/${projectId}/curriculum`}>
                  <IconBook className="mr-2" /> Curriculum
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {projectType?.toLowerCase().replace(/[^a-z]/g, '') === 'enrollmentprocess' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>

                <Link href={`/dashboard/project/${projectId}/enrollment-process`}>
                  <IconBook className="mr-2" />  Enrollment Process
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* Show Course Offering only for course-offering projects */}
          {projectType?.toLowerCase().replace(/[^a-z]/g, '') === 'courseoffering' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}/course-offering`}>
                <Link href={`/dashboard/project/${projectId}/course-offering`}>
                  <IconBook className="mr-2" /> Course Offering
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* Render nav items based on requirements */}
          {!roleLoading && userRole !== 'faculty' && (
            <>
              {projectType === 'Admission' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}/admission`}>
                    <Link href={`/dashboard/project/${projectId}/admission`}>
                      <IconUsers className="mr-2" /> Admission
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {requirements.map(req => {
                const nav = requirementNav.find(n => n.match === req);
                if (!nav) return null;
                const isActive = pathname === nav.href;
                return (
                  <SidebarMenuItem key={nav.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={nav.href}>{nav.icon} {nav.label}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}/settings`}>
                  <Link href={`/dashboard/project/${projectId}/settings`}>
                    <IconSettings className="mr-2" /> Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          {/* For faculty, show only Faculty Attendance and Export Data if present */}
          {!roleLoading && userRole === 'faculty' && (
            <>
              {requirements.includes('Faculty attendance logging') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}/faculty-attendance`}>
                    <Link href={`/dashboard/project/${projectId}/faculty-attendance`}>
                      <IconUserCheck className="mr-2" /> Faculty Attendance
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {requirements.includes('Export attendance data (CSV/Excel)') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === `/dashboard/project/${projectId}/export-data`}>
                    <Link href={`/dashboard/project/${projectId}/export-data`}>
                      <IconFileText className="mr-2" /> Export Data
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          )}




        </SidebarMenu>
        <div className="mt-auto p-4">
          <NavUser user={user} />
        </div>
      </SidebarContent>
    </Sidebar>
  );
} 