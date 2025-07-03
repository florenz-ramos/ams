"use client"

import * as React from "react"
import {
  IconFolder,
  IconSettings,
  IconUsers,
  IconBuilding,
  IconSchool,
  IconBook,
} from "@tabler/icons-react"
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';

import { NavUser } from "@/components/org/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const sidebarNav = [
  {
    label: "Team",
    href: "/dashboard/team",
    icon: IconUsers,
  },
  {
    label: "Students",
    href: "/dashboard/students",
    icon: IconUsers,
  },
  {
    label: "Colleges/Campuses",
    href: "/dashboard/colleges-campuses",
    icon: IconBuilding,
  },
  {
    label: "Academic Programs",
    href: "/dashboard/academic-programs",
    icon: IconSchool,
  },
  {
    label: "Academic Levels",
    href: "/dashboard/academic-levels",
    icon: IconSchool,
  },
  {
    label: "Courses",
    href: "/dashboard/courses",
    icon: IconBook,
  },
  //add course navigation here
];

export function AppSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const supabase = useSupabase() as SupabaseClient;
  const { setOrganization } = useOrganization();
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

  useEffect(() => {
    async function fetchOrg() {
      if (orgId) {
        const { data } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        if (data) setOrganization(data);
      }
    }
    fetchOrg();
  }, [orgId, supabase, setOrganization]);

  useEffect(() => {
    async function fetchRole() {
      if (user.id && orgId) {
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single();
        setUserRole(member?.role || '');
      } else {
        setUserRole('');
      }
      setRoleLoading(false);
    }
    fetchRole();
  }, [orgId, user.id, supabase]);

  return (
    <Sidebar collapsible="offcanvas" variant='inset'>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/dashboard">
                  <IconBuilding className="!size-5" />
                  <span className="text-base font-semibold">Organization</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {orgId ? (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                  <a href="/dashboard">
                    <IconFolder className="mr-2" /> Projects
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!roleLoading && userRole !== 'faculty' && (
                <>
                  {sidebarNav.map(item => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href}>
                        <a href={item.href}>
                          <item.icon className="mr-2" /> {item.label}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
              {!roleLoading && userRole !== 'faculty' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/settings'}>
                    <a href="/dashboard/settings">
                      <IconSettings className="mr-2" /> Organization settings
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
            <IconBuilding className="mb-4" size={32} />
            <span>No organization selected</span>
            <span className="text-xs mt-2">Please select or create an organization to access features.</span>
          </div>
        )}
        {user.id && (
          <div className="mt-auto p-4">
            <NavUser user={user} />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
