"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import ProjectHeader from "@/components/projects/project-header";
import AdmissionWorkflow from "@/components/admission/admission-workflow";
import { SupabaseClient } from "@supabase/supabase-js";

export default function AdmissionPage() {
  const { projectId } = useParams() as { projectId: string };
  const supabase = useSupabase() as SupabaseClient;
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    async function fetchProject() {
      if (!projectId) return;
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      setProject(data);
      setOrgId(data?.organization_id || "");
    }
    fetchProject();
  }, [projectId, supabase]);

  return (
    <SidebarProvider>
      {orgId && <ProjectSidebar projectId={projectId} orgId={orgId} />}
      <SidebarInset>
        {project && <ProjectHeader project={project} />}
        <AdmissionWorkflow projectId={projectId} />
      </SidebarInset>
    </SidebarProvider>
  );
} 