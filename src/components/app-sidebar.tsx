"use client"

import * as React from "react"
import {
  IconFolder,
  IconSettings,
  IconUsers,
  IconBuilding,
  IconSchool,
} from "@tabler/icons-react"
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import Link from 'next/link';

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"


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
      </SidebarHeader>
      <SidebarContent>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/team'}>
                  <a href="/dashboard/team">
                    <IconUsers className="mr-2" /> Team
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/students'}>
                  <Link href="/dashboard/students">
                    <IconUsers className="mr-2" /> Students
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/colleges-campuses'}>
                  <a href="/dashboard/colleges-campuses">
                    <IconBuilding className="mr-2" /> Colleges/Campuses
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/academic-programs'}>
                  <a href="/dashboard/academic-programs">
                    <IconSchool className="mr-2" /> Academic Programs
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/academic-levels'}>
                  <a href="/dashboard/academic-levels">
                    <IconSchool className="mr-2" /> Academic Levels
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
        <div className="mt-auto p-4">
          <NavUser user={user} />
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
