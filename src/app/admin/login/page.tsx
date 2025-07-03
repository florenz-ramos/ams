'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabase } from '@/hooks/use-supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';

export default function AdminLoginPage() {
  const supabase = useSupabase() as SupabaseClient;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Fetch user by email
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (fetchError || !user) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }
    // Check if user is admin or super-admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      setError('You do not have admin access.');
      setLoading(false);
      return;
    }
    // Compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }
    // Store admin session (encrypted)
    const adminObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const secret = 'admin-localstorage-secret'; // You may want to move this to an env var
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(adminObj), secret).toString();
    localStorage.setItem('admin', encrypted);
    setLoading(false);
    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription>
              Access the admin dashboard to manage subscriptions and system settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login as Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 