"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrganization } from "@/context/OrganizationContext";
import { SupabaseClient } from '@supabase/supabase-js';

// Define interfaces for plan and billing history
interface Plan {
  id: number;
  name: string;
  display_name: string;
  price?: number;
  max_team_members?: number;
  max_students?: number;
  max_projects?: number;
}

interface BillingHistoryEntry {
  id: number;
  paid_at?: string;
  organization_plans?: { display_name?: string };
  amount?: number;
  status?: string;
}

export default function BillingPage() {
  const supabase = useSupabase() as SupabaseClient;
  const { organization: org, setOrganization } = useOrganization();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!org) return;
      setLoading(true);
      setError("");
      // Fetch all plans
      const { data: plansData } = await supabase
        .from("organization_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      setPlans(plansData || []);
      // Fetch current plan
      const plan = plansData?.find((p: Plan) => p.name === org.plan) || null;
      setCurrentPlan(plan);
      setBillingStatus(typeof org.billing_status === 'string' ? org.billing_status : null);
      // Fetch billing history
      const { data: historyData } = await supabase
        .from("organization_billing_history")
        .select("*, organization_plans(display_name)")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });
      setBillingHistory(historyData || []);
      setLoading(false);
    };
    fetchData();
  }, [supabase, org]);

  const handleChangePlan = async (plan: Plan) => {
    if (!org) return;
    setLoading(true);
    setError("");
    setSuccess("");
    // Update organizations.plan and organization_usage.plan_id
    const { error: orgError } = await supabase
      .from("organizations")
      .update({ plan: plan.name })
      .eq("id", org.id);
    const { error: usageError } = await supabase
      .from("organization_usage")
      .update({ plan_id: plan.id })
      .eq("organization_id", org.id);
    if (orgError || usageError) {
      setError(orgError?.message || usageError?.message || "Failed to change plan");
      setLoading(false);
      return;
    }
    setOrganization({ ...org, plan: plan.name });
    setCurrentPlan(plan);
    setSuccess("Plan changed to " + plan.display_name);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Billing & Plan</CardTitle>
          <CardDescription>Manage your organizations subscription plan and view billing history.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="text-destructive mb-2">{error}</div>}
          {success && <div className="text-green-600 mb-2">{success}</div>}
          <div className="mb-6">
            <div className="font-semibold">Current Plan:</div>
            <div>
              {currentPlan
                ? currentPlan.display_name
                : typeof org?.plan === "string" && org.plan
                  ? org.plan
                  : "-"}
            </div>
            <div className="text-sm text-muted-foreground">Billing Status: {billingStatus || "-"}</div>
          </div>
          <div className="mb-8">
            <div className="font-semibold mb-2">Available Plans</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Team Limit</TableHead>
                  <TableHead>Student Limit</TableHead>
                  <TableHead>Project Limit</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(plan => (
                  <TableRow key={plan.id} className={plan.name === org?.plan ? "bg-accent/30" : ""}>
                    <TableCell className="font-medium">{plan.display_name}</TableCell>
                    <TableCell>{plan.price ? `${Number(plan.price).toLocaleString()}` : "Free"}</TableCell>
                    <TableCell>{plan.max_team_members ?? '-'}</TableCell>
                    <TableCell>{plan.max_students ?? '-'}</TableCell>
                    <TableCell>{plan.max_projects ?? '-'}</TableCell>
                    <TableCell>
                      {plan.name === org?.plan ? (
                        <span className="text-green-600 font-semibold">Current</span>
                      ) : (
                        <Button size="sm" onClick={() => handleChangePlan(plan)} disabled={loading}>
                          {loading ? "Processing..." : "Select"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <div className="font-semibold mb-2">Billing History</div>
            {billingHistory.length === 0 ? (
              <div className="text-muted-foreground text-sm">No billing history yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.paid_at ? new Date(entry.paid_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{entry.organization_plans?.display_name || '-'}</TableCell>
                      <TableCell>{entry.amount ? `₱${Number(entry.amount).toLocaleString()}` : '-'}</TableCell>
                      <TableCell>{entry.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 