import { IconDashboard, IconInnerShadowTop } from "@tabler/icons-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { NavMain } from "../org/nav-main";
import CryptoJS from 'crypto-js';
import { NavAdminUser } from "./nav-user";


const data = {
    navMain: [
        {
            title: 'Dashboard', url: '#', icon: IconDashboard
        }
    ]
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="dashboard">
                                <IconInnerShadowTop className="!size-5" />
                                <span className="text-base font-semibold">WorkFLOW</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain}/>
            </SidebarContent>
            <SidebarFooter>
              {typeof window !== 'undefined' && (() => {
                const encrypted = localStorage.getItem('admin');
                if (!encrypted) return null;
                const secret = 'admin-localstorage-secret';
                let admin = null;
                try {
                  const bytes = CryptoJS.AES.decrypt(encrypted, secret);
                  admin = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                } catch {
                  return null;
                }
                if (!admin) return null;
                return (
                  <NavAdminUser user={{
                    name: admin.name || admin.email || 'Admin',
                    email: admin.email || '',
                    avatar: '',
                  }} />
                );
              })()}
            </SidebarFooter>
        </Sidebar>
    )
}