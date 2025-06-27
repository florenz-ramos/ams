"use client";

import { Separator } from "@/components/ui/separator";
import ModeToggle from "@/components/mode-toggle";
import React from "react";
import { SidebarTrigger } from "./ui/sidebar";

export default function ProjectHeader({ project }: { project: { name?: string; description?: string | null } | null }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Optionally add a sidebar trigger here if needed */}
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold px-3">{project?.name || "Project"}</span>

        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button> */}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
