'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeaderAdmin } from "@/components/admin/site-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type Organization = {
  id: string;
  name: string;
  plan: string | null;
  owner: string;
  type: string | null;
};

type OrganizationUsage = {
  organization_id: string;
  current_team_members: number;
  current_students: number;
  current_projects: number;
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
};

export default function AdminDashboardPage() {
  const supabase = useSupabase() as SupabaseClient;
  const [organizations, setOrganizations] = useState<(
    Organization & {
      members: number;
      students: number;
      projects: number;
    }
  )[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState("");
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [owners, setOwners] = useState<Record<string, string>>({}); // org ownerId -> owner name

  useEffect(() => {
    const fetchOrganizations = async () => {
      setOrgsLoading(true);
      setOrgsError("");
      // Fetch organizations and their usage
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, plan, owner, type');
      if (orgsError) {
        setOrgsError(orgsError.message);
        setOrgsLoading(false);
        return;
      }
      // Fetch usage for all organizations
      const { data: usage, error: usageError } = await supabase
        .from('organization_usage')
        .select('organization_id, current_team_members, current_students, current_projects');
      if (usageError) {
        setOrgsError(usageError.message);
        setOrgsLoading(false);
        return;
      }
      // Fetch all unique owner IDs
      const ownerIds = Array.from(new Set((orgs as Organization[]).map(org => org.owner).filter(Boolean)));
      const ownersMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', ownerIds);
        if (usersData) {
          (usersData as User[]).forEach(user => {
            ownersMap[user.id] = user.name || user.email || user.id;
          });
        }
      }
      setOwners(ownersMap);
      // Merge orgs and usage
      const orgsWithUsage = (orgs as Organization[]).map(org => {
        const u = (usage as OrganizationUsage[]).find(x => x.organization_id === org.id);
        return {
          ...org,
          members: u?.current_team_members || 0,
          students: u?.current_students || 0,
          projects: u?.current_projects || 0,
        };
      });
      setOrganizations(orgsWithUsage);
      setOrgsLoading(false);
    };
    fetchOrganizations();
  }, [supabase]);

  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      setPlansError("");
      const { data, error } = await supabase
        .from('organization_plans')
        .select('id, name, display_name, description, price, currency')
        .eq('is_active', true)
        .order('display_name', { ascending: true });
      if (error) {
        setPlansError(error.message);
        setPlansLoading(false);
        return;
      }
      setSubscriptionPlans(data || []);
      setPlansLoading(false);
    };
    fetchPlans();
  }, [supabase]);

  // Calculate overview stats from organizations and subscriptionPlans
  const totalOrganizations = organizations.length;
  const freePlanUsers = organizations.filter(org => org.plan === 'free').length;
  const proPlanUsers = organizations.filter(org => org.plan === 'pro').length;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <SiteHeaderAdmin />
        {/* Main Content */}
        <main className="flex flex-col items-center gap-8 p-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Organizations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalOrganizations}</div>
                    <p className="text-sm text-gray-600">Active organizations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Free Plan Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{freePlanUsers}</div>
                    <p className="text-sm text-gray-600">On free subscription</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pro Plan Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{proPlanUsers}</div>
                    <p className="text-sm text-gray-600">On pro subscription</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system activities and changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">New organization registered</p>
                        <p className="text-sm text-gray-600">ABC University joined the platform</p>
                      </div>
                      <span className="text-sm text-gray-500">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Plan upgrade</p>
                        <p className="text-sm text-gray-600">XYZ College upgraded to Pro plan</p>
                      </div>
                      <span className="text-sm text-gray-500">1 day ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Plans Tab */}
            <TabsContent value="subscriptions" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Subscription Plans</CardTitle>
                      <CardDescription>Manage available subscription plans and their limits</CardDescription>
                    </div>
                    <Button>Add New Plan</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {plansLoading ? (
                    <div className="text-center py-8">Loading plans...</div>
                  ) : plansError ? (
                    <div className="text-destructive text-center py-8">{plansError}</div>
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptionPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.display_name}</TableCell>
                          <TableCell>{plan.price ? `₱${Number(plan.price).toLocaleString()}` : 'Free'}</TableCell>
                          <TableCell>{plan.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">Edit</Button>
                              <Button size="sm" variant="destructive">Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>View and manage all organizations</CardDescription>
                </CardHeader>
                <CardContent>
                  {orgsLoading ? (
                    <div className="text-center py-8">Loading organizations...</div>
                  ) : orgsError ? (
                    <div className="text-destructive text-center py-8">{orgsError}</div>
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>{org.type || '-'}</TableCell>
                          <TableCell>{owners[org.owner] || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={org.plan === 'free' ? 'secondary' : 'default'}>
                              {org.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{org.members}</TableCell>
                          <TableCell>{org.students}</TableCell>
                          <TableCell>{org.projects}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">View</Button>
                              <Button size="sm" variant="outline">Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure global system settings and defaults</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Default Limits</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Default Team Members</label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded-md"
                            defaultValue={10}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Default Students</label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded-md"
                            defaultValue={10}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Default Projects</label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded-md"
                            defaultValue={1}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">Allowed Project Types</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="mr-2" />
                          Admission
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Attendance
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Enrollment
                        </label>
                      </div>
                    </div>

                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>

    // <div className="min-h-screen bg-gray-50">
    //   {/* Header */}
    //   <header className="bg-white shadow-sm border-b">
    //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    //       <div className="flex justify-between items-center py-4">
    //         <div>
    //           <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    //           <p className="text-gray-600">Manage subscriptions and system settings</p>
    //         </div>
    //         <Button variant="outline">Logout</Button>
    //       </div>
    //     </div>
    //   </header>


    // </div>
  );
} 