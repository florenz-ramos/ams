'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/site-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { IconLayoutGrid, IconTable } from '@tabler/icons-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getTemplate } from '@/lib/actions';
import { useOrganization, Organization } from '@/context/OrganizationContext';

type Project = { id: string; name: string; description?: string };
type Template = {
  id: string;
  name: string;
  type: string;
  default_name: string;
  default_description: string;
  user_targets: string[];
  requirements: string[];
};

export default function DashboardPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization, setOrganization } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [projectType, setProjectType] = useState('attendance');
  const [openTypePopover, setOpenTypePopover] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<{ value: string; label: string }[]>([]);

  // Fetch organizations and set default selected org
  useEffect(() => {
    const fetchOrgs = async () => {
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
      if (user) {
        // No more auto-setting selectedOrg here
        // Only set it if the user selects a new org
      }
    };
    fetchOrgs();
  }, [supabase, organization]);

  // Fetch projects for selected org
  useEffect(() => {
    if (!organization) return;
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id);
      if (!error) setProjects(data || []);
    };
    fetchProjects();
  }, [supabase, organization]);

  useEffect(() => {
    if (!organization) return;
    const fetchRole = async () => {
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
      if (user && user.id) {
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', organization.id)
          .single();
        setUserRole(member?.role || '');
      }
    };
    fetchRole();
  }, [supabase, organization]);

  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('name, type')
        .order('type');
      
      if (!error && data) {
        const templates = data.map(t => ({
          value: t.name,
          label: t.type
        }));
        setAvailableTemplates(templates);
        // Set default project type to first available template
        if (templates.length > 0 && !templates.find(t => t.value === projectType)) {
          setProjectType(templates[0].value);
        }
      }
    };
    fetchTemplates();
  }, [supabase, projectType]);

  const handleOrgChange = (org: Organization) => {
    setOrganization(org);
    setProjects([]);
  };

  const handleNewProjectClick = async () => {
    setShowNewProject(true);
    console.log('PROJECT TYPE DEBUG (handleNewProjectClick)', projectType);
    const data = await getTemplate(projectType);
    console.log('TEMPLATE DATA DEBUG (handleNewProjectClick)', data);
    if (data) {
      setTemplate(data);
      setNewProjectName(data.default_name || '');
      setNewProjectDescription(data.default_description || '');
    }
  };

  useEffect(() => {
    if (showNewProject) {
      console.log('PROJECT TYPE DEBUG (useEffect)', projectType);
      getTemplate(projectType).then(data => {
        console.log('TEMPLATE DATA DEBUG (useEffect)', data);
        if (data) {
          setTemplate(data);
          setNewProjectName(data.default_name || '');
          setNewProjectDescription(data.default_description || '');
        }
      });
    }
  }, [projectType, showNewProject]);

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!organization) {
      setError('No organization selected.');
      setLoading(false);
      return;
    }
    const { error, data } = await supabase
      .from('projects')
      .insert([
        {
          name: newProjectName,
          description: newProjectDescription,
          organization_id: organization.id,
          type: projectType,
          user_targets: template?.user_targets || [],
          requirements: template?.requirements || [],
        },
      ])
      .select();
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data && data.length > 0) {
      setProjects([...projects, data[0]]);
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
    }
  };

  // Debug: log template whenever it changes
  useEffect(() => {
    console.log('TEMPLATE DEBUG', template);
  }, [template]);

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      } as React.CSSProperties}
    >
      {organization && (
        <AppSidebar orgId={organization?.id || ''} />
      )}
      <SidebarInset>
        <SiteHeader onOrgChange={handleOrgChange} />
        <main className="flex flex-col items-center gap-8 p-8">
          {!organization ? (
            <div className="w-full max-w-lg text-center text-muted-foreground">
              No organization found. Please create an organization to get started.
            </div>
          ) : (
            <div className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Projects in {organization.name}</h2>
                <div className="flex gap-2">
                  <ToggleGroup type="single" value={view} onValueChange={v => v && setView(v as 'grid' | 'table')}>
                    <ToggleGroupItem value="grid" aria-label="Grid view">
                      <IconLayoutGrid className="size-5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label="Table view">
                      <IconTable className="size-5" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  {userRole !== 'faculty' && (
                    <Button onClick={handleNewProjectClick}>
                      New Project
                    </Button>
                  )}
                </div>
              </div>
              <Card>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-muted-foreground">No projects yet.</div>
                  ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {projects.map(project => (
                        <Link key={project.id}
                          href={`/dashboard/project/${project.id}`}
                          className="block border rounded p-4 hover:bg-accent transition">
                          <div className="font-semibold text-lg">{project.name}</div>
                          {project.description && (
                            <div className="text-muted-foreground text-sm mt-1">{project.description}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.map(project => (
                          <TableRow key={project.id}>
                            <TableCell>
                              <Link href={`/dashboard/project/${project.id}`} className="font-medium hover:underline">
                                {project.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground text-sm">{project.description}</span>
                            </TableCell>
                            <TableCell>
                              <Link href={`/dashboard/project/${project.id}`}>
                                <Button size="sm" variant="outline">
                                  Open
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNewProject} className="flex flex-col gap-4">
                <label className="text-sm font-medium">Project Type</label>
                <Popover open={openTypePopover} onOpenChange={setOpenTypePopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openTypePopover}
                      className="w-full justify-between"
                    >
                      {availableTemplates.find((t) => t.value === projectType)?.label || 'Select project type'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search type..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No type found.</CommandEmpty>
                        <CommandGroup>
                          {availableTemplates.map((type) => (
                            <CommandItem
                              key={type.value}
                              value={type.value}
                              onSelect={() => {
                                setProjectType(type.value);
                                setOpenTypePopover(false);
                              }}
                            >
                              {type.label}
                              <Check
                                className={
                                  projectType === type.value
                                    ? 'ml-auto opacity-100'
                                    : 'ml-auto opacity-0'
                                }
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  type="text"
                  placeholder="Project description (optional)"
                  value={newProjectDescription}
                  onChange={e => setNewProjectDescription(e.target.value)}
                />
                {template && (
                  <div className="text-sm text-muted-foreground">
                    {template.default_description && (
                      <div className="mb-4">
                        <div className="mb-1 font-semibold">Template Description:</div>
                        <div>{template.default_description}</div>
                      </div>
                    )}
                    <div className="mb-2 font-semibold">User Targets:</div>
                    <ul className="mb-2 list-disc list-inside">
                      {template.user_targets.map((target: string) => (
                        <li key={target}>{target}</li>
                      ))}
                    </ul>
                    <div className="mb-2 font-semibold">Requirements:</div>
                    <ul className="list-disc list-inside">
                      {template.requirements.map((req: string) => (
                        <li key={req}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {error && <div className="text-destructive text-sm">{error}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}