'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from '@supabase/supabase-js';
import { useMemo, useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { SupabaseContext } from '@/hooks/use-supabase';
import { OrganizationProvider } from '@/context/OrganizationContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = useMemo(() => createClient(supabaseUrl, supabaseAnonKey), []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning
       >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem >
          <SupabaseContext.Provider value={supabase}>
            <OrganizationProvider>
              {mounted ? children : null}
            </OrganizationProvider>
          </SupabaseContext.Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
