"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type CollegeCampus = { id: string; cc_code: string; cc_name: string; organization_id: string };

export default function CollegesCampusesSection({ orgId }: { orgId: string }) {
  const supabase = useSupabase() as SupabaseClient;
  const [colleges, setColleges] = useState<CollegeCampus[]>([]);
  const [ccCode, setCcCode] = useState("");
  const [ccName, setCcName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchColleges = async () => {
      const { data } = await supabase
        .from("colleges_campuses")
        .select("*")
        .eq("organization_id", orgId);
      setColleges(data || []);
    };
    fetchColleges();
  }, [supabase, orgId]);

  useEffect(() => {
    // Get user from localStorage
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    if (user && user.id && orgId) {
      const fetchRole = async () => {
        setRoleLoading(true);
        const { data: member } = await supabase
          .from('organization_team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single();
        setUserRole(member?.role || '');
        setRoleLoading(false);
      };
      fetchRole();
    } else {
      setUserRole('');
      setRoleLoading(false);
    }
  }, [supabase, orgId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'faculty') {
      setError('Faculty are not allowed to add colleges/campuses.');
      return;
    }
    setLoading(true);
    setError("");
    await supabase.from("colleges_campuses").insert([
      { cc_code: ccCode, cc_name: ccName, organization_id: orgId },
    ]);
    setCcCode("");
    setCcName("");
    setLoading(false);
    setShowAdd(false);
    setError("");
    // Refresh list
    const { data } = await supabase
      .from("colleges_campuses")
      .select("*")
      .eq("organization_id", orgId);
    setColleges(data || []);
  };

  return (
    <Card className="mt-4 w-full">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Colleges/Campuses for this Organization</h2>
        {roleLoading ? null : userRole !== 'faculty' && (
          <Button className="mb-4" onClick={() => setShowAdd(true)}>
            Add College/Campus
          </Button>
        )}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add College/Campus</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { if (userRole === 'faculty') { e.preventDefault(); return; } else { handleAdd(e); } }} className="flex flex-col gap-4">
              <Input
                placeholder="Code"
                value={ccCode}
                onChange={e => setCcCode(e.target.value)}
                required
                disabled={loading || userRole === 'faculty'}
              />
              <Input
                placeholder="Name"
                value={ccName}
                onChange={e => setCcName(e.target.value)}
                required
                disabled={loading || userRole === 'faculty'}
              />
              {userRole === 'faculty' && (
                <div className="text-destructive text-sm">Faculty are not allowed to add colleges/campuses.</div>
              )}
              {error && <div className="text-destructive text-sm">{error}</div>}
              <DialogFooter>
                <Button type="submit" disabled={loading || userRole === 'faculty'}>
                  {loading ? 'Adding...' : 'Add'}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowAdd(false)} disabled={loading}>
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colleges.map(college => (
              <TableRow key={college.id}>
                <TableCell>{college.cc_code}</TableCell>
                <TableCell>{college.cc_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 