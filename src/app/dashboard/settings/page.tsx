'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupabaseClient } from '@supabase/supabase-js';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/org/app-sidebar';
import { useOrganization } from '@/context/OrganizationContext';
import { SiteHeader } from '@/components/org/site-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTheme } from '@/context/ThemeContext';
import { ThemeButton } from '@/components/ui/theme-button';
import { cssProperties } from '@/lib/constants';

type DocumentType = {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  required: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

type OrganizationTheme = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
};

export default function OrganizationSettingsPage() {
  const supabase = useSupabase() as SupabaseClient;
  const router = useRouter();
  const { organization: org, setOrganization } = useOrganization();
  const { theme: currentTheme, refreshTheme } = useTheme();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Numbering settings state
  const [numbering, setNumbering] = useState({
    applicant_no: { prefix: '', next_number: 1, format: '' },
    student_no: { prefix: '', next_number: 1, format: '' },
  });
  const [numberingError, setNumberingError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [applicantNoLoading, setApplicantNoLoading] = useState(false);
  const [studentNoLoading, setStudentNoLoading] = useState(false);

  // Theme settings state
  const [theme, setTheme] = useState<OrganizationTheme>(currentTheme);
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeError, setThemeError] = useState('');

  // Documents state
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [docTypesLoading, setDocTypesLoading] = useState(false);
  const [docTypeError, setDocTypeError] = useState("");
  const [showAddDocType, setShowAddDocType] = useState(false);
  const [newDocType, setNewDocType] = useState<Omit<DocumentType, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>({ name: "", description: "", required: true, sort_order: 0 });
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null);
  const [editDocTypeValues, setEditDocTypeValues] = useState<Omit<DocumentType, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>({ name: "", description: "", required: true, sort_order: 0 });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!org) return;
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
      if (user && user.id && org.id) {
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', org.id)
          .single();
        setUserRole(member?.role || null);
      }
    };
    fetchUserRole();
  }, [supabase, org]);

  // Fetch numbering settings
  useEffect(() => {
    if (!org) return;
    supabase
      .from('organization_numbering_settings')
      .select('*')
      .eq('organization_id', org.id)
      .then(({ data, error }) => {
        if (error) {
          setNumberingError(error.message);
        } else if (data) {
          const n = { ...numbering };
          data.forEach((row: Record<string, unknown>) => {
            if (row.type === 'applicant_no') n.applicant_no = row as { prefix: string; next_number: number; format: string };
            if (row.type === 'student_no') n.student_no = row as { prefix: string; next_number: number; format: string };
          });
          setNumbering(n);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, org]);

  // Fetch document types
  useEffect(() => {
    if (!org) return;
    setDocTypesLoading(true);
    supabase
      .from("organization_document_types")
      .select("*")
      .eq("organization_id", org.id)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        setDocTypesLoading(false);
        if (error) setDocTypeError(error.message);
        else setDocTypes(data || []);
      });
  }, [supabase, org, showAddDocType, editingDocType]);

  // Fetch theme settings
  useEffect(() => {
    if (!org) return;
    supabase
      .from('organization_themes')
      .select('primary_color, secondary_color, accent_color')
      .eq('organization_id', org.id)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          setThemeError(error.message);
        } else if (data) {
          setTheme(data as OrganizationTheme);
        }
      });
  }, [supabase, org]);

  // Update local theme when context theme changes
  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  const handleNumberingChange = (type: 'applicant_no' | 'student_no', field: string, value: string | number) => {
    setNumbering(n => ({
      ...n,
      [type]: { ...n[type], [field]: value },
    }));
  };

  const handleNumberingSave = async (type: 'applicant_no' | 'student_no') => {
    if (!org) return;
    if (type === 'applicant_no') setApplicantNoLoading(true);
    if (type === 'student_no') setStudentNoLoading(true);
    setNumberingError('');
    const row = numbering[type];
    const { error } = await supabase.from('organization_numbering_settings').upsert({
      organization_id: org.id,
      type,
      prefix: row.prefix,
      next_number: row.next_number,
      format: row.format,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,type' });
    if (type === 'applicant_no') setApplicantNoLoading(false);
    if (type === 'student_no') setStudentNoLoading(false);
    if (error) setNumberingError(error.message);
  };

  const handleDelete = async () => {
    if (!org) return;
    if (userRole !== 'owner') {
      setError('Only the owner can delete this organization.');
      return;
    }
    setLoading(true);
    setError('');
    await supabase.from('projects').delete().eq('organization_id', org.id);
    const { error } = await supabase.from('organizations').delete().eq('id', org.id);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  // Add document type
  const handleAddDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setDocTypeError("");
    const { error } = await supabase.from("organization_document_types").insert({
      organization_id: org.id,
      ...newDocType,
    });
    if (error) setDocTypeError(error.message);
    else setShowAddDocType(false);
    setNewDocType({ name: "", description: "", required: true, sort_order: 0 });
  };

  // Edit document type
  const handleEditDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !editingDocType) return;
    setDocTypeError("");
    const { error } = await supabase.from("organization_document_types").update({
      ...editDocTypeValues,
    }).eq("id", editingDocType.id);
    if (error) setDocTypeError(error.message);
    else setEditingDocType(null);
  };

  // Delete document type
  const handleDeleteDocType = async (id: string) => {
    if (!org) return;
    setDocTypeError("");
    const { error } = await supabase.from("organization_document_types").delete().eq("id", id);
    if (error) setDocTypeError(error.message);
  };

  const handleThemeChange = (field: keyof OrganizationTheme, value: string) => {
    setTheme(prev => ({ ...prev, [field]: value }));
  };

  const handleThemeSave = async () => {
    if (!org) return;
    setThemeLoading(true);
    setThemeError('');
    const { error } = await supabase
      .from('organization_themes')
      .upsert({
        organization_id: org.id,
        ...theme,
      });
    setThemeLoading(false);
    if (error) {
      setThemeError(error.message);
    } else {
      // Refresh the theme context to apply changes
      await refreshTheme();
    }
  };

  return (
    <SidebarProvider
      style={cssProperties}
    >
      <AppSidebar orgId={org?.id || ''} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-col items-center gap-8 p-8">
          <Card className="w-full">
            <CardContent>
              <h1 className="text-2xl font-bold mb-4">Organization Settings</h1>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="numbering">Numbering</TabsTrigger>
                  <TabsTrigger value="theme">Theme</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                  {/* Change Organization Name section */}
                  <div className="mb-8">
                    <label className="block mb-2 font-medium">Organization Name</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={org?.name || ''}
                      onChange={e => setOrganization(org ? { ...org, name: e.target.value } : org)}
                      disabled={!org}
                    />
                    <ThemeButton
                      onClick={async () => {
                        if (!org) return;
                        setLoading(true);
                        setError('');
                        const { error } = await supabase
                          .from('organizations')
                          .update({ name: org.name })
                          .eq('id', org.id);
                        setLoading(false);
                        if (error) setError(error.message);
                      }}
                      disabled={!org || loading}
                      variant="primary"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </ThemeButton>
                    {error && <div className="text-destructive text-sm mt-2">{error}</div>}
                  </div>
                  <div className="mt-8 border-t pt-6">
                    <h2 className="text-lg font-semibold mb-2 text-destructive">Delete Organization</h2>
                    <p className="mb-2 text-sm">This action cannot be undone. To confirm, type the organization name below and click Delete.</p>
                    <ThemeButton variant="destructive" onClick={() => setShowDelete(true)}>
                      Delete Organization
                    </ThemeButton>
                  </div>
                </TabsContent>
                <TabsContent value="numbering">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Application Number Settings</h2>
                    <label className="block mb-1">Prefix</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.applicant_no.prefix}
                      onChange={e => handleNumberingChange('applicant_no', 'prefix', e.target.value)}
                      placeholder="e.g. APP-"
                    />
                    <div className="text-xs text-muted-foreground mb-2">Prefix to appear before the application number (e.g. APP-2024-0001)</div>
                    <label className="block mb-1">Next Number</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      type="number"
                      value={numbering.applicant_no.next_number}
                      onChange={e => handleNumberingChange('applicant_no', 'next_number', Number(e.target.value))}
                      placeholder="e.g. 1"
                    />
                    <div className="text-xs text-muted-foreground mb-2">The next number to be used for a new applicant</div>
                    <label className="block mb-1">Format</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.applicant_no.format}
                      onChange={e => handleNumberingChange('applicant_no', 'format', e.target.value)}
                      placeholder="e.g. APP-{year}-{number:04d}"
                    />
                    <div className="text-xs text-muted-foreground mb-4">Format for the full application number. Use <code>{'{year}'}</code> for year and <code>{'{number:04d}'}</code> for zero-padded number.</div>
                    <ThemeButton onClick={() => handleNumberingSave('applicant_no')} disabled={applicantNoLoading} variant="primary">
                      {applicantNoLoading ? 'Saving...' : 'Save'}
                    </ThemeButton>
                  </div>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Student Number Settings</h2>
                    <label className="block mb-1">Prefix</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.student_no.prefix}
                      onChange={e => handleNumberingChange('student_no', 'prefix', e.target.value)}
                      placeholder="e.g. STU-"
                    />
                    <div className="text-xs text-muted-foreground mb-2">Prefix to appear before the student number (e.g. STU-2024-0001)</div>
                    <label className="block mb-1">Next Number</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      type="number"
                      value={numbering.student_no.next_number}
                      onChange={e => handleNumberingChange('student_no', 'next_number', Number(e.target.value))}
                      placeholder="e.g. 1"
                    />
                    <div className="text-xs text-muted-foreground mb-2">The next number to be used for a new student</div>
                    <label className="block mb-1">Format</label>
                    <input
                      className="border rounded p-2 w-full mb-2"
                      value={numbering.student_no.format}
                      onChange={e => handleNumberingChange('student_no', 'format', e.target.value)}
                      placeholder="e.g. STU-{year}-{number:04d}"
                    />
                    <div className="text-xs text-muted-foreground mb-4">Format for the full student number. Use <code>{'{year}'}</code> for year and <code>{'{number:04d}'}</code> for zero-padded number.</div>
                    <ThemeButton onClick={() => handleNumberingSave('student_no')} disabled={studentNoLoading} variant="primary">
                      {studentNoLoading ? 'Saving...' : 'Save'}
                    </ThemeButton>
                  </div>
                  {numberingError && <div className="text-destructive text-sm mt-2">{numberingError}</div>}
                </TabsContent>
                <TabsContent value="theme">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4">Organization Theme</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 font-medium">Primary Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={theme.primary_color}
                            onChange={e => handleThemeChange('primary_color', e.target.value)}
                            className="w-12 h-10 border rounded"
                          />
                          <input
                            type="text"
                            value={theme.primary_color}
                            onChange={e => handleThemeChange('primary_color', e.target.value)}
                            className="flex-1 border rounded p-2"
                            placeholder="#3b82f6"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Used for buttons and primary actions</div>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">Secondary Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={theme.secondary_color}
                            onChange={e => handleThemeChange('secondary_color', e.target.value)}
                            className="w-12 h-10 border rounded"
                          />
                          <input
                            type="text"
                            value={theme.secondary_color}
                            onChange={e => handleThemeChange('secondary_color', e.target.value)}
                            className="flex-1 border rounded p-2"
                            placeholder="#64748b"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Used for borders and secondary elements</div>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">Accent Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={theme.accent_color}
                            onChange={e => handleThemeChange('accent_color', e.target.value)}
                            className="w-12 h-10 border rounded"
                          />
                          <input
                            type="text"
                            value={theme.accent_color}
                            onChange={e => handleThemeChange('accent_color', e.target.value)}
                            className="flex-1 border rounded p-2"
                            placeholder="#f59e0b"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Used for success messages and highlights</div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <ThemeButton onClick={handleThemeSave} disabled={themeLoading} variant="primary">
                        {themeLoading ? 'Saving...' : 'Save Theme'}
                      </ThemeButton>
                      {themeError && <div className="text-destructive text-sm mt-2">{themeError}</div>}
                    </div>
                    <div className="mt-6 p-4 border rounded bg-muted">
                      <h3 className="font-medium mb-2">Preview</h3>
                      <div className="space-y-2">
                        <button 
                          className="px-4 py-2 rounded text-white"
                          style={{ backgroundColor: theme.primary_color }}
                        >
                          Primary Button
                        </button>
                        <div className="p-2 border rounded" style={{ borderColor: theme.secondary_color }}>
                          <span className="theme-text">Sample text with custom colors</span>
                        </div>
                        <div style={{ color: theme.accent_color }}>Success message preview</div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="documents">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Required/Accepted Documents</h2>
                    <ThemeButton className="mb-4" onClick={() => setShowAddDocType(true)} variant="primary">Add Document Type</ThemeButton>
                    {docTypesLoading ? (
                      <div>Loading...</div>
                    ) : docTypes.length === 0 ? (
                      <div className="text-muted-foreground mb-4">No document types configured yet.</div>
                    ) : (
                      <table className="w-full border mb-4">
                        <thead>
                          <tr>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Description</th>
                            <th className="text-left p-2">Required</th>
                            <th className="text-left p-2">Sort</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {docTypes.map(dt => (
                            <tr key={dt.id}>
                              <td className="p-2">{dt.name}</td>
                              <td className="p-2">{dt.description}</td>
                              <td className="p-2">{dt.required ? "Yes" : "No"}</td>
                              <td className="p-2">{dt.sort_order}</td>
                              <td className="p-2 flex gap-2">
                                <ThemeButton size="sm" variant="outline" onClick={() => { setEditingDocType(dt); setEditDocTypeValues({ name: dt.name, description: dt.description, required: dt.required, sort_order: dt.sort_order }); }}>Edit</ThemeButton>
                                <ThemeButton size="sm" variant="destructive" onClick={() => handleDeleteDocType(dt.id)}>Delete</ThemeButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {docTypeError && <div className="text-destructive text-sm mb-2">{docTypeError}</div>}
                    {/* Add Dialog */}
                    <Dialog open={showAddDocType} onOpenChange={setShowAddDocType}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Document Type</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddDocType} className="flex flex-col gap-4">
                          <input className="border rounded p-2" placeholder="Name" value={newDocType.name} onChange={e => setNewDocType({ ...newDocType, name: e.target.value })} required />
                          <input className="border rounded p-2" placeholder="Description" value={newDocType.description} onChange={e => setNewDocType({ ...newDocType, description: e.target.value })} />
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={newDocType.required} onChange={e => setNewDocType({ ...newDocType, required: e.target.checked })} /> Required
                          </label>
                          <input className="border rounded p-2" type="number" placeholder="Sort Order" value={newDocType.sort_order} onChange={e => setNewDocType({ ...newDocType, sort_order: Number(e.target.value) })} />
                          <DialogFooter>
                            <ThemeButton type="submit" variant="primary">Add</ThemeButton>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    {/* Edit Dialog */}
                    <Dialog open={!!editingDocType} onOpenChange={v => { if (!v) setEditingDocType(null); }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Document Type</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditDocType} className="flex flex-col gap-4">
                          <input className="border rounded p-2" placeholder="Name" value={editDocTypeValues.name} onChange={e => setEditDocTypeValues({ ...editDocTypeValues, name: e.target.value })} required />
                          <input className="border rounded p-2" placeholder="Description" value={editDocTypeValues.description} onChange={e => setEditDocTypeValues({ ...editDocTypeValues, description: e.target.value })} />
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={editDocTypeValues.required} onChange={e => setEditDocTypeValues({ ...editDocTypeValues, required: e.target.checked })} /> Required
                          </label>
                          <input className="border rounded p-2" type="number" placeholder="Sort Order" value={editDocTypeValues.sort_order} onChange={e => setEditDocTypeValues({ ...editDocTypeValues, sort_order: Number(e.target.value) })} />
                          <DialogFooter>
                            <ThemeButton type="submit" variant="primary">Save</ThemeButton>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Organization</DialogTitle>
              </DialogHeader>
              <div className="mb-2">Type <b>{org?.name}</b> to confirm deletion:</div>
              <input
                className="border rounded p-2 w-full mb-4"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Organization name"
              />
              {error && <div className="text-destructive text-sm mb-2">{error}</div>}
              <DialogFooter>
                <ThemeButton
                  variant="destructive"
                  disabled={deleteInput !== org?.name || loading}
                  onClick={handleDelete}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </ThemeButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 