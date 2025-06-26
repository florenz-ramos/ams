'use client';
import CollegesCampusesSection from '@/components/colleges-campuses-section';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { useOrganization } from '@/context/OrganizationContext';

export default function CollegesCampusesPage() {
  const { organization: selectedOrg } = useOrganization();

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      } as React.CSSProperties}
    >
      {selectedOrg && <AppSidebar orgId={selectedOrg.id} />}
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-col items-center gap-8 p-8">
          {!selectedOrg ? (
            <div className="w-full max-w-lg text-center text-muted-foreground">
              No organization found. Please create an organization to get started.
            </div>
          ) : (
            <CollegesCampusesSection orgId={selectedOrg.id} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 