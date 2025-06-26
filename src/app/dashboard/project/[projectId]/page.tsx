'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useParams } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectSidebar } from '@/components/project-sidebar';
import { SupabaseClient } from '@supabase/supabase-js';
import ProjectHeader from '@/components/project-header';

type Project = {
  id: string;
  name: string;
  description?: string;
  user_targets?: string[];
  requirements?: string[];
  organization_id?: string;
};

export default function ProjectPage() {
  const supabase = useSupabase() as SupabaseClient;
  const params = useParams();
  const { projectId } = params as { projectId: string };
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (!error) setProject(data);
    };
    fetchProject();
  }, [supabase, projectId]);

  return (
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 72)', '--header-height': 'calc(var(--spacing) * 12)' } as React.CSSProperties}>
      {project && <ProjectSidebar projectId={projectId} orgId={project.organization_id || ''} />}
      <SidebarInset>
        <ProjectHeader project={project} />
        <main className="flex flex-col items-center gap-8 p-8">
          <Card className="w-full">
            <CardContent>
              {project ? (
                <>
                  <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
                  {project.description ? (
                    <div className="text-muted-foreground text-base mb-4">{project.description}</div>
                  ) : (
                    <div className="text-muted-foreground text-base mb-4">No description provided.</div>
                  )}
                  {Array.isArray(project.user_targets) && project.user_targets.length > 0 && (
                    <div className="mb-4">
                      <div className="font-semibold mb-1">User Targets:</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {project.user_targets.map((target: string) => (
                          <li key={target}>{target}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(project.requirements) && project.requirements.length > 0 && (
                    <div className="mb-4">
                      <div className="font-semibold mb-1">Requirements:</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {project.requirements.map((req: string) => (
                          <li key={req}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <h1 className="text-2xl font-bold mb-4">Loading...</h1>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 