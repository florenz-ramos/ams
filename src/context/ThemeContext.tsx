'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useOrganization } from './OrganizationContext';
import { SupabaseClient } from '@supabase/supabase-js';

type OrganizationTheme = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color?: string;
};

type ThemeContextType = {
  theme: OrganizationTheme;
  loading: boolean;
  error: string | null;
  refreshTheme: () => Promise<void>;
};

const defaultTheme: OrganizationTheme = {
  primary_color: "#800020",
  secondary_color: "#D4AF37", 
  accent_color: "#FFD700",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  loading: false,
  error: null,
  refreshTheme: async () => {}
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const supabase = useSupabase() as SupabaseClient;
  const { organization } = useOrganization();
  const [theme, setTheme] = useState<OrganizationTheme>(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTheme = useCallback(async () => {
    if (!organization?.id) {
      console.log('No organization ID, using default theme');
      setTheme(defaultTheme);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching theme for organization:', organization.id);
      const { data, error: fetchError } = await supabase
        .from('organization_themes')
        .select('primary_color, secondary_color, accent_color')
        .eq('organization_id', organization.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching theme:', fetchError);
        setError(fetchError.message);
        setTheme(defaultTheme);
      } else if (data) {
        console.log('Theme fetched successfully:', data);
        setTheme({
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          accent_color: data.accent_color,
        });
      } else {
        console.log('No theme found, using default theme');
        setTheme(defaultTheme);
      }
    } catch (err) {
      console.error('Failed to fetch theme:', err);
      setError('Failed to fetch theme');
      setTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, supabase]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Apply theme to CSS custom properties
  useEffect(() => {
    console.log('Applying theme to CSS variables:', theme);
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary_color);
    root.style.setProperty('--theme-secondary', theme.secondary_color);
    root.style.setProperty('--theme-accent', theme.accent_color);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, loading, error, refreshTheme: fetchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 