'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupabaseClient } from '@supabase/supabase-js';
import ProjectHeader from '@/components/project-header';

type Project = { id: string; name: string; description?: string; organization_id?: string };

export default function ProjectSettingsPage() {
  const { projectId } = useParams() as { projectId: string };
  const supabase = useSupabase() as SupabaseClient;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (!error && data) {
        setProject(data);
        // Fetch user role for this org
        const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        if (user && user.id && data.organization_id) {
          const { data: member } = await supabase
            .from('organization_team_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', data.organization_id)
            .single();
          setUserRole(member?.role || null);
        }
      }
    };
    fetchProject();
  }, [supabase, projectId]);

  const handleDelete = async () => {
    if (!project) return;
    if (userRole !== 'owner' && userRole !== 'admin') {
      setError('Only the owner or admin can delete this project.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.from('projects').delete().eq('id', project.id);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push(`/dashboard`);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    if (userRole === 'faculty') {
      setError('Faculty are not allowed to edit project settings.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase
      .from('projects')
      .update({ name: project.name })
      .eq('id', project.id);
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 72)', '--header-height': 'calc(var(--spacing) * 12)' } as React.CSSProperties}>
      {project && <ProjectSidebar projectId={projectId} orgId={project.organization_id || ''} />}
      <SidebarInset>
        <ProjectHeader project={project} />
        <main className="flex flex-col items-center gap-8 p-8">
          <Card className="w-full max-w-lg">
            <CardContent>
              {project ? (
                <>
                  <h1 className="text-2xl font-bold mb-4">Project Settings</h1>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Project Name</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={project.name}
                      onChange={e => setProject({ ...project, name: e.target.value })}
                      disabled={userRole === 'faculty'}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={loading || userRole === 'faculty'}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <div className="mt-8">
                    <Button variant="destructive" onClick={() => setShowDelete(true)}>
                      Delete Project
                    </Button>
                  </div>
                  <Dialog open={showDelete} onOpenChange={setShowDelete}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                      </DialogHeader>
                      <div className="mb-4">Type the project name to confirm deletion:</div>
                      <input
                        className="border rounded px-2 py-1 w-full mb-4"
                        value={deleteInput}
                        onChange={e => setDeleteInput(e.target.value)}
                        placeholder={project.name}
                      />
                      {error && <div className="text-destructive text-sm mb-2">{error}</div>}
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={deleteInput !== project.name || loading}
                        >
                          {loading ? 'Deleting...' : 'Delete'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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