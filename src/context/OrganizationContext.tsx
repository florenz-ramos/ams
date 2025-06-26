import React, { createContext, useContext, useState, useEffect } from "react";

export type Organization = { id: string; name: string; [key: string]: unknown };

type OrgContextType = {
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;
};

const OrganizationContext = createContext<OrgContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Restore org from localStorage on mount
  useEffect(() => {
    if (!organization) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedOrg') : null;
      if (stored) setOrganization(JSON.parse(stored));
    }
  }, [organization]);

  // Save org to localStorage whenever it changes
  useEffect(() => {
    if (organization) {
      localStorage.setItem('selectedOrg', JSON.stringify(organization));
    }
  }, [organization]);

  return (
    <OrganizationContext.Provider value={{ organization, setOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
} 