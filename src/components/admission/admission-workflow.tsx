import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import AdmissionDocuments from "./admission-documents";
import AdmissionInterview from "./admission-interview";
import AdmissionAssignment from "./admission-assignment";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";


export default function AdmissionWorkflow({ projectId }: { projectId: string }) {
  const supabase = useSupabase() as SupabaseClient;
  const [selectedApplicant, setSelectedApplicant] = useState<Record<string, unknown> | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [applicants, setApplicants] = useState<Record<string, unknown>[]>([]);
  const [hasApprovedDoc, setHasApprovedDoc] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      if (!projectId) return;
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      setOrgId(data?.organization_id || "");
    }
    fetchProject();
  }, [projectId, supabase]);

  useEffect(() => {
    if (!orgId || !search) {
      setApplicants([]);
      return;
    }
    const fetchApplicants = async () => {
      const { data } = await supabase
        .from("organization_students")
        .select("*")
        .eq("organization_id", orgId)
        .or(`firstname.ilike.%${search}%,lastname.ilike.%${search}%,applicant_no.ilike.%${search}%`);
      setApplicants(data || []);
    };
    fetchApplicants();
  }, [orgId, search, supabase]);

  return (
    <div className="p-4">
      {!selectedApplicant && (
        <>
          <Input
            placeholder="Search applicant by name or application number"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-4"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant No</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map(applicant => (
                <TableRow key={String(applicant.id)}>
                  <TableCell>{String(applicant.applicant_no)}</TableCell>
                  <TableCell>{[applicant.lastname, applicant.firstname, applicant.middlename].filter(Boolean).join(', ')}</TableCell>
                  <TableCell>
                    <Button onClick={() => setSelectedApplicant(applicant)}>
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      {selectedApplicant && (
        <div className="mt-6 p-4 border rounded">
          <div>Selected Applicant: <b>{[String(selectedApplicant.lastname), String(selectedApplicant.firstname), String(selectedApplicant.middlename)].filter(Boolean).join(', ')}</b> ({String(selectedApplicant.applicant_no)})</div>
          <Tabs defaultValue="documents" className="mt-4">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              {hasApprovedDoc && (
                <>
                  <TabsTrigger value="interview">Interview</TabsTrigger>
                  <TabsTrigger value="assignment">Assignment</TabsTrigger>
                </>
              )}
            </TabsList>
            <TabsContent value="documents">
              <AdmissionDocuments selectedApplicant={selectedApplicant} onApprovalStatusChange={setHasApprovedDoc} />
            </TabsContent>
            {hasApprovedDoc && [
              <TabsContent value="interview" key="interview">
                <AdmissionInterview selectedApplicant={selectedApplicant} />
              </TabsContent>,
              <TabsContent value="assignment" key="assignment">
                <AdmissionAssignment selectedApplicant={selectedApplicant} orgId={orgId} onApplicantUpdate={setSelectedApplicant} />
              </TabsContent>
            ]}
          </Tabs>
        </div>
      )}
    </div>
  );
} 